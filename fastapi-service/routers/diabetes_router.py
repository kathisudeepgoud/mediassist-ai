import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, status

# Add project root directory to sys.path to enable importing ml.diabetes module
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from schemas.diabetes import DiabetesPredictionRequest, DiabetesPredictionResponse
from ml.diabetes.predict import predict_diabetes_risk


router = APIRouter(prefix="/api/ml/diabetes", tags=["Diabetes ML Prediction"])


@router.post("/predict", response_model=DiabetesPredictionResponse)
def predict_diabetes(payload: DiabetesPredictionRequest):
    """
    Generate Diabetes Risk Prediction using Random Forest ML Model.
    Input: Patient ID and numerical/categorical patient feature values.
    Output: Risk Probability, Binary Prediction, and Risk Level (Low/Moderate/High).
    """
    try:
        if not payload.features:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Features object cannot be empty."
            )

        res = predict_diabetes_risk(payload.features)

        # Include patient_id in output
        res["patient_id"] = payload.patient_id
        return res
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diabetes ML prediction error: {str(e)}"
        )
