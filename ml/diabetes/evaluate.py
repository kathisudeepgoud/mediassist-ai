"""
Model Evaluation Module for Diabetes Risk Analysis ML Pipeline
MedAssist AI Project
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict

import joblib
import matplotlib
matplotlib.use('Agg')  # Headless rendering
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split

MODULE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = MODULE_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.diabetes import config
from ml.diabetes.preprocessing import DiabetesDataPreprocessor


def evaluate_model(
    model: Any,
    X_test: Any,
    y_test: Any,
    dataset_name: str = "diabetes_prediction_dataset.csv",
    n_train_samples: int = 0,
    n_test_samples: int = 0,
    save_results: bool = True
) -> Dict[str, Any]:
    """
    Evaluates trained model exclusively on the test set X_test, y_test.
    Calculates exact metrics, displays formatted output report, and saves visual artifacts.
    """
    config.RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    y_test_arr = np.asarray(y_test)
    y_pred = model.predict(X_test)
    
    if hasattr(model, "predict_proba"):
        prob = model.predict_proba(X_test)
        if hasattr(prob, "ndim") and prob.ndim == 2 and prob.shape[1] > 1:
            y_prob = prob[:, 1]
        else:
            y_prob = np.asarray(prob).ravel()
    else:
        y_prob = y_pred

    acc = float(accuracy_score(y_test_arr, y_pred))
    prec = float(precision_score(y_test_arr, y_pred, zero_division=0))
    rec = float(recall_score(y_test_arr, y_pred, zero_division=0))
    f1 = float(f1_score(y_test_arr, y_pred, zero_division=0))

    try:
        auc = float(roc_auc_score(y_test_arr, y_prob)) if len(np.unique(y_test_arr)) > 1 else 0.0
    except Exception:
        auc = 0.0

    cm = confusion_matrix(y_test_arr, y_pred, labels=[0, 1])
    tn = int(cm[0, 0])
    fp = int(cm[0, 1])
    fn = int(cm[1, 0])
    tp = int(cm[1, 1])

    metrics = {
        "dataset": dataset_name,
        "training_samples": n_train_samples,
        "testing_samples": n_test_samples or len(y_test_arr),
        "smote_enabled": True,
        "random_forest_trees": getattr(model, "n_estimators", config.N_ESTIMATORS),
        "accuracy": acc,
        "accuracy_pct": f"{acc * 100:.2f}%",
        "precision": prec,
        "precision_pct": f"{prec * 100:.2f}%",
        "recall": rec,
        "recall_pct": f"{rec * 100:.2f}%",
        "f1_score": f1,
        "f1_score_pct": f"{f1 * 100:.2f}%",
        "roc_auc": auc,
        "roc_auc_pct": f"{auc * 100:.2f}%",
        "confusion_matrix": {
            "true_negative": tn,
            "false_positive": fp,
            "false_negative": fn,
            "true_positive": tp,
            "matrix": cm.tolist()
        }
    }

    print("\n" + "=" * 40)
    print("DIABETES RANDOM FOREST MODEL EVALUATION")
    print("=" * 40)
    print(f"\nDataset:\n{dataset_name}")
    print(f"\nTraining Samples:\n{metrics['training_samples']}")
    print(f"\nTesting Samples:\n{metrics['testing_samples']}")
    print(f"\nSMOTE:\nEnabled")
    print(f"\nRandom Forest:\nEnabled")
    print(f"\nNumber of Trees:\n{metrics['random_forest_trees']}")
    print(f"\nAccuracy:\n{metrics['accuracy_pct']}")
    print(f"\nPrecision:\n{metrics['precision_pct']}")
    print(f"\nRecall:\n{metrics['recall_pct']}")
    print(f"\nF1 Score:\n{metrics['f1_score_pct']}")
    print(f"\nROC-AUC:\n{metrics['roc_auc_pct']}")
    print(f"\nConfusion Matrix:\n")
    print(f"[[{tn:5d} {fp:5d}]")
    print(f" [{fn:5d} {tp:5d}]]")
    print("\n" + "=" * 40 + "\n")

    if save_results:
        with open(config.METRICS_PATH, "w") as f:
            json.dump(metrics, f, indent=4)

        plt.figure(figsize=(6, 5))
        sns.heatmap(
            cm, annot=True, fmt="d", cmap="Blues", cbar=False,
            xticklabels=["No Diabetes (0)", "Diabetes (1)"],
            yticklabels=["No Diabetes (0)", "Diabetes (1)"]
        )
        plt.title("Confusion Matrix - Diabetes Random Forest", fontsize=12, fontweight='bold')
        plt.xlabel("Predicted Label")
        plt.ylabel("True Label")
        plt.tight_layout()
        plt.savefig(config.CONFUSION_MATRIX_PATH, dpi=300)
        plt.close()

        plt.figure(figsize=(7, 5))
        try:
            if len(np.unique(y_test_arr)) > 1:
                fpr, tpr, _ = roc_curve(y_test_arr, y_prob)
                plt.plot(fpr, tpr, color='#2563EB', lw=2, label=f'ROC Curve (AUC = {auc:.4f})')
            else:
                plt.plot([0, 1], [0, 1], color='#2563EB', lw=2, label='ROC Curve (Undefined)')
        except Exception:
            plt.plot([0, 1], [0, 1], color='#2563EB', lw=2, label='ROC Curve (Error)')

        plt.plot([0, 1], [0, 1], color='#9CA3AF', lw=1.5, linestyle='--', label='Random Classifier')
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate (1 - Specificity)')
        plt.ylabel('True Positive Rate (Sensitivity / Recall)')
        plt.title('Receiver Operating Characteristic (ROC) Curve', fontsize=12, fontweight='bold')
        plt.legend(loc="lower right")
        plt.grid(True, linestyle=':', alpha=0.6)
        plt.tight_layout()
        plt.savefig(config.ROC_CURVE_PATH, dpi=300)
        plt.close()

    return metrics


def main() -> None:
    """Standalone model evaluation entry point."""
    if not config.MODEL_PATH.exists():
        print(f"Model not found at {config.MODEL_PATH}. Please run train.py first.")
        return

    print("Loading diabetes model artifacts...")
    model = joblib.load(config.MODEL_PATH)
    preprocessor = DiabetesDataPreprocessor.load(str(config.PREPROCESSOR_PATH))

    dataset_path = Path(config.DATASET_PATH)
    if not dataset_path.exists():
        print(f"Dataset not found at {dataset_path}.")
        return

    df_raw = pd.read_csv(dataset_path)
    df_clean, _ = preprocessor.clean_raw_dataframe(df_raw)
    target_col = config.TARGET_COLUMN if config.TARGET_COLUMN in df_clean.columns else 'diabetes'

    feature_cols = [
        col for col in df_clean.columns
        if col != target_col and col.lower() not in config.IDENTIFIER_COLUMNS
    ]

    X = df_clean[feature_cols].copy()
    y = df_clean[target_col].copy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=config.TEST_SIZE,
        random_state=config.RANDOM_STATE,
        stratify=y
    )

    n_train_samples = len(X_train)
    if config.METADATA_PATH.exists():
        try:
            with open(config.METADATA_PATH, "r") as f:
                meta = json.load(f)
                n_train_samples = meta.get("training_samples_after_smote", n_train_samples)
        except Exception:
            pass

    X_test_transformed = preprocessor.transform(X_test)
    evaluate_model(
        model=model,
        X_test=X_test_transformed,
        y_test=y_test,
        dataset_name=dataset_path.name,
        n_train_samples=n_train_samples,
        n_test_samples=len(X_test)
    )


if __name__ == "__main__":
    main()
