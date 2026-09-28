"""
Feature Importance & Model Explanation Module for Diabetes Risk Analysis ML Pipeline
MedAssist AI Project
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from typing import List, Tuple
from pathlib import Path
import sys

MODULE_DIR = Path(__file__).resolve().parent
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

try:
    import config
except ImportError:
    from ml.diabetes import config


def generate_feature_importance(
    model,
    feature_names: List[str],
    save_plot: bool = True
) -> pd.DataFrame:
    """
    Extracts feature importances from trained Random Forest model,
    prints sorted table, and saves feature_importance.png visual artifact.
    """
    if not hasattr(model, "feature_importances_"):
        raise ValueError("Model does not provide feature_importances_ attribute.")

    importances = model.feature_importances_
    
    # Handle length mismatch gracefully if any
    if len(importances) != len(feature_names):
        feature_names = [f"Feature_{i}" for i in range(len(importances))]

    df_importance = pd.DataFrame({
        'Feature': feature_names,
        'Importance': importances
    }).sort_values(by='Importance', ascending=False).reset_index(drop=True)

    print("\n" + "=" * 45)
    print("RANDOM FOREST FEATURE IMPORTANCE ANALYSIS")
    print("=" * 45)
    print(f"\n{'Feature':<30} | {'Importance':<10}")
    print("-" * 45)
    for idx, row in df_importance.iterrows():
        print(f"{row['Feature']:<30} | {row['Importance']:.6f}")
    print("=" * 45)
    print("\n[Disclaimer]: This feature ranking indicates feature influence in the trained model's")
    print("classification logic. It reflects statistical patterns in the dataset and does NOT imply")
    print("direct medical causation.\n")

    if save_plot:
        config.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        plt.figure(figsize=(9, 6))
        sns.barplot(
            data=df_importance,
            x='Importance',
            y='Feature',
            hue='Feature',
            palette='viridis',
            legend=False
        )
        plt.title('Random Forest - Relative Feature Importance', fontsize=12, fontweight='bold')
        plt.xlabel('Gini Importance (Relative Weight)')
        plt.ylabel('Model Input Features')
        plt.grid(True, axis='x', linestyle=':', alpha=0.6)
        plt.tight_layout()
        plt.savefig(config.FEATURE_IMPORTANCE_PATH, dpi=300)
        plt.close()

    return df_importance
