from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List


class LiverPredictionRequest(BaseModel):
    patient_id: Optional[str] = Field(default="P1001", description="Patient ID")
    features: Dict[str, Any] = Field(
        ...,
        description="Liver feature object containing required features (Age, Gender, Total_Bilirubin, Direct_Bilirubin, Alkaline_Phosphotase, Alamine_Aminotransferase, Aspartate_Aminotransferase, Total_Protiens, Albumin, Albumin_and_Globulin_Ratio)"
    )


class LiverPredictionResponse(BaseModel):
    patient_id: Optional[str] = None
    disease: str = "Liver Disease"
    prediction: Optional[int] = None
    risk_probability: Optional[float] = None
    risk_level: Optional[str] = None
    model: str = "Random Forest"
    model_version: str = "liver_rf_v1"
    status: Optional[str] = "success"
    missing_features: Optional[List[str]] = None
    message: Optional[str] = None
