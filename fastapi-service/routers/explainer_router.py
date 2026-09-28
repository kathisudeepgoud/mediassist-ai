from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from schemas.explainer import ExplainReportRequest, ExplainReportResponse
from services.report_explainer import ReportExplainerService

router = APIRouter(prefix="/explain-report", tags=["Report Explainer"])

@router.post("", response_model=ExplainReportResponse)
async def explain_report(
    request: ExplainReportRequest,
    stream: bool = Query(False, description="Set to true for streaming token output")
):
    """
    Accepts extracted report JSON. Explanations are handled centrally via the Express Gemini backend.
    """
    try:
        report_dict = request.model_dump()
        
        if stream:
            return StreamingResponse(
                ReportExplainerService.generate_explanation_stream(report_dict),
                media_type="text/event-stream"
            )

        explanation = await ReportExplainerService.generate_explanation(report_dict)
        return explanation
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report explanation error: {str(e)}"
        )

@router.post("/stream")
async def explain_report_stream(request: ExplainReportRequest):
    """
    Streams explanation tokens via Server-Sent Events.
    """
    try:
        report_dict = request.model_dump()
        return StreamingResponse(
            ReportExplainerService.generate_explanation_stream(report_dict),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report streaming error: {str(e)}"
        )
