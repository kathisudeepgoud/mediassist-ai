"""
Feature Importance & Model Explanation Module for Diabetes Risk Analysis ML Pipeline
MedAssist AI Project
"""

import json
import sys
from pathlib import Path
from typing import Any, List, Optional

import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

MODULE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = MODULE_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.diabetes import config


def generate_feature_importance(
    model: Any,
    feature_names: Optional[List[str]] = None,
    save_plot: bool = True,
    save_results: bool = True
) -> pd.DataFrame:
    """
    Extracts feature importances from trained Random Forest model,
    prints sorted table, and saves feature_importance.png visual artifact.
    """
    if not hasattr(model, "feature_importances_"):
        print("Warning: Model does not provide feature_importances_ attribute.")
        return pd.DataFrame(columns=['Feature', 'Importance'])

    importances = model.feature_importances_
    n_features = len(importances)

    if feature_names is None or len(feature_names) == 0:
        names = [f"Feature_{i}" for i in range(n_features)]
    else:
        names = list(feature_names)
        if len(names) < n_features:
            names.extend([f"Feature_{i}" for i in range(len(names), n_features)])
        elif len(names) > n_features:
            names = names[:n_features]

    df_importance = pd.DataFrame({
        'Feature': names,
        'Importance': importances
    }).sort_values(by='Importance', ascending=False).reset_index(drop=True)

    print("\n" + "=" * 45)
    print("RANDOM FOREST FEATURE IMPORTANCE ANALYSIS")
    print("=" * 45)
    print(f"\n{'Feature':<30} | {'Importance':<10}")
    print("-" * 45)
    for _, row in df_importance.head(15).iterrows():
        print(f"{row['Feature']:<30} | {row['Importance']:.6f}")
    print("=" * 45)
    print("\n[Disclaimer]: This feature ranking indicates feature influence in the trained model's")
    print("classification logic. It reflects statistical patterns in the dataset and does NOT imply")
    print("direct medical causation.\n")

    if save_plot or save_results:
        config.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        top_df = df_importance.head(15)
        plt.figure(figsize=(9, max(5, len(top_df) * 0.35)))
        sns.barplot(
            data=top_df,
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


def main() -> None:
    """Standalone feature importance explanation entry point."""
    if not config.MODEL_PATH.exists():
        print(f"Model not found at {config.MODEL_PATH}. Please run train.py first.")
        return

    print("Loading diabetes model artifacts...")
    model = joblib.load(config.MODEL_PATH)

    feature_names = []
    if config.METADATA_PATH.exists():
        with open(config.METADATA_PATH, "r") as f:
            metadata = json.load(f)
            feature_names = metadata.get("transformed_features", [])

    generate_feature_importance(model, feature_names=feature_names)


if __name__ == "__main__":
    main()
