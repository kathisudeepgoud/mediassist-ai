"""
Automated Test Suite for Clinical Parameter Extraction & Semantic Validation
Tests all 8 specific false-positive isolation and clinical ontology matching cases.
"""

import sys
import unittest
from pathlib import Path

# Add fastapi-service to sys.path
SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from services.clinical_ontology import (
    CLINICAL_ONTOLOGY,
    find_canonical_key_by_exact_synonym,
    get_ontology_definition,
    is_unit_compatible
)
from services.candidate_classifier import CandidateClassifier, CandidateCategory
from services.report_extractor import extract_metadata, ConfidenceValidator, ExtractedCandidate


class TestClinicalExtraction(unittest.TestCase):

    def test_case_1_sample_id_and_glucose(self):
        """Case 1: Sample ID: 262590091 + Fasting Blood Glucose: 218 mg/dL"""
        lines = [
            "Sample ID: 262590091",
            "Fasting Blood Glucose 218 mg/dL 70 - 150 High"
        ]
        metadata = extract_metadata(lines)
        self.assertEqual(metadata.get("sample_id"), "262590091")

        candidates = [
            ExtractedCandidate(raw_name="Sample Id", value="262590091", unit="Client"),
            ExtractedCandidate(raw_name="Fasting Blood Glucose", value="218", unit="mg/dL", reference_range="70 - 150", flag="High")
        ]

        validated, unclassified, warnings = ConfidenceValidator.process_and_validate(candidates, metadata)

        # Sample ID must be excluded from clinical_parameters
        param_names = [p["name"] for p in validated]
        self.assertIn("Fasting Blood Glucose", param_names)
        self.assertNotIn("Sample Id", param_names)
        self.assertEqual(len(validated), 1)
        self.assertEqual(validated[0]["canonical_name"], "glucose_fasting")
        self.assertEqual(validated[0]["value"], "218")
        self.assertEqual(validated[0]["unit"], "mg/dL")

    def test_case_2_patient_id_and_cbc_analytes(self):
        """Case 2: Patient ID: P000001 + Hemoglobin, RBC, Platelets"""
        metadata = {"patient_id": "P000001"}
        candidates = [
            ExtractedCandidate(raw_name="Patient ID", value="P000001"),
            ExtractedCandidate(raw_name="Hemoglobin", value="11.2", unit="g/dL", reference_range="13.0 - 17.0", flag="Low"),
            ExtractedCandidate(raw_name="RBC", value="3.9", unit="million/cumm", reference_range="4.5 - 5.5", flag="Low"),
            ExtractedCandidate(raw_name="Platelets", value="210", unit="10^3/ul", reference_range="150 - 450", flag="Normal")
        ]

        validated, unclassified, warnings = ConfidenceValidator.process_and_validate(candidates, metadata)

        param_names = [p["name"] for p in validated]
        self.assertNotIn("Patient ID", param_names)
        self.assertIn("Hemoglobin", param_names)
        self.assertIn("Red Blood Cell Count (RBC)", param_names)
        self.assertIn("Platelet Count", param_names)
        self.assertEqual(len(validated), 3)

    def test_case_3_diabetes_mellitus_diagnosis_excluded(self):
        """Case 3: Diabetes Mellitus: 126 + Fasting Blood Glucose: 126 mg/dL"""
        metadata = {}
        candidates = [
            ExtractedCandidate(raw_name="Diabetes Mellitus", value="126", unit="units"),
            ExtractedCandidate(raw_name="Fasting Blood Glucose", value="126", unit="mg/dL", reference_range="70 - 99", flag="High")
        ]

        validated, unclassified, warnings = ConfidenceValidator.process_and_validate(candidates, metadata)

        param_names = [p["name"] for p in validated]
        self.assertNotIn("Diabetes Mellitus", param_names)
        self.assertIn("Fasting Blood Glucose", param_names)
        self.assertEqual(len(validated), 1)

    def test_case_4_impaired_tolerance_interpretation_excluded(self):
        """Case 4: Impaired Tolerance: 100 + Fasting Blood Glucose: 218 mg/dL"""
        metadata = {}
        candidates = [
            ExtractedCandidate(raw_name="Impaired Tolerance", value="100", unit="units"),
            ExtractedCandidate(raw_name="Fasting Blood Glucose", value="218", unit="mg/dL", reference_range="70 - 150", flag="High")
        ]

        validated, unclassified, warnings = ConfidenceValidator.process_and_validate(candidates, metadata)

        param_names = [p["name"] for p in validated]
        self.assertNotIn("Impaired Tolerance", param_names)
        self.assertIn("Fasting Blood Glucose", param_names)
        self.assertEqual(len(validated), 1)

    def test_case_5_report_and_accession_numbers_excluded(self):
        """Case 5: Report Number: 12345 + Accession Number: 998877 + Creatinine: 1.2 mg/dL"""
        metadata = {}
        candidates = [
            ExtractedCandidate(raw_name="Report Number", value="12345"),
            ExtractedCandidate(raw_name="Accession Number", value="998877"),
            ExtractedCandidate(raw_name="Creatinine", value="1.2", unit="mg/dL", reference_range="0.7 - 1.3")
        ]

        validated, unclassified, warnings = ConfidenceValidator.process_and_validate(candidates, metadata)

        param_names = [p["name"] for p in validated]
        self.assertNotIn("Report Number", param_names)
        self.assertNotIn("Accession Number", param_names)
        self.assertIn("Serum Creatinine", param_names)
        self.assertEqual(len(validated), 1)

    def test_case_6_unknown_test_classified_as_unknown(self):
        """Case 6: Unknown Test: 123 units -> Must NOT create a clinical parameter"""
        metadata = {}
        candidates = [
            ExtractedCandidate(raw_name="Random Non Medical Label XYZ", value="123", unit="units")
        ]

        validated, unclassified, warnings = ConfidenceValidator.process_and_validate(candidates, metadata)

        self.assertEqual(len(validated), 0)
        self.assertEqual(len(unclassified), 1)
        self.assertEqual(unclassified[0]["classification"], "UNKNOWN")

    def test_case_7_fbs_normalized_to_glucose_fasting(self):
        """Case 7: FBS: 218 mg/dL -> Normalized to canonical_name = glucose_fasting"""
        metadata = {}
        candidates = [
            ExtractedCandidate(raw_name="FBS", value="218", unit="mg/dL", reference_range="70 - 110", flag="High")
        ]

        validated, unclassified, warnings = ConfidenceValidator.process_and_validate(candidates, metadata)

        self.assertEqual(len(validated), 1)
        self.assertEqual(validated[0]["canonical_name"], "glucose_fasting")
        self.assertEqual(validated[0]["name"], "Fasting Blood Glucose")
        self.assertEqual(validated[0]["value"], "218")
        self.assertEqual(validated[0]["unit"], "mg/dL")

    def test_case_8_glucose_mmol_preserved(self):
        """Case 8: Glucose: 11.2 mmol/L -> Recognized as glucose, unit mmol/L preserved"""
        metadata = {}
        candidates = [
            ExtractedCandidate(raw_name="Fasting Glucose", value="11.2", unit="mmol/L", reference_range="3.9 - 5.6", flag="High")
        ]

        validated, unclassified, warnings = ConfidenceValidator.process_and_validate(candidates, metadata)

        self.assertEqual(len(validated), 1)
        self.assertEqual(validated[0]["canonical_name"], "glucose_fasting")
        self.assertEqual(validated[0]["unit"], "mmol/L")
        self.assertEqual(validated[0]["value"], "11.2")


if __name__ == "__main__":
    unittest.main()
