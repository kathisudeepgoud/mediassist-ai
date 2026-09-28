"""
Hybrid Intelligent Medical & Lab Report Extraction Engine

Self-contained Architecture:
1. OCR Engine: PyMuPDF (fitz) / pypdf / pdfplumber for digital PDFs, OpenCV + PIL for images/scanned PDFs
2. Layout & Table Parser: Zoning (Header/Footer vs Body) and 2D line grid extraction
3. Spatial Coordinate Matcher: Bounding box coordinate & regex alignment for test parameters
4. Semantic & Fuzzy Matcher: Synonym dictionary + RapidFuzz + SentenceTransformers (all-MiniLM-L6-v2)
5. Multi-Factor Confidence Scorer & Validator: Weighted confidence (OCR, Semantic, Spatial, Format)
6. Natural Language Explanations: Backend LLM service for patient-friendly parameter explanations
"""

import io
import os
import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional, Union

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# --- Graceful Imports ---
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

try:
    import cv2
    import numpy as np
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

try:
    from rapidfuzz import fuzz, process
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False

try:
    from sentence_transformers import SentenceTransformer, util
    import torch
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

# Global model cache
_SENTENCE_TRANSFORMER_MODEL = None
_SEMANTIC_MATCHER_INSTANCE = None

DEFAULT_MEDICAL_DICT = {
    "hemoglobin": {
        "canonical_name": "Hemoglobin",
        "standard_name": "hemoglobin",
        "category": "Hematology",
        "synonyms": ["hb", "hgb", "hemoglobin", "hemoglobin total", "haemoglobin"],
        "default_unit": "g/dL",
        "default_range": "12.0 - 17.5"
    },
    "wbc_count": {
        "canonical_name": "White Blood Cell Count",
        "standard_name": "wbc_count",
        "category": "Hematology",
        "synonyms": ["wbc", "white blood cells", "total wbc", "tlc", "total leucocyte count", "white blood cell count"],
        "default_unit": "cells/cumm",
        "default_range": "4000 - 11000"
    },
    "rbc_count": {
        "canonical_name": "Red Blood Cell Count",
        "standard_name": "rbc_count",
        "category": "Hematology",
        "synonyms": ["rbc", "red blood cells", "total rbc", "red blood cell count", "erythrocytes"],
        "default_unit": "mill/cumm",
        "default_range": "4.5 - 5.9"
    },
    "platelet_count": {
        "canonical_name": "Platelet Count",
        "standard_name": "platelet_count",
        "category": "Hematology",
        "synonyms": ["platelets", "platelet count", "plt", "total platelets"],
        "default_unit": "lakhs/cumm",
        "default_range": "1.5 - 4.5"
    },
    "glucose_fasting": {
        "canonical_name": "Fasting Blood Glucose",
        "standard_name": "glucose_fasting",
        "category": "Biochemistry",
        "synonyms": ["fasting glucose", "fasting blood sugar", "fbs", "glucose fasting", "blood sugar fasting"],
        "default_unit": "mg/dL",
        "default_range": "70 - 99"
    },
    "serum_creatinine": {
        "canonical_name": "Serum Creatinine",
        "standard_name": "serum_creatinine",
        "category": "Kidney Function",
        "synonyms": ["creatinine", "serum creatinine", "creat"],
        "default_unit": "mg/dL",
        "default_range": "0.6 - 1.2"
    },
    "blood_urea": {
        "canonical_name": "Blood Urea Nitrogen",
        "standard_name": "blood_urea",
        "category": "Kidney Function",
        "synonyms": ["urea", "blood urea", "bun", "blood urea nitrogen"],
        "default_unit": "mg/dL",
        "default_range": "7 - 20"
    },
    "cholesterol_total": {
        "canonical_name": "Total Cholesterol",
        "standard_name": "cholesterol_total",
        "category": "Lipid Profile",
        "synonyms": ["cholesterol", "total cholesterol", "serum cholesterol"],
        "default_unit": "mg/dL",
        "default_range": "< 200"
    },
    "lymphocytes": {
        "canonical_name": "Lymphocytes",
        "standard_name": "lymphocytes",
        "category": "Hematology",
        "synonyms": ["lymphocytes", "lymphocyte count", "lymph"],
        "default_unit": "%",
        "default_range": "20 - 40"
    },
    "neutrophils": {
        "canonical_name": "Neutrophils",
        "standard_name": "neutrophils",
        "category": "Hematology",
        "synonyms": ["neutrophils", "neutrophil count", "neut"],
        "default_unit": "%",
        "default_range": "40 - 70"
    }
}

