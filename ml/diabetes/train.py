"""
Primary Training Script for Diabetes Risk Analysis ML Pipeline
MedAssist AI Project

Executes:
Provided Dataset Loading -> Automatic Dataset Inspection -> Cleaning -> Preprocessing Fit ->
Train/Test Split -> SMOTE on Train Set -> Random Forest Training -> Test Set Evaluation -> Artifact Saving
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
    from preprocessing import DiabetesDataPreprocessor
    from evaluate import evaluate_model
    from explain import generate_feature_importance
except ImportError:
    from ml.diabetes import config
    from ml.diabetes.preprocessing import DiabetesDataPreprocessor
    from ml.diabetes.evaluate import evaluate_model
    from ml.diabetes.explain import generate_feature_importance


def inspect_dataset(df: pd.DataFrame, dataset_path: str, target_col: str = None) -> Tuple[str, List[str]]:
    """
    Automatically inspects raw dataset and prints detailed dataset statistics.
    """
    print("\n" + "=" * 35)
    print("DIABETES DATASET INFORMATION")
    print("=" * 35)
    print(f"\nDataset path: {dataset_path}")
    print(f"Dataset shape: {df.shape}")
    print(f"Number of rows: {df.shape[0]}")
    print(f"Number of columns: {df.shape[1]}")

    print("\nColumns:")
    for col in df.columns:
        print(f" - {col}")

    print("\nData types:")
    print(df.dtypes.to_string())

    print("\nMissing values:")
    print(df.isnull().sum().to_string())

    duplicate_count = int(df.duplicated().sum())
    print(f"\nDuplicate rows: {duplicate_count}")

    # Determine Target Column
    if not target_col or target_col not in df.columns:
        # Check standard potential target column names
        candidates = ["diabetes", "Outcome", "target", "label", "diabetes_risk", "has_diabetes"]
        found = [c for c in candidates if c in df.columns]
        if found:
            target_col = found[0]
        else:
            print("\n" + "!" * 50)
            print("Target column could not be identified.")
            print("Please specify TARGET_COLUMN in config.py.")
            print("!" * 50 + "\n")
            sys.exit(1)

    print(f"\nTarget column: {target_col}")

    print("\nClass distribution:")
    print(df[target_col].value_counts().to_string())

    print("\nSample Rows (df.head()):")
    print(df.head())

    print("\nDataset Summary Statistics (df.describe()):")
    print(df.describe())
    print("=" * 35 + "\n")

    # Exclude target and identifier columns from input features
    features = [
        col for col in df.columns
        if col != target_col and col.lower() not in config.IDENTIFIER_COLUMNS
    ]

    print("\nFeatures used for training:")
    for i, feature in enumerate(features, 1):
        print(f"{i}. {feature}")
    print("\n")

    return target_col, features


def train_pipeline(dataset_path: str = None) -> Tuple[RandomForestClassifier, DiabetesDataPreprocessor, dict]:
    """
    Main training execution function.
    """
    target_path = dataset_path or config.DATASET_PATH
    print(f"Loading provided diabetes dataset from: {target_path} ...")

    path_obj = Path(target_path)
    if not path_obj.exists():
        raise FileNotFoundError(f"Provided dataset file not found at: {target_path}")

    # Read dataset
    df_raw = pd.read_csv(target_path)
    print("Dataset loaded successfully.")

    # 1. Dataset Inspection
    target_col, feature_cols = inspect_dataset(df_raw, target_path, config.TARGET_COLUMN)

    # 2. Data Cleaning
    preprocessor = DiabetesDataPreprocessor()
    df_clean, dups_removed = preprocessor.clean_raw_dataframe(df_raw)

    # Prepare X and y
    X = df_clean[feature_cols].copy()
    y = df_clean[target_col].copy()

    # 3. Train / Test Split (80/20 Stratified BEFORE SMOTE)
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

    # 4. Fit Preprocessing on Training Data ONLY
    print("Fitting preprocessing pipeline on training data ONLY...")
    X_train_transformed = preprocessor.fit_transform(X_train)
    X_test_transformed = preprocessor.transform(X_test)
    
    transformed_feature_names = preprocessor.feature_names_out_

    # 5. Apply SMOTE to Training Data ONLY
    print("\nApplying SMOTE resampling to training data ONLY...")
    print("\nTraining distribution BEFORE SMOTE")
    print(y_train.value_counts().to_string())

    smote = SMOTE(random_state=config.SMOTE_RANDOM_STATE)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train_transformed, y_train)

    print("\nTraining distribution AFTER SMOTE")
    print(y_train_resampled.value_counts().to_string())
    print("\nTest set remains completely untouched (original distribution preserved).\n")

    # 6. Train Random Forest Classifier
    print(f"Training Random Forest Classifier (n_estimators={config.N_ESTIMATORS})...")
    rf_model = RandomForestClassifier(**config.RF_PARAMS)
    rf_model.fit(X_train_resampled, y_train_resampled)
    print("Model training completed.")

    # 7. Evaluate on Untouched Test Set
    print("Evaluating model performance on untouched test dataset...")
    metrics = evaluate_model(
        model=rf_model,
        X_test=X_test_transformed,
        y_test=y_test,
        dataset_name=path_obj.name,
        n_train_samples=len(X_train_resampled),
        n_test_samples=len(X_test)
    )

    # 8. Feature Importance Analysis
    print("Generating feature importance analysis...")
    generate_feature_importance(rf_model, transformed_feature_names)

    # 9. Save Model Artifacts
    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Save Model
    joblib.dump(rf_model, config.MODEL_PATH)
    print(f"Model saved successfully to: {config.MODEL_PATH}")

    # Save Preprocessor
    preprocessor.save(str(config.PREPROCESSOR_PATH))

    # Save Feature Metadata JSON
    metadata = {
        "model_name": "Random Forest",
        "model_version": "diabetes_rf_v1",
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
    print(f"Feature metadata saved successfully to: {config.METADATA_PATH}")

    return rf_model, preprocessor, metadata


if __name__ == "__main__":
    train_pipeline()
