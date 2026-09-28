"""
FastAPI Router for PDF Report Parser
MedAssist AI — Strict PDF Ingestion and Clinical Parameter Extraction
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from schemas.parser import ParseReportResponse
from services.parser_service import ParserService
from services.extraction.pdf_ingestion import PDFIngestionError

router = APIRouter(prefix="/parse-report", tags=["Report Parser"])


@router.post("", response_model=ParseReportResponse)
async def parse_report(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file uploaded."
            )

        parsed_data = await ParserService.parse_report_file(
            file_bytes=content,
            filename=file.filename or "report.pdf",
            content_type=file.content_type or "application/pdf"
        )
        return parsed_data
    except PDFIngestionError as pe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(pe)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report parsing error: {str(e)}"
        )
