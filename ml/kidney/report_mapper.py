"""
Report Feature Mapping Layer for Chronic Kidney Disease ML Pipeline
MedAssist AI Project
"""

import re
from typing import Dict, Any, Tuple, Optional, List


KIDNEY_PARAM_SYNONYMS = {
    "sc": ["serum creatinine", "creatinine", "sc", "s.creatinine"],
    "bu": ["blood urea", "bu", "urea", "blood urea nitrogen", "bun"],
    "bgr": ["blood glucose random", "bgr", "glucose", "random blood sugar", "rbs", "fbs"],
    "sod": ["sodium", "serum sodium", "sod", "s.sodium", "na+"],
    "pot": ["potassium", "serum potassium", "pot", "s.potassium", "k+"],
    "hemo": ["hemoglobin", "hemo", "hb", "hgb"],
    "pcv": ["pcv", "packed cell volume", "hct", "hematocrit"],
    "wc": ["wc", "wbc", "white blood cell count", "tlc"],
    "rc": ["rc", "rbc", "red blood cell count"],
    "bp": ["bp", "blood pressure", "sysbp", "systolic blood pressure"],
    "sg": ["sg", "specific gravity"],
    "al": ["al", "albumin", "urine albumin"],
    "su": ["su", "sugar", "urine sugar"]
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


def map_extracted_report_to_kidney_features(
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
            mapped_features["age"] = float(raw_age)
        except (ValueError, TypeError):
            warnings.append(f"Invalid age value: '{raw_age}'")

    mapped_features["htn"] = "yes" if str(demo.get("hypertension") or meta.get("hypertension")).lower() in ["1", "true", "yes"] else "no"
    mapped_features["dm"] = "yes" if str(demo.get("diabetes") or meta.get("diabetes")).lower() in ["1", "true", "yes"] else "no"
    mapped_features["cad"] = "yes" if str(demo.get("heart_disease") or meta.get("heart_disease")).lower() in ["1", "true", "yes"] else "no"
    mapped_features["appet"] = "poor" if str(demo.get("appetite")).lower() == "poor" else "good"
    mapped_features["pe"] = "yes" if str(demo.get("pedal_edema")).lower() in ["1", "true", "yes"] else "no"
    mapped_features["ane"] = "yes" if str(demo.get("anemia")).lower() in ["1", "true", "yes"] else "no"

    mapped_features["rbc"] = "normal"
    mapped_features["pc"] = "normal"
    mapped_features["pcc"] = "notpresent"
    mapped_features["ba"] = "notpresent"

    parameters = parsed_report.get("parameters", []) or []
    vitals_list = parsed_report.get("vitals", []) or []
    all_params = parameters + vitals_list

    for param in all_params:
        p_name = (param.get("name") or param.get("label") or "").lower().strip()
        p_val = param.get("value")

        for feature_key, synonyms in KIDNEY_PARAM_SYNONYMS.items():
            if feature_key not in mapped_features and any(syn in p_name for syn in synonyms):
                num_val = parse_numeric_val(p_val)
                if num_val is not None:
                    mapped_features[feature_key] = round(num_val, 2)

    return mapped_features, warnings
