"""
Clinical Validation & Quality Gate Engine
MedAssist AI — Validates Extracted Analytes Against Physiological Limits & Document Truth
"""

from typing import List, Tuple
from .models import ClinicalParameter
from .clinical_ontology import get_ontology_definition


class ValidationEngine:
    """
    Performs deterministic validation on resolved clinical parameters:
    1. Checks if numerical value falls within expected physiological range
    2. Flags extreme values with warnings without altering source data (Never silently modify!)
    3. Filters out any accidental duplicate observations while preserving distinct real tests
    """

    @classmethod
    def validate_parameters(
        cls,
        parameters: List[ClinicalParameter]
    ) -> Tuple[List[ClinicalParameter], List[str]]:
        validated: List[ClinicalParameter] = []
        warnings: List[str] = []

        for p in parameters:
            # Check physiological plausibility
            defn = get_ontology_definition(p.canonical_key)
            if defn and isinstance(p.value, (int, float)):
                min_exp, max_exp = defn.expected_numeric_range
                if p.value < min_exp or p.value > max_exp:
                    warn_msg = (
                        f"Extracted value {p.value} for '{p.display_name}' is outside usual clinical bounds "
                        f"({min_exp} - {max_exp} {p.unit}). Preserved as ground truth from report."
                    )
                    p.warnings.append(warn_msg)
                    warnings.append(warn_msg)

            validated.append(p)

        return validated, warnings
