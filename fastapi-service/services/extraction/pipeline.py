"""
Master Medical PDF Extraction Pipeline
MedAssist AI — Unified Production Multi-Stage Hybrid Extraction Orchestrator
"""

import uuid
import logging
from typing import Dict, Any, Optional, Union
from pathlib import Path

from .models import (
    ExtractionResult, PageType, SectionReport, RejectedCandidate,
    ClinicalParameter, PatientDemographics, ReportMetadata
)
from .pdf_ingestion import PDFIngestionService, PDFIngestionError
from .pdf_classifier import PDFPageClassifier
from .digital_extractor import DigitalExtractor
from .page_renderer import PageRenderer
from .image_preprocessor import ImagePreprocessor
from .ocr_engine import OCREngineService
from .spatial_document import SpatialDocumentBuilder
from .layout_analyzer import LayoutAnalyzer
from .table_reconstructor import TableReconstructor
from .candidate_detector import CandidateDetector
from .association_graph import AssociationGraph
from .validation_engine import ValidationEngine

logger = logging.getLogger(__name__)


class MedicalPDFExtractor:
    """
    Main entry point for extracting clinical laboratory measurements and patient metadata from medical PDFs.
    """

    @classmethod
    def extract_pdf(
        cls,
        file_input: Union[bytes, str, Path],
        filename: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> ExtractionResult:
        doc_id = str(uuid.uuid4())

        # 1. Ingestion & Validation
        file_bytes: bytes = b""
        if isinstance(file_input, (str, Path)):
            with open(file_input, "rb") as f:
                file_bytes = f.read()
            if not filename:
                filename = Path(file_input).name
        elif isinstance(file_input, bytes):
            file_bytes = file_input

        doc, doc_meta = PDFIngestionService.validate_and_load(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type
        )

        page_count = doc_meta["page_count"]

        # 2. Per-Page Classification (Digital vs Scanned vs Mixed)
        page_types = PDFPageClassifier.classify_document(doc)

        all_tokens = []
        extraction_warnings = []

        # 3. Multi-Engine Spatial Extraction Across ALL Pages
        for page_num in range(1, page_count + 1):
            page = doc[page_num - 1]
            p_type = page_types.get(page_num, PageType.DIGITAL_TEXT)

            if p_type == PageType.EMPTY:
                continue

            if p_type == PageType.DIGITAL_TEXT:
                tokens = DigitalExtractor.extract_page_tokens(page, page_num)
                all_tokens.extend(tokens)
            else:
                # Scanned or Mixed page -> Render & OCR
                img_rgb, scale_factor = PageRenderer.render_page_to_numpy(page, dpi=300)
                preprocessed_img, deskew_angle = ImagePreprocessor.preprocess_image(img_rgb)
                ocr_tokens, engine_used, avg_conf = OCREngineService.ocr_page(
                    preprocessed_img, page_num, scale_factor
                )
                all_tokens.extend(ocr_tokens)
                if avg_conf < 0.70:
                    extraction_warnings.append(
                        f"Page {page_num} scanned image OCR had moderate confidence ({avg_conf:.2f}) using {engine_used}."
                    )

        # 4. Construct Unified Spatial Lines
        spatial_lines = SpatialDocumentBuilder.group_tokens_into_lines(all_tokens)

        # 5. Semantic Layout Analysis & Demographics Extraction
        classified_lines, demographics, metadata = LayoutAnalyzer.analyze_layout(spatial_lines)

        # 6. Candidate Detection
        raw_candidates = CandidateDetector.detect_candidates(classified_lines)

        # 7. Graph-Based Parameter/Value Association
        validated_params, rejected_candidates_raw, assoc_warnings = AssociationGraph.resolve_associations(raw_candidates)
        extraction_warnings.extend(assoc_warnings)

        # 8. Clinical Validation & Physiological Plausibility Checks
        final_params, val_warnings = ValidationEngine.validate_parameters(validated_params)
        extraction_warnings.extend(val_warnings)

        # 9. Group Parameters into Sections
        sections_dict: Dict[str, SectionReport] = {}
        for p in final_params:
            sec_name = p.section or "General Clinical Laboratory"
            sec_key = f"{sec_name}_p{p.page}"
            if sec_key not in sections_dict:
                sections_dict[sec_key] = SectionReport(
                    name=sec_name,
                    subsection=p.subsection,
                    page=p.page,
                    parameters=[]
                )
            sections_dict[sec_key].parameters.append(p)

        rejected_models = [
            RejectedCandidate(
                raw_candidate=r["raw_candidate"],
                value=str(r.get("value", "")),
                classification=r["classification"],
                reason=r["reason"],
                page=r["page"],
                bbox=r.get("bbox"),
                source_text=r.get("source_text")
            )
            for r in rejected_candidates_raw
        ]

        return ExtractionResult(
            document_id=doc_id,
            page_count=page_count,
            page_types=page_types,
            patient=demographics,
            metadata=metadata,
            sections=list(sections_dict.values()),
            clinical_parameters=final_params,
            unresolved_candidates=rejected_models,
            extraction_warnings=extraction_warnings
        )
