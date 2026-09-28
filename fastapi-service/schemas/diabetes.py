from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List, Union


class DiabetesPredictionRequest(BaseModel):
    patient_id: Optional[str] = Field(default="P1001", description="Patient ID")
    features: Dict[str, Any] = Field(
        ...,
        description="Patient feature object containing required features (gender, age, hypertension, heart_disease, smoking_history, bmi, HbA1c_level, blood_glucose_level)"
    )


class DiabetesPredictionResponse(BaseModel):
    patient_id: Optional[str] = None
    disease: str = "Diabetes"
    prediction: Optional[int] = None
    risk_probability: Optional[float] = None
    risk_level: Optional[str] = None
    model: str = "Random Forest"
    model_version: str = "diabetes_rf_v1"
    status: Optional[str] = "success"
    missing_features: Optional[List[str]] = None
    message: Optional[str] = None
