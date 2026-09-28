"""
Primary Training Script for Heart Disease Risk Analysis ML Pipeline
MedAssist AI Project
"""

import sys
import json
from pathlib import Path
from typing import Tuple, List, Dict, Any
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from imblearn.over_sampling import SMOTE
import joblib

MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

try:
    import config
    from preprocessing import HeartDataPreprocessor
    from evaluate import evaluate_model
    from explain import generate_feature_importance
except ImportError:
    from ml.heart import config
    from ml.heart.preprocessing import HeartDataPreprocessor
    from ml.heart.evaluate import evaluate_model
    from ml.heart.explain import generate_feature_importance


def inspect_dataset(df: pd.DataFrame, dataset_path: str, target_col: str = None) -> Tuple[str, List[str]]:
    print("\n" + "=" * 35)
    print("HEART DATASET INFORMATION")
    print("=" * 35)
    print(f"\nDataset path: {dataset_path}")
    print(f"Dataset shape: {df.shape}")
    print(f"Number of rows: {df.shape[0]}")
    print(f"Number of columns: {df.shape[1]}")

    target_col = target_col or "TenYearCHD"
    print(f"\nTarget column: {target_col}")

    print("\nClass distribution:")
    print(df[target_col].value_counts().to_string())

    features = [
        col for col in df.columns
        if col != target_col and col.lower() not in config.IDENTIFIER_COLUMNS
    ]

    print("\nFeatures used for training:")
    for i, feature in enumerate(features, 1):
        print(f"{i}. {feature}")
    print("=" * 35 + "\n")

    return target_col, features


def train_pipeline(dataset_path: str = None) -> Tuple[RandomForestClassifier, HeartDataPreprocessor, dict]:
    target_path = dataset_path or config.DATASET_PATH
    print(f"Loading Heart dataset from: {target_path} ...")

    path_obj = Path(target_path)
    if not path_obj.exists():
        raise FileNotFoundError(f"Heart dataset file not found at: {target_path}")

    df_raw = pd.read_csv(target_path)
    print("Heart Dataset loaded successfully.")

    target_col, feature_cols = inspect_dataset(df_raw, target_path, config.TARGET_COLUMN)

    preprocessor = HeartDataPreprocessor()
    df_clean, dups_removed = preprocessor.clean_raw_dataframe(df_raw)

    X = df_clean[feature_cols].copy()
    y = df_clean[target_col].copy()

    print(f"Performing Train/Test Split ({int((1-config.TEST_SIZE)*100)}/{int(config.TEST_SIZE*100)})...")
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=config.TEST_SIZE,
        random_state=config.RANDOM_STATE,
        stratify=y
    )

    print(f"Training set size: {len(X_train)} samples")
    print(f"Testing set size:  {len(X_test)} samples")

    print("Fitting preprocessing pipeline on training data ONLY...")
    X_train_transformed = preprocessor.fit_transform(X_train)
    X_test_transformed = preprocessor.transform(X_test)
    transformed_feature_names = preprocessor.feature_names_out_

    print("\nApplying SMOTE resampling to training data ONLY...")
    print("\nTraining distribution BEFORE SMOTE")
    print(y_train.value_counts().to_string())

    smote = SMOTE(random_state=config.SMOTE_RANDOM_STATE)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train_transformed, y_train)

    print("\nTraining distribution AFTER SMOTE")
    print(y_train_resampled.value_counts().to_string())
    print("\nTest set remains completely untouched.\n")

    print(f"Training Random Forest Classifier (n_estimators={config.N_ESTIMATORS})...")
    rf_model = RandomForestClassifier(**config.RF_PARAMS)
    rf_model.fit(X_train_resampled, y_train_resampled)
    print("Heart Model training completed.")

    print("Evaluating model performance on untouched test dataset...")
    metrics = evaluate_model(
        model=rf_model,
        X_test=X_test_transformed,
        y_test=y_test,
        dataset_name=path_obj.name,
        n_train_samples=len(X_train_resampled),
        n_test_samples=len(X_test)
    )

    generate_feature_importance(rf_model, transformed_feature_names)

    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(rf_model, config.MODEL_PATH)
    print(f"Heart Model saved successfully to: {config.MODEL_PATH}")

    preprocessor.save(str(config.PREPROCESSOR_PATH))

    metadata = {
        "model_name": "Random Forest",
        "model_version": "heart_rf_v1",
        "dataset_name": path_obj.name,
        "target_column": target_col,
        "raw_features": feature_cols,
        "transformed_features": transformed_feature_names,
        "sampling_method": "SMOTE",
        "test_size": config.TEST_SIZE,
        "random_state": config.RANDOM_STATE,
        "n_estimators": config.N_ESTIMATORS,
        "training_samples_after_smote": len(X_train_resampled),
        "test_samples": len(X_test),
        "evaluation_accuracy": metrics["accuracy"],
        "evaluation_f1": metrics["f1_score"],
        "evaluation_auc": metrics["roc_auc"]
    }

    with open(config.METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=4)
    print(f"Heart Feature metadata saved successfully to: {config.METADATA_PATH}")

    return rf_model, preprocessor, metadata


if __name__ == "__main__":
    train_pipeline()
