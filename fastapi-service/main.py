import os
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

from routers.health_router import router as health_router
from routers.parser_router import router as parser_router
from routers.explainer_router import router as explainer_router
from routers.diabetes_router import router as diabetes_router
from routers.cbc_router import router as cbc_router
from routers.heart_router import router as heart_router
from routers.kidney_router import router as kidney_router
from routers.liver_router import router as liver_router
from routers.diet_router import router as diet_router, load_local_ifct_foods
from services.model_status_service import ModelStatusService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload AI models and IFCT food dataset in background
    asyncio.create_task(ModelStatusService.preload_models())
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, load_local_ifct_foods)
    yield

app = FastAPI(
    title="MedAssist AI - FastAPI Service",
    description="Python backend microservice for MedAssist AI",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router)
app.include_router(parser_router)
app.include_router(explainer_router)
app.include_router(diabetes_router)
app.include_router(cbc_router)
app.include_router(heart_router)
app.include_router(kidney_router)
app.include_router(liver_router)
app.include_router(diet_router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, timeout_keep_alive=30)

