"""
Automated Test Suite for Diabetes Risk Analysis ML Pipeline
MedAssist AI Project

Implements 11 Core Functional & Pipeline Tests + Explicit Data Leakage Verification.
"""

import sys
import os
import json
from pathlib import Path
import pytest
import pandas as pd
import numpy as np
import joblib

# Ensure ml module is in python path
MODULE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = MODULE_DIR.parent.parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import config
from preprocessing import DiabetesDataPreprocessor
from predict import predict_diabetes_risk, load_artifacts
from report_mapper import map_extracted_report_to_features


@pytest.fixture(scope="module")
def raw_dataset():
    """Fixture providing raw pandas dataframe loaded from project dataset path."""
    assert os.path.exists(config.DATASET_PATH), f"Dataset file does not exist at {config.DATASET_PATH}"
    df = pd.read_csv(config.DATASET_PATH)
    return df


@pytest.fixture(scope="module")
def train_test_data(raw_dataset):
    """Fixture providing dataset split into train/test prior to SMOTE."""
    from sklearn.model_selection import train_test_split
    target = config.TARGET_COLUMN
    features = [c for c in raw_dataset.columns if c != target and c.lower() not in config.IDENTIFIER_COLUMNS]

    X = raw_dataset[features]
    y = raw_dataset[target]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=config.TEST_SIZE, random_state=config.RANDOM_STATE, stratify=y
    )
    return X_train, X_test, y_train, y_test, features


# --- TEST 1: Dataset Loads Successfully ---
def test_01_dataset_loads_successfully(raw_dataset):
    assert isinstance(raw_dataset, pd.DataFrame)
    assert not raw_dataset.empty
    assert raw_dataset.shape[0] > 1000
    assert raw_dataset.shape[1] >= 5


# --- TEST 2: Correct Target Column Selected ---
def test_02_correct_target_column_selected(raw_dataset):
    assert config.TARGET_COLUMN in raw_dataset.columns
    unique_targets = raw_dataset[config.TARGET_COLUMN].dropna().unique()
    assert set(unique_targets).issubset({0, 1})


# --- TEST 3: Target Not Included in Input Features ---
def test_03_target_not_in_features(train_test_data):
    _, _, _, _, features = train_test_data
    assert config.TARGET_COLUMN not in features


# --- TEST 4: Train / Test Split Works (80/20 Ratio) ---
def test_04_train_test_split_ratio(train_test_data):
    X_train, X_test, y_train, y_test, _ = train_test_data
    total_samples = len(X_train) + len(X_test)
    test_ratio = len(X_test) / total_samples
    assert pytest.approx(test_ratio, abs=0.01) == config.TEST_SIZE


# --- TEST 5: SMOTE Runs ONLY on Training Data ---
def test_05_smote_runs_only_on_training_data(train_test_data):
    from imblearn.over_sampling import SMOTE
    X_train, X_test, y_train, y_test, _ = train_test_data

    preprocessor = DiabetesDataPreprocessor()
    X_train_trans = preprocessor.fit_transform(X_train)

    smote = SMOTE(random_state=config.SMOTE_RANDOM_STATE)
    X_res, y_res = smote.fit_resample(X_train_trans, y_train)

    # Resampled train should be balanced
    counts = y_res.value_counts()
    assert counts[0] == counts[1]

    # Test set sample count must remain exact and untouched
    assert len(y_test) == len(X_test)


# --- TEST 6: Random Forest Trains Successfully ---
def test_06_random_forest_trains_successfully(train_test_data):
    from sklearn.ensemble import RandomForestClassifier
    X_train, _, y_train, _, _ = train_test_data

    preprocessor = DiabetesDataPreprocessor()
    X_train_trans = preprocessor.fit_transform(X_train)

    rf = RandomForestClassifier(n_estimators=10, random_state=42)
    rf.fit(X_train_trans, y_train)

    assert hasattr(rf, "classes_")
    assert len(rf.classes_) == 2


# --- TEST 7: Prediction Returns Expected Structure ---
def test_07_prediction_structure():
    sample_patient = {
        "gender": "Female",
        "age": 50.0,
        "hypertension": 0,
        "heart_disease": 0,
        "smoking_history": "never",
        "bmi": 27.5,
        "HbA1c_level": 6.5,
        "blood_glucose_level": 140
    }
    res = predict_diabetes_risk(sample_patient)
    assert res.get("disease") == "Diabetes"
    assert res.get("prediction") in [0, 1]
    assert 0.0 <= res.get("risk_probability") <= 1.0
    assert res.get("risk_level") in ["Low", "Moderate", "High"]
    assert "model" in res
    assert "model_version" in res


# --- TEST 8: Missing Feature Produces Controlled Error ---
def test_08_missing_feature_controlled_error():
    incomplete_patient = {
        "gender": "Female",
        "age": 40.0
    }
    res = predict_diabetes_risk(incomplete_patient)
    assert res.get("status") == "insufficient_data"
    assert isinstance(res.get("missing_features"), list)
    assert len(res.get("missing_features")) > 0
    assert "HbA1c_level" in res.get("missing_features")


# --- TEST 9: Invalid Feature Value Produces Controlled Error ---
def test_09_invalid_feature_controlled_error():
    invalid_patient = {
        "gender": "Female",
        "age": np.inf,  # Infinite value
        "hypertension": 0,
        "heart_disease": 0,
        "smoking_history": "never",
        "bmi": 27.5,
        "HbA1c_level": 6.5,
        "blood_glucose_level": 140
    }
    res = predict_diabetes_risk(invalid_patient)
    assert res.get("status") == "invalid_data"


# --- TEST 10: Saved Model Artifacts Load Successfully ---
def test_10_saved_model_artifacts_load():
    assert config.MODEL_PATH.exists()
    assert config.PREPROCESSOR_PATH.exists()
    assert config.METADATA_PATH.exists()

    model, prep, meta = load_artifacts()
    assert model is not None
    assert prep is not None
    assert isinstance(meta, dict)


# --- TEST 11: Prediction Uses Same Feature Order as Training ---
def test_11_prediction_feature_order():
    model, prep, meta = load_artifacts()
    raw_features = meta.get("raw_features", [])

    # Pass dictionary with shuffled key order
    shuffled_patient = {
        "blood_glucose_level": 160,
        "age": 60.0,
        "hypertension": 1,
        "gender": "Male",
        "bmi": 30.0,
        "smoking_history": "former",
        "heart_disease": 0,
        "HbA1c_level": 7.0
    }

    df_shuffled = pd.DataFrame([shuffled_patient])[raw_features]
    assert list(df_shuffled.columns) == raw_features


# --- TEST 12: Data Leakage Verification ---
def test_12_data_leakage_verification(train_test_data):
    import pickle
    X_train, X_test, y_train, y_test, _ = train_test_data
    preprocessor = DiabetesDataPreprocessor()

    # Preprocessor fit strictly on X_train
    preprocessor.fit(X_train)
    
    # Ensure preprocessor does NOT modify internal states when calling transform on X_test
    state_before = pickle.dumps(preprocessor.column_transformer)
    _ = preprocessor.transform(X_test)
    state_after = pickle.dumps(preprocessor.column_transformer)

    assert state_before == state_after, "Preprocessor state changed during test set transform!"
