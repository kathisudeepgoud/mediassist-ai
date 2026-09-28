"""
Adapter service integrating the production MedicalPDFExtractor pipeline into FastAPI schema.
Supports full rich structured output and backwards compatibility for legacy endpoints and database persistence.
"""

import re
from typing import List, Dict, Any, Optional

from services.extraction.pipeline import MedicalPDFExtractor
from services.extraction.models import AbnormalityFlag
from services.report_explainer import ReportExplainerService


class ParserService:
    @classmethod
    async def parse_report_file(cls, file_bytes: bytes, filename: str, content_type: str) -> Dict[str, Any]:
        """
        Parses report PDF file bytes using the production MedicalPDFExtractor architecture.
        Returns unified extraction JSON schema with rich structural data and legacy aliases.
        """
        # 1. Run deterministic spatial extraction pipeline
        extraction_result = MedicalPDFExtractor.extract_pdf(
            file_input=file_bytes,
            filename=filename,
            content_type=content_type
        )

        patient = extraction_result.patient
        metadata = extraction_result.metadata
        clinical_params = extraction_result.clinical_parameters
        unresolved = extraction_result.unresolved_candidates
        warnings = extraction_result.extraction_warnings
        sections = extraction_result.sections

        # 2. Adapt to legacy and frontend formats
        validated_vitals: List[Dict[str, Any]] = []
        legacy_params: List[Dict[str, Any]] = []

        for p in clinical_params:
            status = "normal"
            if p.abnormality == AbnormalityFlag.HIGH:
                status = "high"
            elif p.abnormality == AbnormalityFlag.LOW:
                status = "low"
            elif p.abnormality == AbnormalityFlag.BORDERLINE:
                status = "borderline"
            elif p.abnormality == AbnormalityFlag.ABNORMAL:
                status = "abnormal"

            val_num = p.value if isinstance(p.value, (int, float)) else 0.0
            if not isinstance(p.value, (int, float)):
                num_m = re.search(r'-?[\d,]+(?:\.\d+)?', str(p.raw_value))
                if num_m:
                    try:
                        val_num = float(num_m.group(0).replace(',', ''))
                    except ValueError:
                        val_num = 0.0

            validated_vitals.append({
                "label": p.display_name,
                "canonical_name": p.canonical_key,
                "value": p.value,
                "raw_value": p.raw_value,
                "unit": p.unit,
                "status": status,
                "referenceRange": p.reference_range or "Standard Reference Range",
                "category": p.section or "Biochemistry",
                "organ_system": "General",
                "confidence": "high" if p.confidence >= 0.8 else ("medium" if p.confidence >= 0.55 else "low")
            })

            legacy_params.append({
                "name": p.display_name,
                "canonical_name": p.canonical_key,
                "value": p.value,
                "raw_value": p.raw_value,
                "unit": p.unit,
                "reference_range": p.reference_range or "Standard Reference Range",
                "flag": p.flag or "Normal",
                "confidence": "high" if p.confidence >= 0.8 else "medium",
                "source": p.extraction_method
            })

        # 3. Generate key findings with ReportExplainerService if available
        key_findings: List[Dict[str, Any]] = []
        try:
            expl_res = await ReportExplainerService.generate_explanation({
                "metadata": metadata.model_dump(),
                "parameters": legacy_params
            })
            if expl_res and expl_res.parameter_explanations:
                for pe in expl_res.parameter_explanations:
                    key_findings.append({
                        "parameter": pe.parameter,
                        "explanation": pe.explanation
                    })
        except Exception:
            key_findings = []

        abnormal_count = sum(1 for v in validated_vitals if v["status"] in ["high", "low", "abnormal"])
        summary_text = (
            f"Extracted {len(clinical_params)} clinical parameter(s) across {extraction_result.page_count} page(s). "
            f"{abnormal_count} flagged as abnormal/out of range."
        ) if clinical_params else "No valid clinical laboratory parameters found in report."

        return {
            # Production Unified Fields
            "document_id": extraction_result.document_id,
            "page_count": extraction_result.page_count,
            "patient": patient.model_dump(),
            "metadata": metadata.model_dump(),
            "sections": [s.model_dump() for s in sections],
            "clinical_parameters": [p.model_dump() for p in clinical_params],
            "unresolved_candidates": [u.model_dump() for u in unresolved],
            "extraction_warnings": warnings,

            # Legacy fields for backward compatibility
            "parameters": legacy_params,
            "vitals": validated_vitals,
            "patientName": patient.name,
            "patientId": patient.patient_id,
            "sampleId": metadata.sample_id,
            "age": patient.age,
            "gender": patient.gender or patient.sex,
            "hospital": metadata.hospital_name or metadata.lab_name,
            "doctor": metadata.referring_doctor,
            "reportDate": metadata.report_date,
            "extractedText": f"Extracted {len(clinical_params)} clinical parameters across {extraction_result.page_count} page(s).",
            "keyFindings": key_findings,
            "summary": summary_text
        }
