from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str
    service: str
    message: str
    timestamp: str
    environment: str
