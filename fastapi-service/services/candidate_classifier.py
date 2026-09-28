"""
Candidate Classification and Semantic Filtering Engine
MedAssist AI — Distinguishes genuine clinical analytes from metadata, identifiers, diagnoses, interpretations, and headers.
"""

import re
import os
import logging
from enum import Enum
from typing import Dict, Any, Optional, Tuple, List

from services.clinical_ontology import (
    CLINICAL_ONTOLOGY,
    find_canonical_key_by_exact_synonym,
    get_ontology_definition,
    is_unit_compatible,
    get_all_synonym_list
)

logger = logging.getLogger(__name__)

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


class CandidateCategory(str, Enum):
    CLINICAL_MEASUREMENT = "CLINICAL_MEASUREMENT"
    VITAL_SIGN = "VITAL_SIGN"
    PATIENT_IDENTIFIER = "PATIENT_IDENTIFIER"
    REPORT_IDENTIFIER = "REPORT_IDENTIFIER"
    METADATA = "METADATA"
    DEMOGRAPHIC = "DEMOGRAPHIC"
    DIAGNOSIS = "DIAGNOSIS"
    INTERPRETATION = "INTERPRETATION"
    REFERENCE_RANGE = "REFERENCE_RANGE"
    SECTION_HEADER = "SECTION_HEADER"
    ADMINISTRATIVE_FIELD = "ADMINISTRATIVE_FIELD"
    UNKNOWN = "UNKNOWN"


# Explicit regex pattern dictionaries for non-measurement categories
PATIENT_ID_PATTERNS = [
    r'\b(?:patient\s*(?:id|no|#|\.)?|uhid|mrn|pid|medical\s*record\s*no|reg(?:istration)?\.?\s*(?:no|id)?)\b',
    r'\b(?:ipd|opd|cr\s*no|patient\s*reg)\b'
]

REPORT_ID_PATTERNS = [
    r'\b(?:sample\s*(?:id|no|#|\.)?|specimen\s*(?:id|no)?|accession\s*(?:no|id)?|barcode|barcode\s*no|report\s*(?:no|id|#)?|lab\s*(?:no|number|id)?|order\s*(?:no|id)?|bill\s*(?:no|id)?|invoice\s*(?:no|id)?|ref\s*no)\b',
    r'\b(?:test\s*id|sid|vial\s*id)\b'
]

DEMOGRAPHIC_PATTERNS = [
    r'\b(?:patient\s*name|pt\s*name|client\s*name)\b',
    r'\b(?:age|years|yrs|dob|date\s*of\s*birth)\b',
    r'\b(?:sex|gender|male|female)\b'
]

METADATA_PATTERNS = [
    r'\b(?:doctor|ref\.\s*by|referred\s*by|consultant|physician|pathologist|dr\.?)\b',
    r'\b(?:hospital|clinic|center|centre|laboratory)\b',
    r'\b(?:collected|collection\s*date|reported\s*(?:on|date)?|received|registered|sample\s*type|specimen\s*type|date|time|phone|mobile|address)\b'
]

DIAGNOSIS_PATTERNS = [
    r'^(?:diabetes\s*mellitus|type\s*[12]\s*diabetes|iddm|niddm|prediabetes|gestational\s*diabetes)$',
    r'^(?:hypertension|essential\s*hypertension|htn)$',
    r'^(?:anemia|iron\s*deficiency\s*anemia|microcytic\s*anemia|megaloblastic\s*anemia)$',
    r'^(?:chronic\s*kidney\s*disease|ckd|acute\s*kidney\s*injury|renal\s*failure)$',
    r'^(?:cirrhosis|fatty\s*liver|hepatitis|nafld|nash)$',
    r'^(?:diagnosis|provisional\s*diagnosis|clinical\s*diagnosis|history\s*of)$'
]

INTERPRETATION_PATTERNS = [
    r'^(?:impaired\s*tolerance|impaired\s*glucose\s*tolerance|igt|impaired\s*fasting\s*glucose|ifg)$',
    r'^(?:impression|interpretation|conclusion|recommendation|clinical\s*notes|comments|remark(?:s)?|note)$',
    r'^(?:normal|abnormal|borderline|critical|high|low|positive|negative|reactive|non[\s\-]reactive|indeterminate)$'
]

