"""
Inference & Prediction Module for Diabetes Risk Analysis ML Pipeline
MedAssist AI Project

Loads saved model, preprocessor, and metadata to generate patient diabetes risk predictions.
"""

import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np
import joblib
from typing import Dict, Any, List

# Ensure module directory is in sys.path
MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

try:
    import config
    from preprocessing import DiabetesDataPreprocessor
except ImportError:
    from ml.diabetes import config
    from ml.diabetes.preprocessing import DiabetesDataPreprocessor

# Global cache for loaded model artifacts
_MODEL = None
_PREPROCESSOR = None
_METADATA = None


def load_artifacts():
    """
    Loads saved model, preprocessor, and feature metadata from disk if not already loaded.
    """
    global _MODEL, _PREPROCESSOR, _METADATA

    if _MODEL is None:
        if not config.MODEL_PATH.exists():
            raise FileNotFoundError(f"Saved model file not found at: {config.MODEL_PATH}. Run train.py first.")
        _MODEL = joblib.load(config.MODEL_PATH)

    if _PREPROCESSOR is None:
        if not config.PREPROCESSOR_PATH.exists():
            raise FileNotFoundError(f"Saved preprocessor file not found at: {config.PREPROCESSOR_PATH}. Run train.py first.")
        _PREPROCESSOR = DiabetesDataPreprocessor.load(str(config.PREPROCESSOR_PATH))

    if _METADATA is None:
        if not config.METADATA_PATH.exists():
            raise FileNotFoundError(f"Saved metadata file not found at: {config.METADATA_PATH}. Run train.py first.")
        with open(config.METADATA_PATH, "r") as f:
            _METADATA = json.load(f)

    return _MODEL, _PREPROCESSOR, _METADATA


def predict_diabetes_risk(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates diabetes risk prediction for structured patient input data.

    Parameters:
        patient_data (dict): Dictionary of patient feature key-values.

    Returns:
        dict: Standard JSON-compatible prediction output or controlled insufficient_data error.
    """
    model, preprocessor, metadata = load_artifacts()
    required_features: List[str] = metadata.get("raw_features", [])

    # Verify missing features
    missing_features = [f for f in required_features if f not in patient_data or patient_data[f] is None]
    if missing_features:
        return {
            "status": "insufficient_data",
            "missing_features": missing_features,
            "message": "Insufficient data for diabetes risk estimation."
        }

    # Construct DataFrame in exact feature order used during training
    input_row = {}
    for feature in required_features:
        val = patient_data[feature]
        # Data type sanity checks
        if isinstance(val, (int, float)) and (np.isnan(val) or np.isinf(val)):
            return {
                "status": "invalid_data",
                "invalid_feature": feature,
                "message": f"Feature '{feature}' contains an invalid numerical value (NaN/Inf)."
            }
        input_row[feature] = [val]

    df_input = pd.DataFrame(input_row)

    # Transform input features using saved preprocessor
    X_transformed = preprocessor.transform(df_input)

    # Model inference
    pred_class = int(model.predict(X_transformed)[0])
    probabilities = model.predict_proba(X_transformed)[0]
    positive_prob = float(probabilities[1]) if len(probabilities) > 1 else float(pred_class)

    risk_level = config.get_risk_level(positive_prob)

    return {
        "disease": "Diabetes",
        "prediction": pred_class,
        "risk_probability": round(positive_prob, 4),
        "risk_level": risk_level,
        "model": metadata.get("model_name", "Random Forest"),
        "model_version": metadata.get("model_version", "diabetes_rf_v1")
    }


if __name__ == "__main__":
    print("Testing Diabetes Prediction Module with sample patient data...")

    sample_patient_high = {
        "gender": "Female",
        "age": 65.0,
        "hypertension": 1,
        "heart_disease": 0,
        "smoking_history": "former",
        "bmi": 32.5,
        "HbA1c_level": 7.5,
        "blood_glucose_level": 210
    }

    sample_patient_low = {
        "gender": "Male",
        "age": 28.0,
        "hypertension": 0,
        "heart_disease": 0,
        "smoking_history": "never",
        "bmi": 22.0,
        "HbA1c_level": 4.8,
        "blood_glucose_level": 85
    }

    sample_incomplete = {
        "gender": "Female",
        "age": 45.0,
        "bmi": 24.5
    }

    res_high = predict_diabetes_risk(sample_patient_high)
    res_low = predict_diabetes_risk(sample_patient_low)
    res_inc = predict_diabetes_risk(sample_incomplete)

    print("\nHigh Risk Patient Test Result:")
    print(json.dumps(res_high, indent=2))

    print("\nLow Risk Patient Test Result:")
    print(json.dumps(res_low, indent=2))

    print("\nIncomplete Patient Data Test Result:")
    print(json.dumps(res_inc, indent=2))
