import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, status

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from schemas.liver import LiverPredictionRequest, LiverPredictionResponse
from ml.liver.predict import predict_liver_risk

router = APIRouter(prefix="/api/ml/liver", tags=["Liver ML Prediction"])


@router.post("/predict", response_model=LiverPredictionResponse)
def predict_liver(payload: LiverPredictionRequest):
    """
    Generate Liver Disease Risk Prediction using Random Forest ML Model.
    """
    try:
        if not payload.features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Features object cannot be empty."
            )

        res = predict_liver_risk(payload.features)
        res["patient_id"] = payload.patient_id
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Liver ML prediction error: {str(e)}"
        )
