"""
Data Models for Medical Document Intelligence & Clinical Report Extraction
MedAssist AI — Deterministic Hybrid Spatial Extraction System
"""

from enum import Enum
from typing import List, Dict, Any, Optional, Tuple, Union
from pydantic import BaseModel, Field


class PageType(str, Enum):
    DIGITAL_TEXT = "DIGITAL_TEXT"
    SCANNED_IMAGE = "SCANNED_IMAGE"
    MIXED = "MIXED"
    EMPTY = "EMPTY"


class RegionType(str, Enum):
    HEADER = "HEADER"
    PATIENT_METADATA = "PATIENT_METADATA"
    LAB_METADATA = "LAB_METADATA"
    SPECIMEN_INFO = "SPECIMEN_INFO"
    TEST_SECTION = "TEST_SECTION"
    SUBSECTION = "SUBSECTION"
    TABLE_HEADER = "TABLE_HEADER"
    TABLE_BODY = "TABLE_BODY"
    CLINICAL_MEASUREMENT = "CLINICAL_MEASUREMENT"
    CLINICAL_NOTES = "CLINICAL_NOTES"
    INTERPRETATION = "INTERPRETATION"
    REFERENCE_INFO = "REFERENCE_INFO"
    DIAGNOSTIC_GUIDELINES = "DIAGNOSTIC_GUIDELINES"
    SIGNATURE = "SIGNATURE"
    FOOTER = "FOOTER"
    UNKNOWN = "UNKNOWN"


class CandidateCategory(str, Enum):
    CLINICAL_MEASUREMENT = "CLINICAL_MEASUREMENT"
    VITAL_SIGN = "VITAL_SIGN"
    REFERENCE_RANGE = "REFERENCE_RANGE"
    INTERPRETATION = "INTERPRETATION"
    INTERPRETATION_THRESHOLD = "INTERPRETATION_THRESHOLD"
    DIAGNOSIS = "DIAGNOSIS"
    PATIENT_IDENTIFIER = "PATIENT_IDENTIFIER"
    REPORT_IDENTIFIER = "REPORT_IDENTIFIER"
    DEMOGRAPHIC = "DEMOGRAPHIC"
    DATE_TIME = "DATE_TIME"
    METADATA = "METADATA"
    SECTION_HEADER = "SECTION_HEADER"
    PAGE_NUMBER = "PAGE_NUMBER"
    ADMINISTRATIVE = "ADMINISTRATIVE"
    ADMINISTRATIVE_FIELD = "ADMINISTRATIVE_FIELD"
    CALCULATED_VALUE = "CALCULATED_VALUE"
    COMMENTARY = "COMMENTARY"
    METHODOLOGY = "METHODOLOGY"
    UNKNOWN = "UNKNOWN"


class AbnormalityFlag(str, Enum):
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    LOW = "LOW"
    BORDERLINE = "BORDERLINE"
    ABNORMAL = "ABNORMAL"
    CRITICAL = "CRITICAL"
    POSITIVE = "POSITIVE"
    NEGATIVE = "NEGATIVE"
    NONE = "NONE"


class BoundingBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def width(self) -> float:
        return max(0.0, self.x1 - self.x0)

    @property
    def height(self) -> float:
        return max(0.0, self.y1 - self.y0)

    @property
    def center_x(self) -> float:
        return (self.x0 + self.x1) / 2.0

    @property
    def center_y(self) -> float:
        return (self.y0 + self.y1) / 2.0

    def overlaps_y(self, other: "BoundingBox", tolerance: float = 3.0) -> bool:
        return not (self.y1 + tolerance < other.y0 or other.y1 + tolerance < self.y0)

    def overlaps_x(self, other: "BoundingBox", tolerance: float = 3.0) -> bool:
        return not (self.x1 + tolerance < other.x0 or other.x1 + tolerance < self.x0)

    def to_list(self) -> List[float]:
        return [round(self.x0, 2), round(self.y0, 2), round(self.x1, 2), round(self.y1, 2)]


