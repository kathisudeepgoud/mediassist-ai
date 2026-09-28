import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

logger = logging.getLogger(__name__)

# Global Model State Object
_MODEL_STATE: Dict[str, Any] = {
    "model_status": "loading",  # "loading" | "ready" | "error"
    "message": "AI Model initializing...",
    "model_name": "SentenceTransformer (all-MiniLM-L6-v2)",
    "loaded_at": None,
    "error_details": None
}

class ModelStatusService:
    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Returns current AI model state."""
        return {
            "status": "ok",
            "model_status": _MODEL_STATE["model_status"],
            "is_ready": _MODEL_STATE["model_status"] == "ready",
            "message": _MODEL_STATE["message"],
            "model_name": _MODEL_STATE["model_name"],
            "loaded_at": _MODEL_STATE["loaded_at"],
            "error": _MODEL_STATE["error_details"],
            "timestamp": datetime.now().isoformat()
        }

    @classmethod
    def set_ready(cls, message: str = "AI Model loaded successfully"):
        _MODEL_STATE["model_status"] = "ready"
        _MODEL_STATE["message"] = message
        _MODEL_STATE["loaded_at"] = datetime.now().isoformat()
        _MODEL_STATE["error_details"] = None
        logger.info(f"[ModelStatusService] State set to READY: {message}")

    @classmethod
    def set_error(cls, error_msg: str):
        _MODEL_STATE["model_status"] = "error"
        _MODEL_STATE["message"] = f"AI Model Error: {error_msg}"
        _MODEL_STATE["error_details"] = error_msg
        logger.error(f"[ModelStatusService] State set to ERROR: {error_msg}")

    @classmethod
    async def preload_models(cls):
        """Asynchronously pre-loads AI & ML models during FastAPI startup."""
        try:
            logger.info("[ModelStatusService] Initiating async AI/ML model pre-loading...")
            _MODEL_STATE["model_status"] = "loading"
            _MODEL_STATE["message"] = "Loading AI models and ML predictors into memory..."

            loop = asyncio.get_running_loop()

            def _load_all_sync():
                # 1. Preload embedding model
                try:
                    from services.candidate_classifier import CandidateClassifier
                    CandidateClassifier._get_sentence_model()
                except Exception as e:
                    logger.warning(f"CandidateClassifier preload note: {e}")

                # 2. Preload Random Forest ML models
                for ml_mod in ["diabetes", "kidney", "liver", "cbc", "heart"]:
                    try:
                        mod = __import__(f"ml.{ml_mod}.predict", fromlist=["load_artifacts"])
                        if hasattr(mod, "load_artifacts"):
                            mod.load_artifacts()
                    except Exception as me:
                        logger.warning(f"ML model {ml_mod} preload note: {me}")

            await loop.run_in_executor(None, _load_all_sync)
            cls.set_ready()
        except Exception as e:
            cls.set_error(str(e))
