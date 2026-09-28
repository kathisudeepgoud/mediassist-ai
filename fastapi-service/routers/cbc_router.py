import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, status

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from schemas.cbc import CBCPredictionRequest, CBCPredictionResponse
from ml.cbc.predict import predict_cbc_risk

router = APIRouter(prefix="/api/ml/cbc", tags=["CBC ML Prediction"])


@router.post("/predict", response_model=CBCPredictionResponse)
def predict_cbc(payload: CBCPredictionRequest):
    """
    Generate CBC Anemia & Hematology Risk Prediction using Random Forest ML Model.
    """
    try:
        if not payload.features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Features object cannot be empty."
            )

        res = predict_cbc_risk(payload.features)
        res["patient_id"] = payload.patient_id
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"CBC ML prediction error: {str(e)}"
        )
