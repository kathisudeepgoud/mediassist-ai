from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List


class HeartPredictionRequest(BaseModel):
    patient_id: Optional[str] = Field(default="P1001", description="Patient ID")
    features: Dict[str, Any] = Field(
        ...,
        description="Heart feature object containing required features (male, age, currentSmoker, cigsPerDay, BPMeds, prevalentStroke, prevalentHyp, diabetes, totChol, sysBP, diaBP, BMI, heartRate, glucose)"
    )


class HeartPredictionResponse(BaseModel):
    patient_id: Optional[str] = None
    disease: str = "Cardiovascular (Heart) Disease"
    prediction: Optional[int] = None
    risk_probability: Optional[float] = None
    risk_level: Optional[str] = None
    model: str = "Random Forest"
    model_version: str = "heart_rf_v1"
    status: Optional[str] = "success"
    missing_features: Optional[List[str]] = None
    message: Optional[str] = None
