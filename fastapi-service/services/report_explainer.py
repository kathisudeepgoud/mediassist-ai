"""
Report Explainer Service (FastAPI)
Note: MedAssist AI now uses the central Google Gemini API from the Express backend.
This module provides safe schema responses without making any external or local daemon calls.
"""

import logging
from typing import Dict, Any, AsyncGenerator
from schemas.explainer import ExplainReportResponse

logger = logging.getLogger(__name__)

class ReportExplainerService:
    @classmethod
    def _normalize_input_data(cls, report_data: Dict[str, Any]) -> Dict[str, Any]:
        params = report_data.get("parameters") or report_data.get("vitals") or []
        normalized_params = []
        for p in params:
            name = p.get("name") or p.get("label") or p.get("parameter") or ""
            if name.strip():
                normalized_params.append({
                    "name": name.strip(),
                    "value": p.get("value"),
                    "unit": p.get("unit", ""),
                    "referenceRange": p.get("referenceRange") or p.get("reference_range") or "",
                    "status": p.get("status", "normal")
                })
        return {"parameters": normalized_params}

    @classmethod
    async def generate_explanation(
        cls,
        report_data: Dict[str, Any],
        max_retries: int = 1
    ) -> ExplainReportResponse:
        """
        Report explanations are generated centrally via the Express Gemini backend service.
        """
        normalized_json = cls._normalize_input_data(report_data)
        return ExplainReportResponse(
            overall_summary="Report parameters extracted. Explanations are generated via Gemini AI on the backend.",
            parameter_explanations=[],
            lifestyle_suggestions=[],
            questions_for_doctor=[],
            disclaimer="This explanation is for educational purposes only and is not a medical diagnosis."
        )

    @classmethod
    async def generate_explanation_stream(
        cls,
        report_data: Dict[str, Any]
    ) -> AsyncGenerator[str, None]:
        yield "data: {\"done\": true, \"message\": \"Streaming is handled by the central Gemini service on the backend.\"}\n\n"
