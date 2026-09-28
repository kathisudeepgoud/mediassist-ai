"""
Model Evaluation Module for Diabetes Risk Analysis ML Pipeline
MedAssist AI Project
"""

import os
import json
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Headless rendering
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report, roc_curve
)

from pathlib import Path
import sys

MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

try:
    import config
except ImportError:
    from ml.diabetes import config


def evaluate_model(
    model,
    X_test,
    y_test,
    dataset_name: str = "diabetes_prediction_dataset.csv",
    n_train_samples: int = 0,
    n_test_samples: int = 0,
    save_results: bool = True
) -> dict:
    """
    Evaluates trained model exclusively on the untouched test set X_test, y_test.
    Calculates exact metrics, displays required output report, and saves visual artifacts.
    """
    # Create results directory if it doesn't exist
    config.RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    # Model predictions
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else y_pred

    # Compute core metrics
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_prob) if len(np.unique(y_test)) > 1 else 0.0
    cm = confusion_matrix(y_test, y_pred)

    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)

    # Format metrics dictionary
    metrics = {
        "dataset": dataset_name,
        "training_samples": n_train_samples,
        "testing_samples": n_test_samples or len(y_test),
        "smote_enabled": True,
        "random_forest_trees": getattr(model, "n_estimators", config.N_ESTIMATORS),
        "accuracy": float(acc),
        "accuracy_pct": f"{acc * 100:.2f}%",
        "precision": float(prec),
        "precision_pct": f"{prec * 100:.2f}%",
        "recall": float(rec),
        "recall_pct": f"{rec * 100:.2f}%",
        "f1_score": float(f1),
        "f1_score_pct": f"{f1 * 100:.2f}%",
        "roc_auc": float(auc),
        "roc_auc_pct": f"{auc * 100:.2f}%",
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp),
            "matrix": cm.tolist()
        }
    }

    # Print Formatted Output Report (per Section 14)
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
        # Save metrics.json
        with open(config.METRICS_PATH, "w") as f:
            json.dump(metrics, f, indent=4)

        # 1. Plot and save Confusion Matrix
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

        # 2. Plot and save ROC Curve
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        plt.figure(figsize=(7, 5))
        plt.plot(fpr, tpr, color='#2563EB', lw=2, label=f'ROC Curve (AUC = {auc:.4f})')
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
