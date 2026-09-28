import os
from datetime import datetime
from schemas.health import HealthResponse

class HealthService:
    @staticmethod
    def check_health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            service="FastAPI Python Service",
            message="FastAPI backend is healthy",
            timestamp=datetime.now().isoformat(),
            environment=os.getenv("ENVIRONMENT", "development")
        )
