"""
Candidate Classification and Semantic Filtering Engine
MedAssist AI — Distinguishes Clinical Analytes from Identifiers, Diagnoses, Guidelines, and Headers
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple, List
from .models import CandidateCategory
from .clinical_ontology import (
    CLINICAL_ONTOLOGY,
    find_canonical_key_by_exact_synonym,
    get_ontology_definition,
    is_unit_compatible
)

logger = logging.getLogger(__name__)

try:
    from rapidfuzz import fuzz, process
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False


class CandidateClassifier:
    """
    Taxonomically classifies every candidate label into one of distinct categories.
    Ensures that only genuine CLINICAL_MEASUREMENT candidates proceed to the measurement results.
    """

    PATIENT_ID_PATTERNS = [
        re.compile(r'\b(?:patient\s*(?:id|no|#|\.)?|uhid|mrn|pid|medical\s*record\s*no|reg(?:istration)?\.?\s*(?:no|id)?)\b', re.I),
        re.compile(r'\b(?:ipd|opd|cr\s*no|patient\s*reg)\b', re.I)
    ]

    REPORT_ID_PATTERNS = [
        re.compile(r'\b(?:sample\s*(?:id|no|#|\.)?|specimen\s*(?:id|no)?|accession\s*(?:no|id)?|barcode|barcode\s*no|report\s*(?:no|id|#)?|lab\s*(?:no|number|id)?|order\s*(?:no|id)?|bill\s*(?:no|id)?|invoice\s*(?:no|id)?|ref\s*no)\b', re.I),
        re.compile(r'\b(?:test\s*id|sid|vial\s*id)\b', re.I)
    ]

    DEMOGRAPHIC_PATTERNS = [
        re.compile(r'^(?:patient\s*name|pt\s*name|client\s*name|name)$', re.I),
        re.compile(r'^(?:age|age\s*[\/\&]\s*(?:sex|gender)|years|yrs|dob|date\s*of\s*birth)$', re.I),
        re.compile(r'^(?:sex|gender|male|female)$', re.I)
    ]

    DATE_TIME_PATTERNS = [
        re.compile(r'\b(?:collected(?:\s*on)?|collection\s*date|reported(?:\s*on)?|report\s*date|received(?:\s*on)?|received\s*date|registered(?:\s*on)?|registration\s*date)\b', re.I),
        re.compile(r'^(?:date|time|date\s*&\s*time|date\s*/\s*time|datetime)$', re.I)
    ]

    METADATA_PATTERNS = [
        re.compile(r'\b(?:doctor|ref\.\s*by|referred\s*by|consultant|physician|pathologist|dr\.?)\b', re.I),
        re.compile(r'\b(?:hospital|clinic|center|centre|laboratory)\b', re.I),
        re.compile(r'\b(?:sample\s*type|specimen\s*type|client|phone|mobile|address)\b', re.I)
    ]

    DIAGNOSIS_PATTERNS = [
        re.compile(r'^(?:diabetes\s*mellitus|type\s*[12]\s*diabetes|iddm|niddm|prediabetes|gestational\s*diabetes)$', re.I),
        re.compile(r'^(?:hypertension|essential\s*hypertension|htn)$', re.I),
        re.compile(r'^(?:anemia|iron\s*deficiency\s*anemia|microcytic\s*anemia|megaloblastic\s*anemia)$', re.I),
        re.compile(r'^(?:chronic\s*kidney\s*disease|ckd|acute\s*kidney\s*injury|renal\s*failure)$', re.I),
        re.compile(r'^(?:cirrhosis|fatty\s*liver|hepatitis|nafld|nash)$', re.I),
        re.compile(r'^(?:diagnosis|provisional\s*diagnosis|clinical\s*diagnosis|history\s*of)$', re.I)
    ]

    INTERPRETATION_PATTERNS = [
        re.compile(r'^(?:impaired\s*tolerance|impaired\s*glucose\s*tolerance|igt|impaired\s*fasting\s*glucose|ifg)$', re.I),
        re.compile(r'^(?:impression|interpretation|conclusion|recommendation|clinical\s*notes|comments|remark(?:s)?|note)$', re.I),
        re.compile(r'^(?:american\s*diabetes\s*association|ada\s*guidelines|who\s*criteria)$', re.I)
    ]

    METHODOLOGY_PATTERNS = [
        re.compile(r'^\(?(?:photometry|electrical\s*imped[ae]nce|vcs\s*technology|clia|immunoturbidometry|calculated|derived|eia|elisa|method|methodology)\)?$', re.I)
    ]

    ADMINISTRATIVE_PATTERNS = [
        re.compile(r'^(?:page|page\s*no|page\s*\d+\s*of\s*\d+|drlogy|smart\s*report|iso\s*certified|nabl|accredited|authorized\s*signatory|signature|end\s*of\s*report)$', re.I),
        re.compile(r'^(?:status|verified\s*by|processed\s*by|technician|approved\s*by)$', re.I)
    ]

    SECTION_HEADER_PATTERNS = [
        re.compile(r'^(?:biochemistry|hematology|haematology|clinical\s*pathology|lipid\s*profile|liver\s*function\s*test|renal\s*function\s*test|kidney\s*function\s*test|kft|lft|rft|complete\s*blood\s*count|cbc|blood\s*indices|thyroid\s*profile|urine\s*routine|investigation|test\s*name|parameter|result|units|unit|reference\s*range|bio\s*ref\s*interval|reference\s*interval)$', re.I)
    ]

    @classmethod
    def classify_candidate(
        cls,
        raw_label: str,
        value: str = "",
        unit: str = "",
        reference_range: str = ""
    ) -> Dict[str, Any]:
        """
        Classifies candidate label and returns classification result dict.
        """
        raw_label_str = str(raw_label or "").strip()
        clean_label = re.sub(r'^\d+[\.\)]\s*', '', raw_label_str).strip()
        clean_label = clean_label.rstrip(':').strip()
        norm_label = clean_label.lower()

        if not norm_label:
            return {
                "category": CandidateCategory.UNKNOWN,
                "is_clinical": False,
                "rejection_reason": "Empty candidate label"
            }

        # 1. Methodology check
        if any(p.match(norm_label) for p in cls.METHODOLOGY_PATTERNS):
            return {
                "category": CandidateCategory.METHODOLOGY,
                "is_clinical": False,
                "rejection_reason": "Methodology or calculation indicator"
            }

        # 2. Date / Time check
        if any(p.search(norm_label) if p.pattern.startswith(r'\b') else p.match(norm_label) for p in cls.DATE_TIME_PATTERNS):
            return {
                "category": CandidateCategory.DATE_TIME,
                "is_clinical": False,
                "rejection_reason": "Date/Time administrative field"
            }

        # 3. Patient Identifier check
        if any(p.search(norm_label) for p in cls.PATIENT_ID_PATTERNS):
            return {
                "category": CandidateCategory.PATIENT_IDENTIFIER,
                "is_clinical": False,
                "rejection_reason": "Patient identifier field"
            }

        # 4. Report Identifier check
        if any(p.search(norm_label) for p in cls.REPORT_ID_PATTERNS):
            return {
                "category": CandidateCategory.REPORT_IDENTIFIER,
                "is_clinical": False,
                "rejection_reason": "Sample or report tracking identifier"
            }

        # 5. Demographic check
        if any(p.match(norm_label) for p in cls.DEMOGRAPHIC_PATTERNS):
            return {
                "category": CandidateCategory.DEMOGRAPHIC,
                "is_clinical": False,
                "rejection_reason": "Demographic metadata field"
            }

        # 6. Metadata check
        if any(p.search(norm_label) for p in cls.METADATA_PATTERNS):
            return {
                "category": CandidateCategory.METADATA,
                "is_clinical": False,
                "rejection_reason": "Facility, doctor, or specimen metadata field"
            }

        # 7. Diagnosis check (e.g., "Diabetes mellitus: >=126" is a diagnostic threshold, NOT a patient result)
        if any(p.match(norm_label) for p in cls.DIAGNOSIS_PATTERNS):
            return {
                "category": CandidateCategory.DIAGNOSIS,
                "is_clinical": False,
                "rejection_reason": "Condition diagnosis name or clinical diagnostic threshold"
            }

        # 8. Interpretation / Commentary check
        if any(p.match(norm_label) for p in cls.INTERPRETATION_PATTERNS):
            return {
                "category": CandidateCategory.INTERPRETATION_THRESHOLD,
                "is_clinical": False,
                "rejection_reason": "Interpretation threshold or commentary header"
            }

        # 9. Administrative check
        if any(p.match(norm_label) for p in cls.ADMINISTRATIVE_PATTERNS):
            return {
                "category": CandidateCategory.ADMINISTRATIVE,
                "is_clinical": False,
                "rejection_reason": "Administrative or footer field"
            }

        # 10. Section Header check
        if any(p.match(norm_label) for p in cls.SECTION_HEADER_PATTERNS):
            return {
                "category": CandidateCategory.SECTION_HEADER,
                "is_clinical": False,
                "rejection_reason": "Table or section column header"
            }

        # 11. Direct / Exact Synonym Ontology Lookup
        canonical_key = find_canonical_key_by_exact_synonym(norm_label)
        if not canonical_key:
            clean_norm = re.sub(r'[:;,]+$', '', norm_label).strip()
            canonical_key = find_canonical_key_by_exact_synonym(clean_norm)

        if canonical_key:
            defn = get_ontology_definition(canonical_key)
            unit_valid = is_unit_compatible(canonical_key, unit)
            return {
                "category": CandidateCategory.CLINICAL_MEASUREMENT,
                "is_clinical": True,
                "canonical_key": canonical_key,
                "display_name": defn.display_name if defn else clean_label,
                "domain_category": defn.category if defn else "Biochemistry",
                "organ_system": defn.organ_system if defn else "General",
                "default_unit": defn.default_unit if defn else unit,
                "default_range": defn.default_range if defn else reference_range,
                "match_tier": "TIER_1_EXACT",
                "match_score": 1.0,
                "unit_valid": unit_valid
            }

        # 12. Fuzzy Match (Tier 2) via RapidFuzz
        if HAS_RAPIDFUZZ and len(norm_label) >= 4:
            best_key = None
            best_score = 0.0

            for c_key, defn in CLINICAL_ONTOLOGY.items():
                for syn in defn.synonyms:
                    score = fuzz.token_sort_ratio(norm_label, syn)
                    if score > best_score:
                        best_score = score
                        best_key = c_key

            if best_score >= 80.0 and best_key:
                defn = get_ontology_definition(best_key)
                unit_valid = is_unit_compatible(best_key, unit)
                return {
                    "category": CandidateCategory.CLINICAL_MEASUREMENT,
                    "is_clinical": True,
                    "canonical_key": best_key,
                    "display_name": defn.display_name if defn else clean_label,
                    "domain_category": defn.category if defn else "Biochemistry",
                    "organ_system": defn.organ_system if defn else "General",
                    "default_unit": defn.default_unit if defn else unit,
                    "default_range": defn.default_range if defn else reference_range,
                    "match_tier": "TIER_2_FUZZY",
                    "match_score": best_score / 100.0,
                    "unit_valid": unit_valid
                }

        # 13. If not matched to ontology, check if it has strong clinical characteristics
        if re.search(r'[\d]', str(value or "")) and (unit or reference_range):
            return {
                "category": CandidateCategory.CLINICAL_MEASUREMENT,
                "is_clinical": True,
                "canonical_key": re.sub(r'[^a-z0-9_]+', '_', norm_label).strip('_'),
                "display_name": clean_label,
                "domain_category": "General Clinical",
                "organ_system": "General",
                "default_unit": unit,
                "default_range": reference_range,
                "match_tier": "TIER_UNMAPPED_CANDIDATE",
                "match_score": 0.70,
                "unit_valid": True
            }

        return {
            "category": CandidateCategory.UNKNOWN,
            "is_clinical": False,
            "rejection_reason": "Not recognized as a clinical laboratory parameter"
        }
