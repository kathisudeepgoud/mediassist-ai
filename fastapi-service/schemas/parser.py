"""
FastAPI Parser Response Schemas
MedAssist AI — Unified and Backward-Compatible Report Extraction Schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from schemas.extraction import (
    ExtractedParameterSchema, SectionReportSchema, RejectedCandidateSchema,
    PatientDemographicsSchema, ReportMetadataSchema
)


class ExtractMetadata(BaseModel):
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    age: Optional[str] = None
    sex: Optional[str] = None
    hospital_name: Optional[str] = None
    doctor_name: Optional[str] = None
    report_date: Optional[str] = None
    collection_date: Optional[str] = None
    report_id: Optional[str] = None


class ExtractParameter(BaseModel):
    name: str
    canonical_name: Optional[str] = None
    value: Union[float, str]
    raw_value: Optional[str] = None
    unit: str
    reference_range: str
    flag: str
    confidence: str
    source: str = "deterministic_spatial_graph"


class LegacyVital(BaseModel):
    label: str
    canonical_name: Optional[str] = None
    value: Union[float, str]
    raw_value: Optional[str] = None
    unit: str
    status: str  # 'normal' | 'borderline' | 'high' | 'low'
    referenceRange: str


class ParseReportResponse(BaseModel):
    # Production Structured Extraction Output
    document_id: Optional[str] = None
    page_count: int = 1
    patient: Optional[PatientDemographicsSchema] = None
    metadata: Optional[ReportMetadataSchema] = None
    sections: List[SectionReportSchema] = []
    clinical_parameters: List[ExtractedParameterSchema] = []
    unresolved_candidates: List[RejectedCandidateSchema] = []
    extraction_warnings: List[str] = []

    # Legacy fields for backward compatibility with existing server/frontend consumers
    parameters: List[ExtractParameter] = []
    vitals: List[LegacyVital] = []
    patientName: Optional[str] = None
    patientId: Optional[str] = None
    sampleId: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    hospital: Optional[str] = None
    doctor: Optional[str] = None
    reportDate: Optional[str] = None
    extractedText: Optional[str] = ""
    keyFindings: List[Any] = []
    summary: Optional[str] = ""
