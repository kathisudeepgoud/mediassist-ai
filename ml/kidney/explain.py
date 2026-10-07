"""
Feature Importance Explanation Module for Kidney Disease ML Pipeline
MedAssist AI Project
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

MODULE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = MODULE_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.kidney import config


def generate_feature_importance(
    model: Any,
    feature_names: Optional[List[str]] = None,
    save_results: bool = True,
    save_plot: bool = True
) -> Dict[str, Any]:
    """
    Extracts feature importances from trained model, prints formatted feature ranking,
    and saves feature_importance.png visual artifact.
    """
    if not hasattr(model, "feature_importances_"):
        print("Warning: Model does not have feature_importances_ attribute.")
        return {"features": []}

    importances = model.feature_importances_
    n_features = len(importances)

    if feature_names is None or len(feature_names) == 0:
        names = [f"feature_{i}" for i in range(n_features)]
    else:
        names = list(feature_names)
        if len(names) < n_features:
            names.extend([f"feature_{i}" for i in range(len(names), n_features)])
        elif len(names) > n_features:
            names = names[:n_features]

    indices = np.argsort(importances)[::-1]

    feature_ranking = []
    for rank, idx in enumerate(indices, 1):
        name = names[idx]
        val = float(importances[idx])
        feature_ranking.append({
            "rank": rank,
            "feature": name,
            "importance": round(val, 5),
            "importance_pct": f"{val * 100:.2f}%"
        })

    print("\n" + "=" * 45)
    print("KIDNEY DISEASE FEATURE IMPORTANCE ANALYSIS")
    print("=" * 45)
    print(f"\n{'Rank':<5} | {'Feature':<28} | {'Importance':<10}")
    print("-" * 45)
    for f in feature_ranking[:15]:
        print(f"{f['rank']:<5} | {f['feature']:<28} | {f['importance_pct']:<10}")
    print("=" * 45 + "\n")

    if save_results or save_plot:
        config.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        top_features = feature_ranking[:15]
        plot_names = [f["feature"] for f in top_features][::-1]
        plot_vals = [f["importance"] for f in top_features][::-1]

        plt.figure(figsize=(8, max(5, len(plot_names) * 0.35)))
        plt.barh(plot_names, plot_vals, color='#7C3AED', edgecolor='#6D28D9')
        plt.xlabel("Gini Feature Importance")
        plt.title("Kidney Disease Random Forest - Feature Importance", fontsize=12, fontweight='bold')
        plt.grid(True, axis='x', linestyle=':', alpha=0.6)
        plt.tight_layout()
        plt.savefig(config.FEATURE_IMPORTANCE_PATH, dpi=300)
        plt.close()

    return {"features": feature_ranking}


def main() -> None:
    """Standalone feature importance explanation entry point."""
    if not config.MODEL_PATH.exists():
        print(f"Model not found at {config.MODEL_PATH}. Please run train.py first.")
        return

    print("Loading kidney model artifacts...")
    model = joblib.load(config.MODEL_PATH)

    feature_names = []
    if config.METADATA_PATH.exists():
        with open(config.METADATA_PATH, "r") as f:
            metadata = json.load(f)
            feature_names = metadata.get("transformed_features", [])

    generate_feature_importance(model, feature_names=feature_names)


if __name__ == "__main__":
    main()
