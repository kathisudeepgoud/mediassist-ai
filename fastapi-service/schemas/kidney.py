from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List


class KidneyPredictionRequest(BaseModel):
    patient_id: Optional[str] = Field(default="P1001", description="Patient ID")
    features: Dict[str, Any] = Field(
        ...,
        description="Kidney feature object containing required features (age, bp, sg, al, su, rbc, pc, pcc, ba, bgr, bu, sc, sod, pot, hemo, pcv, wc, rc, htn, dm, cad, appet, pe, ane)"
    )


class KidneyPredictionResponse(BaseModel):
    patient_id: Optional[str] = None
    disease: str = "Chronic Kidney Disease (CKD)"
    prediction: Optional[int] = None
    risk_probability: Optional[float] = None
    risk_level: Optional[str] = None
    model: str = "Random Forest"
    model_version: str = "kidney_rf_v1"
    status: Optional[str] = "success"
    missing_features: Optional[List[str]] = None
    message: Optional[str] = None
