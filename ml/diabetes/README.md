# Diabetes Risk Analysis Module – MedAssist AI

This module implements the end-to-end **Diabetes Risk Analysis Machine Learning Pipeline** for MedAssist AI using **SMOTE (Synthetic Minority Over-sampling Technique)** and a **Random Forest Classifier**.

> **Dataset Declaration**:
> The MedAssist AI diabetes-risk model is trained exclusively using the project team's provided diabetes dataset (`ml/diabetes/dataset/diabetes_prediction_dataset.csv`). No public or external datasets were downloaded or merged.

---

## 1. Dataset Overview & Inspection

The dataset consists of **100,000 patient records** with 8 input feature columns and 1 binary target column (`diabetes`):

| Feature Column | Data Type | Description |
| :--- | :--- | :--- |
| `gender` | `object` | Patient biological sex (`Female`, `Male`, `Other`) |
| `age` | `float64` | Patient age in years |
| `hypertension` | `int64` | Binary indicator (0 = No, 1 = Yes) |
| `heart_disease` | `int64` | Binary indicator (0 = No, 1 = Yes) |
| `smoking_history` | `object` | Categorical history (`never`, `No Info`, `current`, `former`, `ever`, `not current`) |
| `bmi` | `float64` | Body Mass Index ($\text{kg/m}^2$) |
| `HbA1c_level` | `float64` | Glycated Hemoglobin level (%) |
| `blood_glucose_level` | `int64` | Blood glucose concentration (mg/dL) |
| **`diabetes`** *(Target)* | `int64` | Binary outcome (0 = Non-diabetic, 1 = Diabetic) |

- **Original Class Distribution**:
  - `0` (Non-diabetic): 91,500 rows (91.5%)
  - `1` (Diabetic): 8,500 rows (8.5%)
- **Duplicates Removed**: 3,854 duplicate rows automatically dropped during cleaning.

---

## 2. Reproducible Preprocessing Pipeline

To eliminate data leakage, all learned preprocessing transformations are fitted **exclusively on the training split**:

```text
Provided Dataset (100,000 rows)
       │
       ▼
Data Cleaning (Duplicate removal, Inf/NaN replacement)
       │
       ▼
Stratified Train/Test Split (80% Train / 20% Test)
       │
       ├────────────────────────────────────────┐
       ▼                                        ▼
Training Data (76,916 rows)             Testing Data (19,230 rows)
       │                                        │
       ▼                                        │
Fit Preprocessor Pipeline                       │
- Numerical: Median Imputer + StandardScaler    │
- Categorical: Mode Imputer + OneHotEncoder     │
       │                                        │
       ▼                                        │
Transform Train Features                        │
       │                                        │
       ▼                                        │
SMOTE Resampling (Train Only)                   │
- Before SMOTE: 70,130 (0) /  6,786 (1)         │
- After SMOTE:  70,130 (0) / 70,130 (1)         │
       │                                        │
       ▼                                        ▼
Train Random Forest (200 Trees) ◄──────── Transform Test Features (Untouched)
       │                                        │
       ▼                                        ▼
Save Model & Preprocessor Artifacts      Evaluate Performance Metrics
```

---

## 3. Model Architecture & Hyperparameters

- **Algorithm**: `RandomForestClassifier` (`sklearn.ensemble`)
- **Number of Trees (`n_estimators`)**: `200`
- **Criterion**: Gini Impurity
- **Max Features**: `sqrt`
- **Random State**: `42`
- **Class Balancing**: SMOTE (`imblearn.over_sampling`) applied to training split.

---

## 4. Model Evaluation & Performance

Evaluated strictly on the **19,230 untouched test samples**:

```text
========================================
DIABETES RANDOM FOREST MODEL EVALUATION
========================================

Dataset:
diabetes_prediction_dataset.csv

Training Samples:
140,260 (after SMOTE)

Testing Samples:
19,230

SMOTE:
Enabled

Random Forest:
Enabled (200 Trees)

Accuracy:     95.64%
Precision:    75.19%
Recall:       75.41%
F1 Score:     75.30%
ROC-AUC:      96.39%

Confusion Matrix:
[[17112   422]
 [  417  1279]]
========================================
```

### Confusion Matrix Breakdown:
- **True Negative (TN = 17,112)**: Non-diabetic patients correctly classified as low risk.
- **False Positive (FP = 422)**: Non-diabetic patients flagged as higher risk.
- **False Negative (FN = 417)**: Diabetic patients misclassified as low risk.
- **True Positive (TP = 1,279)**: Diabetic patients correctly identified as high risk.

> **Clinical Significance of False Negatives**:
> Minimizing False Negatives is critical in medical screening applications because a false negative could delay diagnosis. The SMOTE-balanced Random Forest achieves a **75.41% Recall** and **96.39% ROC-AUC**, ensuring robust sensitivity while retaining **95.64% overall accuracy**.

---

## 5. Relative Feature Importance

Extracted from Gini importance scores (`model.feature_importances_`):

1. **`HbA1c_level`**: 36.95%
2. **`blood_glucose_level`**: 27.82%
3. **`age`**: 18.13%
4. **`bmi`**: 10.74%
5. **`hypertension`**: 2.25%
6. **`heart_disease`**: 1.26%
7. **`smoking_history`**: 2.38% (total across encoded levels)
8. **`gender`**: 0.52% (total across encoded levels)

*Disclaimer: Feature importance scores represent statistical influence in classification and do NOT imply direct medical causation.*

---

## 6. Execution Commands

### Train Model & Save Artifacts
```bash
python ml/diabetes/train.py
```

### Test Standalone Inference
```bash
python ml/diabetes/predict.py
```

### Run Automated Unit Tests
```bash
pytest ml/diabetes/tests/test_diabetes_model.py -v
```

---

## 7. Saved Artifacts Location

- Trained Model: `ml/diabetes/models/diabetes_random_forest.pkl`
- Fitted Preprocessor: `ml/diabetes/models/preprocessing.pkl`
- Feature Metadata: `ml/diabetes/models/feature_metadata.json`
- Visual Evaluation Graphs:
  - `results/confusion_matrix.png`
  - `results/roc_curve.png`
  - `results/feature_importance.png`
  - `results/metrics.json`

---

## 8. Safety & Clinical Disclaimer

The MedAssist AI Diabetes ML module produces a machine-learning-based statistical risk probability estimate. **It does not constitute a clinical medical diagnosis.** All model outputs should be evaluated by qualified healthcare professionals alongside comprehensive diagnostic testing.
