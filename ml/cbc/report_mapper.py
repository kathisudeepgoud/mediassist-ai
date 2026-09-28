"""
Report Feature Mapping Layer for CBC ML Pipeline
MedAssist AI Project
"""

import re
from typing import Dict, Any, Tuple, Optional, List


CBC_PARAM_SYNONYMS = {
    "WBC": ["wbc", "white blood cell", "white blood cell count", "total wbc count", "total wbc", "tlc"],
    "LYMp": ["lymp", "lymphocyte percentage", "lymphocytes %", "lymphocytes percentage", "lymphocyte %"],
    "NEUTp": ["neutp", "neutrophil percentage", "neutrophils %", "neutrophils percentage", "neutrophil %"],
    "LYMn": ["lymn", "lymphocyte count", "absolute lymphocyte count", "lymphocytes count"],
    "NEUTn": ["neutn", "neutrophil count", "absolute neutrophil count", "neutrophils count"],
    "RBC": ["rbc", "red blood cell", "red blood cell count", "total rbc count", "rbc count", "erythrocytes"],
    "HGB": ["hgb", "hb", "hemoglobin", "haemoglobin", "hemoglobin hb"],
    "HCT": ["hct", "hematocrit", "haematocrit", "packed cell volume", "pcv"],
    "MCV": ["mcv", "mean corpuscular volume"],
    "MCH": ["mch", "mean corpuscular hemoglobin"],
    "MCHC": ["mchc", "mean corpuscular hemoglobin concentration"],
    "PLT": ["plt", "platelet", "platelet count", "total platelet count", "platelets"],
    "PDW": ["pdw", "platelet distribution width"],
    "PCT": ["pct", "plateletcrit", "platelet hematocrit"]
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


def map_extracted_report_to_cbc_features(
    parsed_report: Dict[str, Any],
    patient_demographics: Optional[Dict[str, Any]] = None
) -> Tuple[Dict[str, Any], List[str]]:
    mapped_features = {}
    warnings = []

    parameters = parsed_report.get("parameters", []) or []
    vitals_list = parsed_report.get("vitals", []) or []
    all_params = parameters + vitals_list

    for param in all_params:
        p_name = (param.get("name") or param.get("label") or "").lower().strip()
        p_val = param.get("value")

        for feature_key, synonyms in CBC_PARAM_SYNONYMS.items():
            if feature_key not in mapped_features and any(syn in p_name for syn in synonyms):
                num_val = parse_numeric_val(p_val)
                if num_val is not None:
                    mapped_features[feature_key] = round(num_val, 2)
                else:
                    warnings.append(f"Field '{p_name}': Could not parse numeric value '{p_val}'")

    return mapped_features, warnings
