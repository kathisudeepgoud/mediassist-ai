"""
Report Feature Mapping & Unit Conversion Layer
MedAssist AI Project

Maps raw extracted PDF/OCR medical parameters and patient demographics
to normalized ML model features expected by the Diabetes Random Forest module.
"""

import re
from typing import Dict, Any, Tuple, Optional, List


PARAM_SYNONYMS = {
    "HbA1c_level": [
        "hba1c", "hba1c level", "glycated hemoglobin", "hemoglobin a1c",
        "hba1c %", "glycohemoglobin", "a1c"
    ],
    "blood_glucose_level": [
        "blood glucose", "glucose", "fasting glucose", "fasting blood glucose",
        "blood sugar", "fasting blood sugar", "random blood glucose",
        "blood glucose level", "glucose fasting", "fbs"
    ],
    "bmi": [
        "bmi", "body mass index", "patient bmi"
    ],
    "hypertension": [
        "hypertension", "high blood pressure", "hbp"
    ],
    "heart_disease": [
        "heart disease", "cardiovascular disease", "coronary artery disease"
    ],
    "smoking_history": [
        "smoking", "smoking status", "smoking history", "tobacco use"
    ]
}


def normalize_unit_value(feature: str, val_str: Any, unit_str: str) -> Tuple[Optional[float], Optional[str]]:
    """
    Validates numerical value and converts unit if required.
    Supported units:
    - HbA1c: %, mmol/mol -> converts mmol/mol to %
    - Blood Glucose: mg/dL, mmol/L -> converts mmol/L to mg/dL
    """
    try:
        if isinstance(val_str, (int, float)):
            num_val = float(val_str)
        else:
            # Extract numerical float value from string (e.g. "6.5 %", "120 mg/dL")
            match = re.search(r'-?\d+(?:\.\d+)?', str(val_str))
            if not match:
                return None, f"Could not parse numeric value from '{val_str}'"
            num_val = float(match.group(0))
    except Exception as e:
        return None, str(e)

    unit_clean = (unit_str or "").lower().strip()

    if feature == "HbA1c_level":
        if "mmol/mol" in unit_clean:
            # IFCC (mmol/mol) to NGSP (%) conversion formula: % = (0.09148 * mmol/mol) + 2.152
            num_val = (0.09148 * num_val) + 2.152
        elif "%" not in unit_clean and unit_clean != "":
            # Log warning if unusual unit
            pass

    elif feature == "blood_glucose_level":
        if "mmol/l" in unit_clean:
            # mmol/L to mg/dL conversion formula: mg/dL = mmol/L * 18.0182
            num_val = num_val * 18.0182

    return round(num_val, 2), None


def map_extracted_report_to_features(
    parsed_report: Dict[str, Any],
    patient_demographics: Optional[Dict[str, Any]] = None
) -> Tuple[Dict[str, Any], List[str]]:
    """
    Maps parsed report dictionary (containing metadata and extracted parameters)
    into structured ML features for the Diabetes Random Forest model.

    Returns:
        mapped_features (dict): Dictionary containing ML features
        warnings (list): List of conversion or mapping warning messages
    """
    mapped_features = {}
    warnings = []

    # 1. Map Demographics (age, gender)
    meta = parsed_report.get("metadata", {}) or {}
    demo = patient_demographics or {}

    raw_age = demo.get("age") or meta.get("age")
    if raw_age is not None:
        try:
            mapped_features["age"] = float(raw_age)
        except (ValueError, TypeError):
            warnings.append(f"Invalid age value: '{raw_age}'")

    raw_gender = demo.get("gender") or demo.get("sex") or meta.get("sex") or meta.get("gender")
    if raw_gender:
        g_clean = str(raw_gender).strip().capitalize()
        if g_clean in ["Male", "Female"]:
            mapped_features["gender"] = g_clean
        elif g_clean.startswith("M"):
            mapped_features["gender"] = "Male"
        elif g_clean.startswith("F"):
            mapped_features["gender"] = "Female"
        else:
            mapped_features["gender"] = "Other"

    # Default optional medical history if provided in demographics
    if "hypertension" in demo:
        mapped_features["hypertension"] = 1 if demo["hypertension"] in [1, True, "1", "yes", "Yes"] else 0
    if "heart_disease" in demo:
        mapped_features["heart_disease"] = 1 if demo["heart_disease"] in [1, True, "1", "yes", "Yes"] else 0
    if "smoking_history" in demo:
        mapped_features["smoking_history"] = str(demo["smoking_history"])

    # 2. Map Parameters extracted from report
    parameters = parsed_report.get("parameters", []) or []
    for param in parameters:
        p_name = (param.get("name") or "").lower().strip()
        p_val = param.get("value")
        p_unit = param.get("unit", "")

        for feature_key, synonyms in PARAM_SYNONYMS.items():
            if feature_key not in mapped_features and any(syn in p_name for syn in synonyms):
                norm_val, err = normalize_unit_value(feature_key, p_val, p_unit)
                if norm_val is not None:
                    mapped_features[feature_key] = norm_val
                elif err:
                    warnings.append(f"Field '{p_name}': {err}")

    # Set defaults for optional binary/categorical features if missing in patient profile
    if "hypertension" not in mapped_features:
        mapped_features["hypertension"] = 0
    if "heart_disease" not in mapped_features:
        mapped_features["heart_disease"] = 0
    if "smoking_history" not in mapped_features:
        mapped_features["smoking_history"] = "No Info"

    return mapped_features, warnings