ADMINISTRATIVE_PATTERNS = [
    r'^(?:page|page\s*no|drlogy|smart\s*report|iso\s*certified|nabl|accredited|authorized\s*signatory|signature|end\s*of\s*report)$',
    r'^(?:status|verified\s*by|processed\s*by|technician|approved\s*by)$'
]

SECTION_HEADER_PATTERNS = [
    r'^(?:biochemistry|hematology|clinical\s*pathology|lipid\s*profile|liver\s*function\s*test|renal\s*function\s*test|kidney\s*function\s*test|complete\s*blood\s*count|cbc|thyroid\s*profile|urine\s*routine|investigation|test\s*name|parameter|result|units|unit|reference\s*range|bio\s*ref\s*interval)$'
]


class CandidateClassifier:
    _sentence_model = None

    @classmethod
    def _get_sentence_model(cls):
        if not HAS_SENTENCE_TRANSFORMERS:
            return None
        if cls._sentence_model is None:
            try:
                os.environ["TOKENIZERS_PARALLELISM"] = "false"
                try:
                    cls._sentence_model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
                except Exception:
                    cls._sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as e:
                logger.warning(f"SentenceTransformer init failed in classifier: {e}")
                cls._sentence_model = None
        return cls._sentence_model

    @classmethod
    def classify_candidate(
        cls,
        raw_label: str,
        value: str,
        unit: str = "",
        reference_range: str = ""
    ) -> Dict[str, Any]:
        """
        Classifies an extracted OCR candidate and maps it to a canonical clinical analyte if valid.
        
        Returns:
            Dict containing:
            - category: CandidateCategory
            - is_clinical: bool
            - canonical_key: Optional[str]
            - display_name: Optional[str]
            - matched_synonym: Optional[str]
            - match_score: float (0.0 to 1.0)
            - match_method: str ('exact', 'rapidfuzz', 'sentence_transformer', 'non_clinical', 'unknown')
            - unit_valid: bool
            - rejection_reason: Optional[str]
        """
        clean_label = re.sub(r'^\d+[\.\)]\s*', '', raw_label or '').strip()
        label_lower = clean_label.lower()

        # 1. Check Identifiers, Demographics & Administrative Patterns First
        for pat in PATIENT_ID_PATTERNS:
            if re.search(pat, label_lower):
                return {
                    "category": CandidateCategory.PATIENT_IDENTIFIER,
                    "is_clinical": False,
                    "rejection_reason": "Matched Patient Identifier pattern"
                }

        for pat in REPORT_ID_PATTERNS:
            if re.search(pat, label_lower):
                return {
                    "category": CandidateCategory.REPORT_IDENTIFIER,
                    "is_clinical": False,
                    "rejection_reason": "Matched Report/Sample Identifier pattern"
                }

        for pat in DEMOGRAPHIC_PATTERNS:
            if re.search(pat, label_lower):
                return {
                    "category": CandidateCategory.DEMOGRAPHIC,
                    "is_clinical": False,
                    "rejection_reason": "Matched Demographic field pattern"
                }

        for pat in METADATA_PATTERNS:
            if re.search(pat, label_lower):
                return {
                    "category": CandidateCategory.METADATA,
                    "is_clinical": False,
                    "rejection_reason": "Matched Metadata/Facility pattern"
                }

        for pat in DIAGNOSIS_PATTERNS:
            if re.search(pat, label_lower):
                return {
                    "category": CandidateCategory.DIAGNOSIS,
                    "is_clinical": False,
                    "rejection_reason": "Matched Disease/Diagnosis pattern (not a measurable analyte)"
                }

        for pat in INTERPRETATION_PATTERNS:
            if re.search(pat, label_lower):
                return {
                    "category": CandidateCategory.INTERPRETATION,
                    "is_clinical": False,
                    "rejection_reason": "Matched Clinical Interpretation/Impression pattern"
                }

        for pat in ADMINISTRATIVE_PATTERNS:
            if re.search(pat, label_lower):
                return {
                    "category": CandidateCategory.ADMINISTRATIVE_FIELD,
                    "is_clinical": False,
                    "rejection_reason": "Matched Administrative/Layout pattern"
                }

        for pat in SECTION_HEADER_PATTERNS:
            if re.search(pat, label_lower):
                return {
                    "category": CandidateCategory.SECTION_HEADER,
                    "is_clinical": False,
                    "rejection_reason": "Matched Section/Table Header pattern"
                }

        # 2. Positive Clinical Ontology Matching
        # Layer 1: Exact Synonym Match
        exact_key = find_canonical_key_by_exact_synonym(label_lower)
        if exact_key:
            defn = get_ontology_definition(exact_key)
            unit_ok = is_unit_compatible(exact_key, unit)
            return {
                "category": CandidateCategory.VITAL_SIGN if defn.category == "Vital Signs" else CandidateCategory.CLINICAL_MEASUREMENT,
                "is_clinical": True,
                "canonical_key": exact_key,
                "display_name": defn.display_name,
                "matched_synonym": label_lower,
                "match_score": 1.0,
                "match_method": "exact",
                "unit_valid": unit_ok,
                "default_unit": defn.default_unit,
                "default_range": defn.default_range,
                "organ_system": defn.organ_system,
                "domain_category": defn.category
            }

        all_synonyms = get_all_synonym_list()

        # Layer 2: RapidFuzz Levenshtein Similarity Match
        if HAS_RAPIDFUZZ and all_synonyms:
            best = process.extractOne(label_lower, all_synonyms, scorer=fuzz.token_sort_ratio)
            if best and best[1] >= 78:
                matched_syn, score, _ = best
                canonical_key = find_canonical_key_by_exact_synonym(matched_syn)
                if canonical_key:
                    defn = get_ontology_definition(canonical_key)
                    unit_ok = is_unit_compatible(canonical_key, unit)
                    return {
                        "category": CandidateCategory.VITAL_SIGN if defn.category == "Vital Signs" else CandidateCategory.CLINICAL_MEASUREMENT,
                        "is_clinical": True,
                        "canonical_key": canonical_key,
                        "display_name": defn.display_name,
                        "matched_synonym": matched_syn,
                        "match_score": score / 100.0,
                        "match_method": "rapidfuzz",
                        "unit_valid": unit_ok,
                        "default_unit": defn.default_unit,
                        "default_range": defn.default_range,
                        "organ_system": defn.organ_system,
                        "domain_category": defn.category
                    }

        # Layer 3: SentenceTransformers Vector Search Match
        model = cls._get_sentence_model()
        if model and all_synonyms:
            try:
                query_emb = model.encode(label_lower, convert_to_tensor=True, show_progress_bar=False)
                target_embs = model.encode(all_synonyms, convert_to_tensor=True, show_progress_bar=False)
                scores = util.cos_sim(query_emb, target_embs)[0]
                best_idx = int(torch.argmax(scores))
                best_score = float(scores[best_idx])

                # High vector similarity threshold to prevent arbitrary phrase promotion
                if best_score >= 0.72:
                    matched_syn = all_synonyms[best_idx]
                    canonical_key = find_canonical_key_by_exact_synonym(matched_syn)
                    if canonical_key:
                        defn = get_ontology_definition(canonical_key)
                        unit_ok = is_unit_compatible(canonical_key, unit)
                        return {
                            "category": CandidateCategory.VITAL_SIGN if defn.category == "Vital Signs" else CandidateCategory.CLINICAL_MEASUREMENT,
                            "is_clinical": True,
                            "canonical_key": canonical_key,
                            "display_name": defn.display_name,
                            "matched_synonym": matched_syn,
                            "match_score": best_score,
                            "match_method": "sentence_transformer",
                            "unit_valid": unit_ok,
                            "default_unit": defn.default_unit,
                            "default_range": defn.default_range,
                            "organ_system": defn.organ_system,
                            "domain_category": defn.category
                        }
            except Exception as e:
                logger.warning(f"Vector search exception in classifier: {e}")

        # 3. If no ontology mapping matches, categorize as UNKNOWN
        return {
            "category": CandidateCategory.UNKNOWN,
            "is_clinical": False,
            "rejection_reason": f"Label '{clean_label}' does not match any recognized clinical analyte in the ontology"
        }