class SpatialToken(BaseModel):
    text: str
    normalized_text: str
    raw_text: str
    bbox: BoundingBox
    page: int
    confidence: float = 1.0
    source_engine: str = "pymupdf"  # "pymupdf" | "paddleocr" | "tesseract"
    font_size: Optional[float] = None
    is_bold: bool = False
    block_num: Optional[int] = None
    line_num: Optional[int] = None


class SpatialLine(BaseModel):
    tokens: List[SpatialToken] = []
    text: str = ""
    bbox: BoundingBox
    page: int
    y_center: float
    region_type: RegionType = RegionType.UNKNOWN

    def append_token(self, token: SpatialToken):
        self.tokens.append(token)
        self.text = " ".join(t.text for t in self.tokens).strip()


class SpatialBlock(BaseModel):
    lines: List[SpatialLine] = []
    bbox: BoundingBox
    page: int
    region_type: RegionType = RegionType.UNKNOWN
    section_name: Optional[str] = None
    subsection_name: Optional[str] = None


class TableColumnType(str, Enum):
    TEST_NAME = "TEST_NAME"
    RESULT_VALUE = "RESULT_VALUE"
    UNIT = "UNIT"
    REFERENCE_RANGE = "REFERENCE_RANGE"
    FLAG = "FLAG"
    METHOD = "METHOD"
    UNKNOWN = "UNKNOWN"


class TableColumn(BaseModel):
    column_type: TableColumnType
    header_text: str
    x0: float
    x1: float
    center_x: float


class TableCell(BaseModel):
    text: str
    tokens: List[SpatialToken] = []
    bbox: BoundingBox
    column_type: TableColumnType = TableColumnType.UNKNOWN


class TableRow(BaseModel):
    row_index: int
    cells: List[TableCell] = []
    y0: float
    y1: float
    page: int
    raw_text: str = ""
    is_header: bool = False
    is_section_header: bool = False


class TableGrid(BaseModel):
    page: int
    bbox: BoundingBox
    columns: List[TableColumn] = []
    rows: List[TableRow] = []
    section_name: Optional[str] = None


class ReferenceRangeData(BaseModel):
    raw: str
    lower: Optional[float] = None
    upper: Optional[float] = None
    lower_operator: Optional[str] = None
    upper_operator: Optional[str] = None
    textual: Optional[str] = None


class ConfidenceBreakdown(BaseModel):
    ocr: float = 1.0
    semantic: float = 1.0
    spatial: float = 1.0
    validation: float = 1.0
    overall: float = 1.0


class ClinicalParameter(BaseModel):
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


class PatientDemographics(BaseModel):
    name: Optional[str] = None
    patient_id: Optional[str] = None
    age: Optional[int] = None
    raw_age: Optional[str] = None
    sex: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None


class ReportMetadata(BaseModel):
    lab_name: Optional[str] = None
    hospital_name: Optional[str] = None
    sample_id: Optional[str] = None
    accession_no: Optional[str] = None
    collection_date: Optional[str] = None
    report_date: Optional[str] = None
    referring_doctor: Optional[str] = None
    sample_type: Optional[str] = None
    department: Optional[str] = None


class SectionReport(BaseModel):
    name: str
    subsection: Optional[str] = None
    page: int
    parameters: List[ClinicalParameter] = []


class RejectedCandidate(BaseModel):
    raw_candidate: str
    value: Optional[str] = None
    classification: CandidateCategory
    reason: str
    page: int
    bbox: Optional[List[float]] = None
    source_text: Optional[str] = None


class ExtractionResult(BaseModel):
    document_id: str
    page_count: int
    page_types: Dict[int, PageType]
    patient: PatientDemographics = Field(default_factory=PatientDemographics)
    metadata: ReportMetadata = Field(default_factory=ReportMetadata)
    sections: List[SectionReport] = []
    clinical_parameters: List[ClinicalParameter] = []
    unresolved_candidates: List[RejectedCandidate] = []
    extraction_warnings: List[str] = []
    debug_trace: Optional[Dict[str, Any]] = None
