from fastapi import APIRouter
from schemas.health import HealthResponse
from services.health_service import HealthService
from services.model_status_service import ModelStatusService

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("", response_model=HealthResponse)
async def get_health():
    return HealthService.check_health()

@router.get("/model-status")
async def get_model_status():
    return ModelStatusService.get_status()


