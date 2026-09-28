"""
Master Training Script for MedAssist AI Multi-Organ Disease ML Pipeline
Trains Diabetes, CBC, Heart, Kidney, and Liver Random Forest + SMOTE models.
"""

import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.diabetes.train import train_pipeline as train_diabetes
from ml.cbc.train import train_pipeline as train_cbc
from ml.heart.train import train_pipeline as train_heart
from ml.kidney.train import train_pipeline as train_kidney
from ml.liver.train import train_pipeline as train_liver


def train_all():
    print("\n" + "=" * 65)
    print("  MEDASSIST AI MULTI-ORGAN DISEASE ML TRAINING SUITE")
    print("=" * 65 + "\n")

    start_time = time.time()
    results = {}

    pipelines = [
        ("Diabetes", train_diabetes),
        ("CBC Anemia", train_cbc),
        ("Heart Disease", train_heart),
        ("Chronic Kidney Disease", train_kidney),
        ("Liver Disease", train_liver),
    ]

    for name, train_fn in pipelines:
        print(f"\n>>> TRAINING MODEL: {name.upper()} <<<")
        try:
            model, preprocessor, metadata = train_fn()
            results[name] = {
                "status": "SUCCESS",
                "accuracy": f"{metadata.get('evaluation_accuracy', 0) * 100:.2f}%",
                "f1_score": f"{metadata.get('evaluation_f1', 0) * 100:.2f}%",
                "roc_auc": f"{metadata.get('evaluation_auc', 0) * 100:.2f}%",
                "samples": metadata.get("training_samples_after_smote", 0)
            }
        except Exception as e:
            results[name] = {
                "status": "FAILED",
                "error": str(e)
            }

    elapsed = time.time() - start_time

    print("\n" + "=" * 65)
    print("  TRAINING SUMMARY RESULTS")
    print("=" * 65)
    print(f"Total time elapsed: {elapsed:.2f} seconds\n")
    print(f"{'MODEL':<25} | {'STATUS':<8} | {'ACCURACY':<10} | {'F1-SCORE':<10} | {'ROC-AUC':<10}")
    print("-" * 75)
    for model_name, res in results.items():
        if res["status"] == "SUCCESS":
            print(f"{model_name:<25} | {res['status']:<8} | {res['accuracy']:<10} | {res['f1_score']:<10} | {res['roc_auc']:<10}")
        else:
            print(f"{model_name:<25} | {res['status']:<8} | FAILED: {res.get('error')}")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    train_all()
