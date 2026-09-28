from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List


class CBCPredictionRequest(BaseModel):
    patient_id: Optional[str] = Field(default="P1001", description="Patient ID")
    features: Dict[str, Any] = Field(
        ...,
        description="CBC lab feature object containing required features (WBC, LYMp, NEUTp, LYMn, NEUTn, RBC, HGB, HCT, MCV, MCH, MCHC, PLT, PDW, PCT)"
    )


class CBCPredictionResponse(BaseModel):
    patient_id: Optional[str] = None
    disease: str = "CBC Anemia & Hematology Risk"
    prediction: Optional[int] = None
    risk_probability: Optional[float] = None
    risk_level: Optional[str] = None
    model: str = "Random Forest"
    model_version: str = "cbc_rf_v1"
    status: Optional[str] = "success"
    missing_features: Optional[List[str]] = None
    message: Optional[str] = None
