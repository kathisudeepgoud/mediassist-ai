"""
Preprocessing Module for Liver Disease ML Pipeline
MedAssist AI Project
"""

import pandas as pd
import numpy as np
from typing import Tuple, List, Dict, Any
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
import joblib
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class LiverDataPreprocessor(BaseEstimator, TransformerMixin):
    """
    Reproducible preprocessing transformer for the Liver ML Pipeline.
    Fits feature transformers strictly on training data only.
    """
    def __init__(self, numeric_features: List[str] = None, categorical_features: List[str] = None):
        self.numeric_features = numeric_features or []
        self.categorical_features = categorical_features or []
        self.column_transformer: ColumnTransformer = None
        self.feature_names_out_: List[str] = []
        self.is_fitted: bool = False

    def clean_raw_dataframe(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
        df_clean = df.copy()
        df_clean = df_clean.replace([np.inf, -np.inf], np.nan)

        duplicates_count = int(df_clean.duplicated().sum())
        if duplicates_count > 0:
            df_clean = df_clean.drop_duplicates().reset_index(drop=True)
            logger.info(f"Removed {duplicates_count} duplicate row(s) from Liver dataset.")

        return df_clean, duplicates_count

    def detect_feature_types(self, X: pd.DataFrame) -> Tuple[List[str], List[str]]:
        numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = X.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
        return numeric_cols, categorical_cols

    def fit(self, X: pd.DataFrame, y: Any = None):
        if not self.numeric_features and not self.categorical_features:
            self.numeric_features, self.categorical_features = self.detect_feature_types(X)

        transformers = []

        if self.numeric_features:
            num_pipeline = Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler())
            ])
            transformers.append(('num', num_pipeline, self.numeric_features))

        if self.categorical_features:
            cat_pipeline = Pipeline([
                ('imputer', SimpleImputer(strategy='most_frequent')),
                ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
            ])
            transformers.append(('cat', cat_pipeline, self.categorical_features))

        self.column_transformer = ColumnTransformer(transformers=transformers, remainder='passthrough')
        self.column_transformer.fit(X)

        feature_names = []
        if self.numeric_features:
            feature_names.extend(self.numeric_features)
        if self.categorical_features:
            onehot = self.column_transformer.named_transformers_['cat'].named_steps['onehot']
            cat_out = onehot.get_feature_names_out(self.categorical_features).tolist()
            feature_names.extend(cat_out)

        self.feature_names_out_ = feature_names
        self.is_fitted = True
        return self

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("Preprocessor has not been fitted. Call fit() on training data first.")

        if isinstance(X, np.ndarray):
            X = pd.DataFrame(X)

        X_clean = X.replace([np.inf, -np.inf], np.nan)
        transformed = self.column_transformer.transform(X_clean)
        return transformed

    def fit_transform(self, X: pd.DataFrame, y: Any = None) -> np.ndarray:
        return self.fit(X, y).transform(X)

    def save(self, filepath: str):
        joblib.dump(self, filepath)
        logger.info(f"Liver Preprocessor saved successfully to: {filepath}")

    @staticmethod
    def load(filepath: str) -> 'LiverDataPreprocessor':
        preprocessor = joblib.load(filepath)
        logger.info(f"Liver Preprocessor loaded successfully from: {filepath}")
        return preprocessor
