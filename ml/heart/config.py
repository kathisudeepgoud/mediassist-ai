"""
Configuration Module for Heart Disease Risk Analysis ML Pipeline
MedAssist AI Project
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

DATASET_PATH = os.getenv(
    "HEART_DATASET_PATH",
    str(BASE_DIR / "dataset" / "framingham.csv")
)

TARGET_COLUMN = os.getenv("HEART_TARGET_COLUMN", "TenYearCHD")

MODELS_DIR = BASE_DIR / "models"
MODEL_PATH = MODELS_DIR / "heart_random_forest.pkl"
PREPROCESSOR_PATH = MODELS_DIR / "preprocessing.pkl"
METADATA_PATH = MODELS_DIR / "feature_metadata.json"

RESULTS_DIR = BASE_DIR / "results"
CONFUSION_MATRIX_PATH = RESULTS_DIR / "confusion_matrix.png"
ROC_CURVE_PATH = RESULTS_DIR / "roc_curve.png"
FEATURE_IMPORTANCE_PATH = RESULTS_DIR / "feature_importance.png"
METRICS_PATH = RESULTS_DIR / "metrics.json"

TEST_SIZE = 0.20
RANDOM_STATE = 42
SMOTE_RANDOM_STATE = 42

N_ESTIMATORS = 200
MAX_DEPTH = None
MIN_SAMPLES_SPLIT = 2
MIN_SAMPLES_LEAF = 1
MAX_FEATURES = "sqrt"

RF_PARAMS = {
    "n_estimators": N_ESTIMATORS,
    "max_depth": MAX_DEPTH,
    "min_samples_split": MIN_SAMPLES_SPLIT,
    "min_samples_leaf": MIN_SAMPLES_LEAF,
    "max_features": MAX_FEATURES,
    "random_state": RANDOM_STATE,
    "n_jobs": -1
}

RISK_THRESHOLDS = {
    "low": (0.00, 0.29),
    "moderate": (0.30, 0.59),
    "high": (0.60, 1.00)
}

IDENTIFIER_COLUMNS = [
    "education", "id", "patient_id", "patient_name", "name", "email", "phone",
    "phone_number", "mrn", "medical_report_id", "report_id",
    "created_at", "updated_at", "timestamp"
]

def get_risk_level(probability: float) -> str:
    if probability < 0.30:
        return "Low"
    elif probability < 0.60:
        return "Moderate"
    else:
        return "High"
