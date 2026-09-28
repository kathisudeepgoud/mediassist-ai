"""
Report Feature Mapping Layer for Heart Disease ML Pipeline
MedAssist AI Project
"""

import re
from typing import Dict, Any, Tuple, Optional, List


HEART_PARAM_SYNONYMS = {
    "totChol": ["cholesterol", "total cholesterol", "totchol", "serum cholesterol"],
    "sysBP": ["sysbp", "systolic", "systolic blood pressure", "systolic bp", "blood pressure (systolic)"],
    "diaBP": ["diabp", "diastolic", "diastolic blood pressure", "diastolic bp", "blood pressure (diastolic)"],
    "BMI": ["bmi", "body mass index"],
    "heartRate": ["heart rate", "heartrate", "pulse", "pulse rate", "hr"],
    "glucose": ["glucose", "blood glucose", "fasting glucose", "blood sugar", "fbs"],
    "cigsPerDay": ["cigsperday", "cigarettes per day", "cigs per day", "daily cigarettes"]
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


def map_extracted_report_to_heart_features(
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

    raw_gender = demo.get("gender") or demo.get("sex") or meta.get("sex") or meta.get("gender")
    if raw_gender is not None:
        g_clean = str(raw_gender).strip().lower()
        mapped_features["male"] = 1 if g_clean in ["male", "m", "1"] else 0

    if "hypertension" in demo or "hypertension" in meta:
        val = demo.get("hypertension") or meta.get("hypertension")
        mapped_features["prevalentHyp"] = 1 if str(val).lower() in ["1", "true", "yes"] else 0
    else:
        mapped_features["prevalentHyp"] = 0

    if "diabetes" in demo or "diabetes" in meta:
        val = demo.get("diabetes") or meta.get("diabetes")
        mapped_features["diabetes"] = 1 if str(val).lower() in ["1", "true", "yes"] else 0
    else:
        mapped_features["diabetes"] = 0

    if "currentSmoker" in demo or "smoking_history" in demo:
        val = demo.get("currentSmoker") or demo.get("smoking_history")
        mapped_features["currentSmoker"] = 1 if str(val).lower() in ["1", "true", "yes", "smoker", "former"] else 0
    else:
        mapped_features["currentSmoker"] = 0

    mapped_features["BPMeds"] = 1 if str(demo.get("BPMeds")).lower() in ["1", "true", "yes"] else 0
    mapped_features["prevalentStroke"] = 1 if str(demo.get("prevalentStroke")).lower() in ["1", "true", "yes"] else 0
    mapped_features["cigsPerDay"] = parse_numeric_val(demo.get("cigsPerDay")) or 0.0

    parameters = parsed_report.get("parameters", []) or []
    vitals_list = parsed_report.get("vitals", []) or []
    all_params = parameters + vitals_list

    for param in all_params:
        p_name = (param.get("name") or param.get("label") or "").lower().strip()
        p_val = param.get("value")

        for feature_key, synonyms in HEART_PARAM_SYNONYMS.items():
            if feature_key not in mapped_features and any(syn in p_name for syn in synonyms):
                num_val = parse_numeric_val(p_val)
                if num_val is not None:
                    mapped_features[feature_key] = round(num_val, 2)

    return mapped_features, warnings
