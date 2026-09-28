"""
Inference & Prediction Module for CBC Risk Analysis ML Pipeline
MedAssist AI Project
"""

import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np
import joblib
from typing import Dict, Any, List

MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

try:
    import config
    from preprocessing import CBCDataPreprocessor
except ImportError:
    from ml.cbc import config
    from ml.cbc.preprocessing import CBCDataPreprocessor

_MODEL = None
_PREPROCESSOR = None
_METADATA = None


def load_artifacts():
    global _MODEL, _PREPROCESSOR, _METADATA

    if _MODEL is None:
        if not config.MODEL_PATH.exists():
            raise FileNotFoundError(f"Saved CBC model file not found at: {config.MODEL_PATH}. Run train.py first.")
        _MODEL = joblib.load(config.MODEL_PATH)

    if _PREPROCESSOR is None:
        if not config.PREPROCESSOR_PATH.exists():
            raise FileNotFoundError(f"Saved CBC preprocessor file not found at: {config.PREPROCESSOR_PATH}. Run train.py first.")
        _PREPROCESSOR = CBCDataPreprocessor.load(str(config.PREPROCESSOR_PATH))

    if _METADATA is None:
        if not config.METADATA_PATH.exists():
            raise FileNotFoundError(f"Saved CBC metadata file not found at: {config.METADATA_PATH}. Run train.py first.")
        with open(config.METADATA_PATH, "r") as f:
            _METADATA = json.load(f)

    return _MODEL, _PREPROCESSOR, _METADATA


def predict_cbc_risk(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    model, preprocessor, metadata = load_artifacts()
    required_features: List[str] = metadata.get("raw_features", [])

    missing_features = [f for f in required_features if f not in patient_data or patient_data[f] is None]
    if missing_features:
        return {
            "status": "insufficient_data",
            "missing_features": missing_features,
            "message": f"Insufficient data for CBC disease risk estimation. Missing: {', '.join(missing_features)}"
        }

    input_row = {}
    for feature in required_features:
        val = patient_data[feature]
        if isinstance(val, (int, float)) and (np.isnan(val) or np.isinf(val)):
            return {
                "status": "invalid_data",
                "invalid_feature": feature,
                "message": f"Feature '{feature}' contains an invalid numerical value (NaN/Inf)."
            }
        input_row[feature] = [val]

    df_input = pd.DataFrame(input_row)
    X_transformed = preprocessor.transform(df_input)

    pred_class = int(model.predict(X_transformed)[0])
    probabilities = model.predict_proba(X_transformed)[0]
    positive_prob = float(probabilities[1]) if len(probabilities) > 1 else float(pred_class)

    risk_level = config.get_risk_level(positive_prob)

    return {
        "disease": "CBC Anemia & Hematology Risk",
        "prediction": pred_class,
        "risk_probability": round(positive_prob, 4),
        "risk_level": risk_level,
        "model": metadata.get("model_name", "Random Forest"),
        "model_version": metadata.get("model_version", "cbc_rf_v1")
    }
