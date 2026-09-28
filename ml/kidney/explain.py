"""
Feature Importance Explanation Module for Kidney Disease ML Pipeline
MedAssist AI Project
"""

import sys
import json
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

try:
    import config
except ImportError:
    from ml.kidney import config


def generate_feature_importance(model, feature_names: list, save_results: bool = True) -> dict:
    if not hasattr(model, "feature_importances_"):
        return {}

    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]

    feature_ranking = []
    for rank, idx in enumerate(indices, 1):
        name = feature_names[idx] if idx < len(feature_names) else f"feature_{idx}"
        val = float(importances[idx])
        feature_ranking.append({
            "rank": rank,
            "feature": name,
            "importance": round(val, 5),
            "importance_pct": f"{val * 100:.2f}%"
        })

    if save_results:
        config.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        top_features = feature_ranking[:15]
        names = [f["feature"] for f in top_features][::-1]
        vals = [f["importance"] for f in top_features][::-1]

        plt.figure(figsize=(8, 6))
        plt.barh(names, vals, color='#7C3AED', edgecolor='#6D28D9')
        plt.xlabel("Gini Feature Importance")
        plt.title("Kidney Disease Random Forest - Feature Importance", fontsize=12, fontweight='bold')
        plt.tight_layout()
        plt.savefig(config.FEATURE_IMPORTANCE_PATH, dpi=300)
        plt.close()

    return {"features": feature_ranking}
