"""
Report Feature Mapping Layer for Liver Disease ML Pipeline
MedAssist AI Project
"""

import re
from typing import Dict, Any, Tuple, Optional, List


LIVER_PARAM_SYNONYMS = {
    "Total_Bilirubin": ["total bilirubin", "tbil", "t_bil", "total_bilirubin", "bilirubin total"],
    "Direct_Bilirubin": ["direct bilirubin", "dbil", "d_bil", "direct_bilirubin", "conjugated bilirubin"],
    "Alkaline_Phosphotase": ["alkaline phosphatase", "alkaline phosphotase", "alp", "alk phos"],
    "Alamine_Aminotransferase": ["alamine aminotransferase", "alt", "sgpt", "alanine transaminase"],
    "Aspartate_Aminotransferase": ["aspartate aminotransferase", "ast", "sgot", "aspartate transaminase"],
    "Total_Protiens": ["total protein", "total proteins", "total_protiens", "protein total", "t.protein"],
    "Albumin": ["albumin", "serum albumin"],
    "Albumin_and_Globulin_Ratio": ["albumin and globulin ratio", "a/g ratio", "albumin/globulin ratio", "ag ratio"]
}


def parse_numeric_val(val_str: Any) -> Optional[float]:
    try:
        if isinstance(val_str, (int, float)):
            return float(val_str)
        match = re.search(r'-?\d+(?:\.\d+)?', str(val_str))
        if match:
            return float(match.group(0))
    except Exception:
        pass
    return None


def map_extracted_report_to_liver_features(
    parsed_report: Dict[str, Any],
    patient_demographics: Optional[Dict[str, Any]] = None
) -> Tuple[Dict[str, Any], List[str]]:
    mapped_features = {}
    warnings = []

    meta = parsed_report.get("metadata", {}) or {}
    demo = patient_demographics or {}

    raw_age = demo.get("age") or meta.get("age")
    if raw_age is not None:
        try:
            mapped_features["Age"] = float(raw_age)
        except (ValueError, TypeError):
            warnings.append(f"Invalid age value: '{raw_age}'")

    raw_gender = demo.get("gender") or demo.get("sex") or meta.get("sex") or meta.get("gender")
    if raw_gender:
        g_clean = str(raw_gender).strip().capitalize()
        mapped_features["Gender"] = "Male" if g_clean.startswith("M") else "Female"

    parameters = parsed_report.get("parameters", []) or []
    vitals_list = parsed_report.get("vitals", []) or []
    all_params = parameters + vitals_list

    for param in all_params:
        p_name = (param.get("name") or param.get("label") or "").lower().strip()
        p_val = param.get("value")

        for feature_key, synonyms in LIVER_PARAM_SYNONYMS.items():
            if feature_key not in mapped_features and any(syn in p_name for syn in synonyms):
                num_val = parse_numeric_val(p_val)
                if num_val is not None:
                    mapped_features[feature_key] = round(num_val, 2)

    return mapped_features, warnings