KNOWN_UNITS = {
    'g/dl', 'mg/dl', 'mg/l', '%', 'fl', 'pg', 'cumm', '/cumm', 'mill/cumm', 'million/cumm',
    'lakhs/cumm', 'u/l', 'iu/l', 'ng/ml', 'pg/ml', 'k/ul', 'mm/hr', 'meq/l', 'mmol/l',
    'uiu/ml', 'ug/dl', 'ng/dl', 'mmhg', 'gm%', 'cells/cumm', 'bpf', 'hpf', 'units', 'u/ml'
}

KNOWN_FLAGS = {'high', 'low', 'abnormal', 'borderline', 'normal', 'h', 'l', '*'}


# ================================================================================
# 1. OCR ENGINE & PREPROCESSING
# ================================================================================
class OCREngine:
    @staticmethod
    def preprocess_image(file_bytes: bytes) -> Optional[Any]:
        """Applies OpenCV grayscale, deskewing, denoising, and adaptive thresholding."""
        if not HAS_OPENCV:
            return None
        try:
            nparr = np.frombuffer(file_bytes, np.uint8)
            img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_np is None:
                return None
            gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)

            coords = np.column_stack(np.where(gray < 240))
            if coords.size > 0:
                angle = cv2.minAreaRect(coords)[-1]
                if angle < -45:
                    angle = -(90 + angle)
                else:
                    angle = -angle
                if 0.5 < abs(angle) < 45:
                    (h, w) = gray.shape[:2]
                    M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
                    gray = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

            denoised = cv2.medianBlur(gray, 3)
            return cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        except Exception as e:
            logger.warning(f"OpenCV Preprocessing exception: {e}")
            return None

    @staticmethod
    def extract_digital_words(file_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Extracts word items with bounding box coordinates and reconstructs 2D horizontal lines."""
        words: List[Dict[str, Any]] = []
        lines: List[str] = []

        if HAS_PYMUPDF:
            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                lines_by_page: List[str] = []

                for page_idx, page in enumerate(doc):
                    page_words = page.get_text("words")
                    lines_dict: Dict[float, List[Tuple[float, str]]] = {}

                    for w in page_words:
                        x0, y0, x1, y1, word = w[0], w[1], w[2], w[3], w[4]
                        words.append({
                            "text": word,
                            "bbox": [x0, y0, x1 - x0, y1 - y0],
                            "page": page_idx + 1,
                            "confidence": 0.98
                        })

                        # Group by vertical position y0 within 4.0px tolerance
                        matched_y = None
                        for y in lines_dict:
                            if abs(y - y0) <= 4.0:
                                matched_y = y
                                break
                        if matched_y is None:
                            matched_y = y0
                            lines_dict[matched_y] = []
                        lines_dict[matched_y].append((x0, word))

                    # Reconstruct horizontal lines by sorting words left-to-right
                    for y in sorted(lines_dict.keys()):
                        line_words = sorted(lines_dict[y], key=lambda item: item[0])
                        line_str = " ".join(item[1] for item in line_words).strip()
                        if line_str:
                            lines_by_page.append(line_str)

                    # Fallback to standard block text if 2D grouping produced no lines
                    if not lines_by_page:
                        p_text = page.get_text("text")
                        for line in p_text.splitlines():
                            if line.strip():
                                lines_by_page.append(line.strip())

                if lines_by_page:
                    lines.extend(lines_by_page)
                    return words, lines
            except Exception as e:
                logger.warning(f"PyMuPDF extraction failed: {e}")

        if HAS_PYPDF and not lines:
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages:
                    txt = page.extract_text() or ""
                    for line in txt.splitlines():
                        if line.strip():
                            lines.append(line.strip())
            except Exception as e:
                logger.warning(f"pypdf extraction failed: {e}")

        # Image OCR (Pillow / pytesseract fallback for PNG, JPG, scanned PDFs)
        if not lines:
            try:
                from PIL import Image
                import pytesseract
                img = Image.open(io.BytesIO(file_bytes))
                ocr_text = pytesseract.image_to_string(img)
                for line in ocr_text.splitlines():
                    clean_l = line.strip()
                    if clean_l and len(clean_l) > 3:
                        lines.append(clean_l)
            except Exception as e:
                logger.warning(f"Image OCR extraction fallback: {e}")

        # Fallback text extraction for raw text or uncompressed PDF buffers
        if not lines:
            try:
                raw_text = file_bytes.decode('utf-8', errors='ignore')
                for line in raw_text.splitlines():
                    clean_l = line.strip()
                    if clean_l and not clean_l.startswith('%PDF') and len(clean_l) > 3:
                        lines.append(clean_l)
            except Exception:
                pass

        return words, lines



# ================================================================================
# 2. DOCUMENT LAYOUT & ZONING
# ================================================================================
class DocumentLayout:
    def __init__(self, words: List[Dict[str, Any]], lines: List[str]):
        self.words = words
        self.lines = lines
        self.header_lines: List[str] = lines[:15] if len(lines) >= 15 else lines
        self.body_lines: List[str] = lines[10:-5] if len(lines) > 20 else lines
        self.footer_lines: List[str] = lines[-10:] if len(lines) >= 10 else []


# ================================================================================
# 3. HEADER & METADATA REGEX PARSER
from services.clinical_ontology import (
    CLINICAL_ONTOLOGY,
    find_canonical_key_by_exact_synonym,
    get_ontology_definition,
    is_unit_compatible,
    get_all_synonym_list
)
from services.candidate_classifier import CandidateClassifier, CandidateCategory

# ================================================================================
# 3. METADATA REGEX PARSER
# ================================================================================
def extract_metadata(lines: List[str]) -> Dict[str, Optional[str]]:
    """Extracts header & footer patient and report metadata using regular expressions."""
    combined_text = "\n".join(lines)
    metadata: Dict[str, Optional[str]] = {
        "patient_name": None,
        "patient_id": None,
        "sample_id": None,
        "age": None,
        "sex": None,
        "hospital_name": None,
        "doctor_name": None,
        "report_date": None,
        "collection_date": None,
        "report_id": None
    }

    # 1. Patient Name
    name_match = re.search(r'(?:Patient\s*(?:Name)?|Pt\s*Name|Name)\s*[:\-]?\s*([A-Za-z\s\.]+)(?=\s*(?:Age|Sex|Reg|Date|MRN|PID|\n|$))', combined_text, re.IGNORECASE)
    if name_match:
        val = re.sub(r'\s+', ' ', name_match.group(1).strip())
        if len(val) >= 2 and val.lower() not in ['age', 'sex', 'gender', 'male', 'female', 'date', 'report', 'lab']:
            metadata["patient_name"] = val.title()

    if not metadata["patient_name"]:
        implicit_name = re.search(r'(?:Mr\.|Ms\.|Mrs\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+', combined_text)
        if implicit_name:
            metadata["patient_name"] = implicit_name.group(0).strip()

    # 2. Patient ID / MRN
    id_match = re.search(r'(?:Reg\.\s*no|Patient\s*id|PID|MRN|UHID|Lab\s*No)\s*[:\.]?\s*([A-Za-z0-9\-\/]+)', combined_text, re.IGNORECASE)
    if id_match:
        metadata["patient_id"] = id_match.group(1).strip()

    # 3. Sample ID / Accession No
    sample_match = re.search(r'(?:Sample\s*(?:id|no|#|\.)?|Specimen\s*(?:id|no)?|Accession\s*(?:no|id)?|Barcode)\s*[:\.]?\s*([A-Za-z0-9\-\/]+)', combined_text, re.IGNORECASE)
    if sample_match:
        metadata["sample_id"] = sample_match.group(1).strip()

    # 4. Age & Sex
    age_match = re.search(r'Age\s*[:\-]?\s*(\d{1,3})\s*(?:YRS|Years|Y)?', combined_text, re.IGNORECASE)
    if age_match:
        metadata["age"] = age_match.group(1).strip()

    sex_match = re.search(r'(?:Sex|Gender)\s*[:\-]?\s*(Male|Female|M|F|Other)', combined_text, re.IGNORECASE)
    if sex_match:
        s_val = sex_match.group(1).strip().upper()
        metadata["sex"] = "Male" if s_val in ['M', 'MALE'] else ("Female" if s_val in ['F', 'FEMALE'] else s_val.capitalize())

    # 5. Doctor Name
    doc_match = re.search(r'(?:Ref\.\s*By|Referred\s*by|Doctor)\s*[:\-]?\s*(Dr\.\s*[A-Za-z\s\.]+|[A-Za-z\s\.]+)', combined_text, re.IGNORECASE)
    if doc_match:
        raw_doc = doc_match.group(1).strip().split('\n')[0]
        if len(raw_doc) > 2 and raw_doc.lower() != 'self':
            metadata["doctor_name"] = raw_doc if raw_doc.lower().startswith('dr') else f"Dr. {raw_doc}"

    # 6. Hospital / Lab Name
    for line in lines[:15]:
        hosp_match = re.search(r'([A-Z][A-Za-z0-9\s\&,\.]{3,45}(?:Pathology|Laboratory|Lab|Hospital|Clinic|Diagnostics))', line, re.IGNORECASE)
        if hosp_match:
            metadata["hospital_name"] = hosp_match.group(1).strip().title()
            break

    # 7. Report Date
    rdate_match = re.search(r'(?:Reported\s*on|Report\s*Date|Date|Generated\s*on)\s*[:\-]?\s*([\d{1,2}\s+[A-Za-z]{3,9}[\s,]+[\d\w]{2,4}|\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4})', combined_text, re.IGNORECASE)
    if rdate_match:
        metadata["report_date"] = rdate_match.group(1).strip()

    return metadata


# ================================================================================
# 4. SPATIAL CANDIDATE EXTRACTION & MATCHING
# ================================================================================
class ExtractedCandidate:
    def __init__(self, raw_name: str, value: str, unit: str = "", reference_range: str = "", flag: str = ""):
        self.raw_name = raw_name.strip()
        self.value = value.strip()
        self.unit = unit.strip()
        self.reference_range = reference_range.strip()
        self.flag = flag.strip()
        self.ocr_confidence = 0.95
        self.spatial_confidence = 0.90


class SpatialMatcher:
    @staticmethod
    def extract_candidates_from_lines(lines: List[str]) -> List[ExtractedCandidate]:
        """Extracts candidate rows from text lines using dual-layout Regex pattern matching."""
        candidates: List[ExtractedCandidate] = []

        # Layout A: [Name] [Value] [Unit] [Range] [Flag]
        # e.g., "HEMOGLOBIN 15 g/dl 13 - 17"
        patternA = re.compile(
            r'^\s*([A-Za-z][A-Za-z0-9\s\(\)\-\/\.\,\_\%\[\]]{1,45}?)\s+'
            r'(?:([HL]|High|Low|Borderline|Abnormal|Normal)\s+)?'
            r'((?:<=|>=|<|>|=)?\s*-?\d[\d,\.]*|\b(?:positive|negative|normal|reactive|abnormal|trace|nil)\b)\s+'
            r'([a-zA-Z\%\/\_\^\d]+(?:\/[a-zA-Z\d]+)?)\s+'
            r'((?:<=|>=|<|>|=)?\s*[\d,\.]+\s*[\-\–\:]\s*[\d,\.]+|[<>=]\s*[\d,\.]+|\([\d,\.]+\s*[\-\–\:]\s*[\d,\.]+\))'
            r'(?:\s+(high|low|normal|abnormal|borderline|h|l|\*))?'
            r'\s*$',
            re.IGNORECASE
        )

        # Layout B: [Name] [Value] [Flag] [Range] [Unit]
        # e.g., "Hemoglobin (Hb) 12.5 Low 13.0 - 17.0 g/dL" or "Neutrophils 60 50 - 62 %"
        patternB = re.compile(
            r'^\s*([A-Za-z][A-Za-z0-9\s\(\)\-\/\.\,\_\%\[\]]{1,45}?)\s+'
            r'((?:<=|>=|<|>|=)?\s*-?\d[\d,\.]*|\b(?:positive|negative|normal|reactive|abnormal|trace|nil)\b)\s+'
            r'(?:(high|low|normal|abnormal|borderline|h|l|\*)\s+)?'
            r'((?:<=|>=|<|>|=)?\s*[\d,\.]+\s*[\-\–\:]\s*[\d,\.]+|[<>=]\s*[\d,\.]+|\([\d,\.]+\s*[\-\–\:]\s*[\d,\.]+\))\s+'
            r'([a-zA-Z\%\/\_\^\d]+(?:\/[a-zA-Z\d]+)?)\s*$',
            re.IGNORECASE
        )

        # General Fallback Pattern
        patternGeneral = re.compile(
            r'^\s*([A-Za-z][A-Za-z0-9\s\(\)\-\/\.\,\_\%\[\]]{1,55}?)\s+'
            r'(?:([HL]|High|Low)\s+)?'
            r'((?:<=|>=|<|>|=)?\s*-?\d[\d,\.]*|\b(?:positive|negative|normal|reactive|abnormal|trace|nil)\b)'
            r'(?:\s+([a-zA-Z\%\/\_\^\d]+(?:\/[a-zA-Z\d]+)?))?'
            r'(?:\s+((?:<=|>=|<|>|=)?\s*[\d,\.]+\s*[\-\–\:]\s*[\d,\.]+|[<>=]\s*[\d,\.]+|\([\d,\.]+\s*[\-\–\:]\s*[\d,\.]+\)))?'
            r'(?:\s+(high|low|normal|abnormal|borderline|h|l|\*))?'
            r'\s*$',
            re.IGNORECASE
        )

        for line in lines:
            line_str = line.strip()
            if not line_str or len(line_str) < 4:
                continue

            # Skip obvious full-line address or administrative text
            if re.search(r'road|mumbai|delhi|bangalore|iso\s*certified|nabl|accredited|end\s*of\s*report|page\s*\d+\s*of\s*\d+', line_str, re.I):
                continue

            mA = patternA.match(line_str)
            if mA:
                raw_name, flag1, val, unit, ref, flag2 = mA.groups()
                flag = flag1 or flag2 or ""
                if raw_name and val:
                    clean_name = re.sub(r'^\d+[\.\)]\s*', '', raw_name.strip())
                    candidates.append(ExtractedCandidate(
                        raw_name=clean_name,
                        value=val.strip(),
                        unit=unit.strip() if unit else "",
                        reference_range=ref.strip() if ref else "",
                        flag=flag.strip() if flag else ""
                    ))
                continue

            mB = patternB.match(line_str)
            if mB:
                raw_name, val, flag, ref, unit = mB.groups()
                if raw_name and val:
                    clean_name = re.sub(r'^\d+[\.\)]\s*', '', raw_name.strip())
                    candidates.append(ExtractedCandidate(
                        raw_name=clean_name,
                        value=val.strip(),
                        unit=unit.strip() if unit else "",
                        reference_range=ref.strip() if ref else "",
                        flag=flag.strip() if flag else ""
                    ))
                continue

            mGen = patternGeneral.match(line_str)
            if mGen:
                raw_name, flag1, val, unit, ref, flag2 = mGen.groups()
                flag = flag1 or flag2 or ""
                if raw_name and val:
                    clean_name = re.sub(r'^\d+[\.\)]\s*', '', raw_name.strip())
                    candidates.append(ExtractedCandidate(
                        raw_name=clean_name,
                        value=val.strip(),
                        unit=unit.strip() if unit else "",
                        reference_range=ref.strip() if ref else "",
                        flag=flag.strip() if flag else ""
                    ))
                continue

            # Fallback inline colon match: "Blood Sugar Fasting: 105.0 mg/dL" or "Sample Id: 262590091"
            colon_match = re.search(r'^\s*([A-Za-z0-9\s\(\)\-\/\_]{2,45})\s*[:\-]\s*((?:<=|>=|<|>|=)?\s*-?\d[\d,\.]*|\b(?:positive|negative|normal|reactive)\b)\s*([a-zA-Z\%\/\_]+)?', line_str, re.I)
            if colon_match:
                c_name, c_val, c_unit = colon_match.groups()
                if c_name and c_val:
                    candidates.append(ExtractedCandidate(
                        raw_name=c_name.strip(),
                        value=c_val.strip(),
                        unit=c_unit.strip() if c_unit else ""
                    ))

        return candidates


# ================================================================================
# 5. MULTI-FACTOR CONFIDENCE SCORING & STRICT CLINICAL VALIDATION
# ================================================================================
class ConfidenceValidator:
    @staticmethod
    def process_and_validate(
        candidates: List[ExtractedCandidate],
        metadata: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
        """
        Classifies all extracted candidates using the Clinical Parameter Ontology.
        Only candidates categorized as CLINICAL_MEASUREMENT or VITAL_SIGN are returned
        as validated clinical parameters. All others are cleanly separated.
        """
        validated_parameters: List[Dict[str, Any]] = []
        unclassified_candidates: List[Dict[str, Any]] = []
        warnings: List[str] = []
        seen_canonicals = set()

        for c in candidates:
            # 1. Run Semantic Candidate Classification
            classified = CandidateClassifier.classify_candidate(
                raw_label=c.raw_name,
                value=c.value,
                unit=c.unit,
                reference_range=c.reference_range
            )

            # 2. Check if this is a report or patient identifier to supplement metadata
            if classified["category"] == CandidateCategory.REPORT_IDENTIFIER:
                if not metadata.get("sample_id") and re.search(r'sample|specimen|accession|barcode', c.raw_name, re.I):
                    metadata["sample_id"] = c.value

            if classified["category"] == CandidateCategory.PATIENT_IDENTIFIER:
                if not metadata.get("patient_id") and re.search(r'patient|uhid|mrn|pid', c.raw_name, re.I):
                    metadata["patient_id"] = c.value

            # 3. Reject non-clinical candidates from clinical_parameters
            if not classified["is_clinical"]:
                logger.debug(
                    f"[Extraction Rejected] '{c.raw_name}' ({c.value}) -> "
                    f"Category: {classified['category']} | Reason: {classified.get('rejection_reason')}"
                )
                unclassified_candidates.append({
                    "raw_label": c.raw_name,
                    "value": c.value,
                    "unit": c.unit,
                    "classification": classified["category"].value if hasattr(classified["category"], "value") else str(classified["category"]),
                    "rejection_reason": classified.get("rejection_reason")
                })
                continue

            # 4. Positive Clinical Analyte Validation
            canonical_key = classified["canonical_key"]
            display_name = classified["display_name"]
            
            # Unit Handling: preserve extracted unit if compatible, else use canonical default unit
            unit = c.unit if (c.unit and classified.get("unit_valid", True)) else classified.get("default_unit", "")
            ref_range = c.reference_range if c.reference_range else classified.get("default_range", "Standard Reference Range")

            # Format score check
            format_score = 1.0 if (re.search(r'\d', c.value) or c.value.lower() in {'positive', 'negative', 'normal', 'reactive'}) else 0.30
            clinical_validity_confidence = 1.0 if classified.get("unit_valid", True) else 0.70

            # Weighted confidence formula
            score = (
                (0.20 * c.ocr_confidence) +
                (0.30 * classified["match_score"]) +
                (0.20 * c.spatial_confidence) +
                (0.10 * format_score) +
                (0.20 * clinical_validity_confidence)
            )
            confidence_label = "high" if score >= 0.80 else ("medium" if score >= 0.55 else "low")

            if confidence_label == "low":
                warnings.append(f"Parameter '{display_name}' (value '{c.value}') had low confidence ({score:.2f}). Flagged for review.")

            # Deduplication by canonical analyte key
            if canonical_key not in seen_canonicals:
                seen_canonicals.add(canonical_key)
                validated_parameters.append({
                    "name": display_name,
                    "canonical_name": canonical_key,
                    "value": c.value,
                    "unit": unit,
                    "reference_range": ref_range,
                    "flag": c.flag if c.flag else "Normal",
                    "category": classified.get("domain_category", "Biochemistry"),
                    "organ_system": classified.get("organ_system", "General"),
                    "confidence": confidence_label,
                    "source": "clinical_ontology_extractor"
                })

        return validated_parameters, unclassified_candidates, warnings


# ================================================================================
# 6. MAIN HYBRID EXTRACTION PIPELINE
# ================================================================================
def extract_report(file_input: Union[bytes, str, Path], synonyms_path: Optional[Union[str, Path]] = None) -> Dict[str, Any]:
    """Runs the full multi-stage hybrid extraction and clinical ontology validation pipeline."""
    file_bytes: Optional[bytes] = None
    if isinstance(file_input, (str, Path)):
        if os.path.exists(file_input):
            with open(file_input, "rb") as f:
                file_bytes = f.read()
    elif isinstance(file_input, bytes):
        file_bytes = file_input

    if not file_bytes:
        return {
            "metadata": {},
            "clinical_parameters": [],
            "parameters": [],
            "unclassified_candidates": [],
            "extraction_warnings": ["Empty or unreadable file input."]
        }

    # 1. OCR Engine & Preprocessing
    words, lines = OCREngine.extract_digital_words(file_bytes)

    # 2. Zoning & Metadata Regex Extraction
    metadata = extract_metadata(lines)

    # 3. Spatial Candidate Extraction
    candidates = SpatialMatcher.extract_candidates_from_lines(lines)

    # 4. Clinical Parameter Ontology Classification & Validation
    validated_params, unclassified, warnings = ConfidenceValidator.process_and_validate(candidates, metadata)

    return {
        "metadata": metadata,
        "clinical_parameters": validated_params,
        "parameters": validated_params,  # backward compatibility alias
        "unclassified_candidates": unclassified,
        "extraction_warnings": warnings
    }

