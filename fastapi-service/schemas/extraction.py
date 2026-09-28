"""
Pydantic Schemas for Structured Clinical Extraction
MedAssist AI — Unified Extraction JSON Response Schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from services.extraction.models import (
    PageType, AbnormalityFlag, CandidateCategory,
    ConfidenceBreakdown, ReferenceRangeData
)


class ExtractedParameterSchema(BaseModel):
    canonical_key: str
    display_name: str
    raw_parameter: str
    value: Union[float, str]
    raw_value: str
    unit: str
    raw_unit: str
    reference_range: Optional[str] = None
    parsed_reference: Optional[ReferenceRangeData] = None
    flag: Optional[str] = None
    abnormality: AbnormalityFlag = AbnormalityFlag.NORMAL
    section: Optional[str] = None
    subsection: Optional[str] = None
    page: int
    bbox: Optional[Dict[str, Any]] = None
    extraction_method: str = "deterministic_spatial_graph"
    confidence: float = 1.0
    confidence_components: ConfidenceBreakdown = Field(default_factory=ConfidenceBreakdown)
    source_text: str = ""
    warnings: List[str] = []
    classification: CandidateCategory = CandidateCategory.CLINICAL_MEASUREMENT


class SectionReportSchema(BaseModel):
    name: str
    subsection: Optional[str] = None
    page: int
    parameters: List[ExtractedParameterSchema] = []


class RejectedCandidateSchema(BaseModel):
    raw_candidate: str
    value: Optional[str] = None
    classification: CandidateCategory
    reason: str
    page: int
    bbox: Optional[List[float]] = None
    source_text: Optional[str] = None


class PatientDemographicsSchema(BaseModel):
    name: Optional[str] = None
    patient_id: Optional[str] = None
    age: Optional[int] = None
    raw_age: Optional[str] = None
    sex: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None


class ReportMetadataSchema(BaseModel):
    lab_name: Optional[str] = None
    hospital_name: Optional[str] = None
    sample_id: Optional[str] = None
    accession_no: Optional[str] = None
    collection_date: Optional[str] = None
    report_date: Optional[str] = None
    referring_doctor: Optional[str] = None
    sample_type: Optional[str] = None
    department: Optional[str] = None
