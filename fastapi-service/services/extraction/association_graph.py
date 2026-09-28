"""
Graph-Based Parameter/Value Association Engine
MedAssist AI — Deterministic Spatial & Semantic Graph Association
"""

from typing import List, Dict, Any, Optional, Tuple
from .models import (
    ClinicalParameter, CandidateCategory, AbnormalityFlag,
    ConfidenceBreakdown, ReferenceRangeData
)
from .candidate_detector import RawCandidate
from .candidate_classifier import CandidateClassifier
from .clinical_ontology import CLINICAL_ONTOLOGY, get_ontology_definition


class ParameterNode:
    def __init__(self, raw_candidate: RawCandidate, classification: Dict[str, Any]):
        self.raw_candidate = raw_candidate
        self.classification = classification
        self.canonical_key = classification.get("canonical_key", "")
        self.display_name = classification.get("display_name", raw_candidate.raw_parameter)
        self.page = raw_candidate.page
        self.bbox = raw_candidate.bbox
        self.line_index = raw_candidate.line_index


class AssociationGraph:
    """
    Constructs an association graph connecting Parameter nodes to Value, Unit, Reference, and Flag attributes.
    Maintains independent context per observation to prevent collapsing distinct clinical observations.
    """

    @classmethod
    def resolve_associations(
        cls,
        raw_candidates: List[RawCandidate]
    ) -> Tuple[List[ClinicalParameter], List[Dict[str, Any]], List[str]]:
        """
        Builds graph edges and resolves associated clinical parameters.
        Returns: (validated_parameters, rejected_candidates, warnings)
        """
        validated_parameters: List[ClinicalParameter] = []
        rejected_candidates: List[Dict[str, Any]] = []
        warnings: List[str] = []

        # Track contextual identity to prevent merging distinct clinical tests
        # A key consists of (canonical_key, page, line_index) or (raw_parameter, page, line_index)
        seen_observations = set()

        for cand in raw_candidates:
            # 1. Classify candidate
            classification = CandidateClassifier.classify_candidate(
                raw_label=cand.raw_parameter,
                value=cand.raw_value,
                unit=cand.raw_unit,
                reference_range=cand.raw_reference
            )

            # 2. If non-clinical -> reject with explanation
            if not classification["is_clinical"]:
                rejected_candidates.append({
                    "raw_candidate": cand.raw_parameter,
                    "value": cand.raw_value,
                    "classification": classification["category"],
                    "reason": classification.get("rejection_reason", "Non-clinical entity"),
                    "page": cand.page,
                    "bbox": cand.bbox.to_list(),
                    "source_text": cand.source_text
                })
                continue

            # 3. Create Parameter Node
            node = ParameterNode(cand, classification)
            obs_key = (node.canonical_key, node.page, node.line_index)

            if obs_key in seen_observations:
                continue
            seen_observations.add(obs_key)

            # 4. Resolve Unit
            resolved_unit = cand.raw_unit
            if not resolved_unit or not classification.get("unit_valid", True):
                resolved_unit = classification.get("default_unit", "")

            # 5. Resolve Reference Range
            resolved_ref = cand.raw_reference or classification.get("default_range", "")
            parsed_ref = cls._parse_reference_range(resolved_ref)

            # 6. Resolve Abnormality Flag
            flag_str = cand.raw_flag.strip()
            abnormality = cls._compute_abnormality(cand.raw_value, parsed_ref, flag_str)

            # 7. Convert numeric value if possible
            val_parsed = cls._parse_numeric_value(cand.raw_value)

            # 8. Compute multi-component confidence
            conf_components = cls._compute_confidence(cand, classification)

            param = ClinicalParameter(
                canonical_key=node.canonical_key,
                display_name=node.display_name,
                raw_parameter=cand.raw_parameter,
                value=val_parsed,
                raw_value=cand.raw_value,
                unit=resolved_unit,
                raw_unit=cand.raw_unit,
                reference_range=resolved_ref,
                parsed_reference=parsed_ref,
                flag=flag_str if flag_str else ("High" if abnormality == AbnormalityFlag.HIGH else ("Low" if abnormality == AbnormalityFlag.LOW else "Normal")),
                abnormality=abnormality,
                section=cand.section,
                subsection=cand.subsection,
                page=cand.page,
                bbox={"x0": cand.bbox.x0, "y0": cand.bbox.y0, "x1": cand.bbox.x1, "y1": cand.bbox.y1},
                extraction_method="deterministic_spatial_graph",
                confidence=conf_components.overall,
                confidence_components=conf_components,
                source_text=cand.source_text,
                warnings=[],
                classification=CandidateCategory.CLINICAL_MEASUREMENT
            )

            validated_parameters.append(param)

        return validated_parameters, rejected_candidates, warnings

    @classmethod
    def _parse_numeric_value(cls, val_str: str) -> Any:
        try:
            clean_str = val_str.replace(',', '').strip()
            # If starts with operator like "< 140" or ">= 126", keep as float of the number or string
            import re
            m = re.search(r'-?\d+(?:\.\d+)?', clean_str)
            if m:
                return float(m.group(0))
        except Exception:
            pass
        return val_str

    @classmethod
    def _parse_reference_range(cls, ref_str: str) -> ReferenceRangeData:
        import re
        if not ref_str:
            return ReferenceRangeData(raw="")

        # Pattern: "13.0 - 17.0" or "4,800 - 10,800"
        range_m = re.search(r'([\d,]+(?:\.\d+)?)\s*[\-\–\:]\s*([\d,]+(?:\.\d+)?)', ref_str)
        if range_m:
            try:
                low = float(range_m.group(1).replace(',', ''))
                high = float(range_m.group(2).replace(',', ''))
                return ReferenceRangeData(raw=ref_str, lower=low, upper=high)
            except ValueError:
                pass

        # Pattern: "< 140" or "<= 5.0"
        lt_m = re.search(r'(<=|<)\s*([\d,]+(?:\.\d+)?)', ref_str)
        if lt_m:
            try:
                op, high = lt_m.groups()
                return ReferenceRangeData(raw=ref_str, upper=float(high.replace(',', '')), upper_operator=op)
            except ValueError:
                pass

        # Pattern: "> 50" or ">= 126"
        gt_m = re.search(r'(>=|>)\s*([\d,]+(?:\.\d+)?)', ref_str)
        if gt_m:
            try:
                op, low = gt_m.groups()
                return ReferenceRangeData(raw=ref_str, lower=float(low.replace(',', '')), lower_operator=op)
            except ValueError:
                pass

        return ReferenceRangeData(raw=ref_str, textual=ref_str)

    @classmethod
    def _compute_abnormality(cls, val_str: str, ref_data: ReferenceRangeData, flag_str: str) -> AbnormalityFlag:
        f_lower = flag_str.lower().strip()
        if f_lower in ['high', 'h', '*']:
            return AbnormalityFlag.HIGH
        if f_lower in ['low', 'l']:
            return AbnormalityFlag.LOW
        if f_lower in ['borderline']:
            return AbnormalityFlag.BORDERLINE
        if f_lower in ['abnormal']:
            return AbnormalityFlag.ABNORMAL

        try:
            import re
            m = re.search(r'-?\d+(?:\.\d+)?', val_str.replace(',', ''))
            if m:
                num_val = float(m.group(0))
                if ref_data.lower is not None and num_val < ref_data.lower:
                    return AbnormalityFlag.LOW
                if ref_data.upper is not None and num_val > ref_data.upper:
                    return AbnormalityFlag.HIGH
        except Exception:
            pass

        return AbnormalityFlag.NORMAL

    @classmethod
    def _compute_confidence(cls, cand: RawCandidate, classification: Dict[str, Any]) -> ConfidenceBreakdown:
        ocr_conf = 0.98
        semantic_conf = classification.get("match_score", 0.90)
        spatial_conf = 0.95 if cand.raw_unit and cand.raw_reference else 0.85
        validation_conf = 1.0 if classification.get("unit_valid", True) else 0.75

        overall = (
            0.25 * ocr_conf +
            0.30 * semantic_conf +
            0.25 * spatial_conf +
            0.20 * validation_conf
        )

        return ConfidenceBreakdown(
            ocr=round(ocr_conf, 2),
            semantic=round(semantic_conf, 2),
            spatial=round(spatial_conf, 2),
            validation=round(validation_conf, 2),
            overall=round(overall, 2)
        )
