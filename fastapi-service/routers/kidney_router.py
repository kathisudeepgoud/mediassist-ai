import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, status

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from schemas.kidney import KidneyPredictionRequest, KidneyPredictionResponse
from ml.kidney.predict import predict_kidney_risk

router = APIRouter(prefix="/api/ml/kidney", tags=["Kidney ML Prediction"])


@router.post("/predict", response_model=KidneyPredictionResponse)
def predict_kidney(payload: KidneyPredictionRequest):
    """
    Generate Chronic Kidney Disease (CKD) Risk Prediction using Random Forest ML Model.
    """
    try:
        if not payload.features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Features object cannot be empty."
            )

        res = predict_kidney_risk(payload.features)
        res["patient_id"] = payload.patient_id
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kidney ML prediction error: {str(e)}"
        )
