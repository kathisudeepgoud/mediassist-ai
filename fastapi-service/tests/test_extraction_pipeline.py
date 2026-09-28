"""
Comprehensive Automated Regression Test Suite for Medical PDF Extraction Pipeline
MedAssist AI — Tests Real-World Laboratory PDF Reports & Edge Cases
"""

import sys
import unittest
from pathlib import Path

# Add fastapi-service to sys.path
SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from services.extraction.pipeline import MedicalPDFExtractor
from services.extraction.pdf_ingestion import PDFIngestionService, PDFIngestionError
from services.extraction.models import AbnormalityFlag, CandidateCategory
from services.extraction.candidate_classifier import CandidateClassifier


class TestMedicalPDFExtractionPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.uploads_dir = SERVICE_ROOT.parent / "server" / "uploads"

    def test_01_sree_sai_fasting_and_postprandial(self):
        """
        TEST: Sree Sai Lab Report
        Must extract BOTH:
        - Fasting Blood Sugar: 155 mg/dL (Ref: 60 - 110)
        - Postprandial Blood Sugar: 218 mg/dl (Ref: 70 - 150)
        Must NOT leak ADA guidelines (100-125, >=126, 150-199, 200) into patient results.
        """
        # Search for available Sree Sai Fasting & PPBS report
        candidate_names = [
            "report-1790008341659-556434696.pdf",
            "report-1790179970218-439342752.pdf",
            "report-1789881275788-997568206.pdf"
        ]
        pdf_path = None
        for name in candidate_names:
            p = self.uploads_dir / name
            if p.exists():
                pdf_path = p
                break

        self.assertIsNotNone(pdf_path, f"Missing test PDF among candidates: {candidate_names}")
        self.assertTrue(pdf_path.exists(), f"Missing test PDF: {pdf_path}")

        res = MedicalPDFExtractor.extract_pdf(pdf_path)

        self.assertEqual(res.page_count, 1)
        self.assertIn("Praveena", res.patient.name or "")
        self.assertEqual(res.patient.age, 46)
        self.assertEqual(res.patient.sex, "Female")
        self.assertEqual(res.metadata.sample_id, "262590091")

        param_map = {p.canonical_key: p for p in res.clinical_parameters}

        # Must have both fasting and postprandial glucose
        self.assertIn("glucose_fasting", param_map)
        self.assertIn("glucose_postprandial", param_map)

        fbs = param_map["glucose_fasting"]
        self.assertEqual(float(fbs.value), 155.0)
        self.assertIn("mg/d", fbs.unit.lower())
        self.assertIn("60 - 110", fbs.reference_range or "")
        self.assertEqual(fbs.abnormality, AbnormalityFlag.HIGH)

        ppbs = param_map["glucose_postprandial"]
        self.assertEqual(float(ppbs.value), 218.0)
        self.assertIn("mg/d", ppbs.unit.lower())
        self.assertIn("70 - 150", ppbs.reference_range or "")
        self.assertEqual(ppbs.abnormality, AbnormalityFlag.HIGH)

        # Ensure no explanatory threshold numbers leaked as clinical parameters
        all_values = [p.value for p in res.clinical_parameters]
        self.assertNotIn(126.0, all_values)
        self.assertNotIn(100.0, all_values)
        self.assertNotIn(199.0, all_values)
        self.assertNotIn(200.0, all_values)

    def test_02_cbc_report_format(self):
        """
        TEST: Standard 2-Page CBC Report
        Must extract all 13 CBC parameters from Page 1 and Demographics from Page 2.
        """
        pdf_path = self.uploads_dir / "cbc-report-format.pdf"
        self.assertTrue(pdf_path.exists(), f"Missing test PDF: {pdf_path}")

        res = MedicalPDFExtractor.extract_pdf(pdf_path)

        self.assertEqual(res.page_count, 2)
        self.assertIn("Saubhik", res.patient.name or "")
        self.assertEqual(res.patient.age, 27)
        self.assertEqual(res.patient.sex, "Male")

        param_map = {p.canonical_key: p for p in res.clinical_parameters}

        expected_keys = [
            "hemoglobin", "wbc_count", "neutrophils", "lymphocytes",
            "eosinophils", "monocytes", "basophils", "platelet_count",
            "rbc_count", "hematocrit", "mcv", "mch", "mchc"
        ]
        for k in expected_keys:
            self.assertIn(k, param_map, f"Missing CBC key: {k}")

        self.assertEqual(float(param_map["hemoglobin"].value), 15.0)
        self.assertEqual(float(param_map["wbc_count"].value), 5100.0)
        self.assertEqual(float(param_map["neutrophils"].value), 79.0)
        self.assertEqual(float(param_map["lymphocytes"].value), 18.0)
        self.assertEqual(param_map["lymphocytes"].flag, "L")
        self.assertEqual(float(param_map["mchc"].value), 35.7)
        self.assertEqual(param_map["mchc"].flag, "H")

    def test_03_drlogy_cbc_template(self):
        """
        TEST: Drlogy CBC Test Report
        Must extract all CBC parameters and preserve High/Low/Borderline flags.
        """
        pdf_path = self.uploads_dir / "CBC-test-report-format-example-sample-template-Drlogy-lab-report.pdf"
        self.assertTrue(pdf_path.exists(), f"Missing test PDF: {pdf_path}")

        res = MedicalPDFExtractor.extract_pdf(pdf_path)

        param_map = {p.canonical_key: p for p in res.clinical_parameters}

        self.assertIn("hemoglobin", param_map)
        self.assertEqual(float(param_map["hemoglobin"].value), 12.5)
        self.assertEqual((param_map["hemoglobin"].flag or "").lower(), "low")

        self.assertIn("hematocrit", param_map)
        self.assertEqual(float(param_map["hematocrit"].value), 57.5)
        self.assertEqual((param_map["hematocrit"].flag or "").lower(), "high")

        self.assertIn("platelet_count", param_map)
        self.assertEqual(float(param_map["platelet_count"].value), 150000.0)
        self.assertEqual((param_map["platelet_count"].flag or "").lower(), "borderline")

        self.assertIn("neutrophils", param_map)
        self.assertEqual(float(param_map["neutrophils"].value), 60.0)

    def test_04_kft_report(self):
        """
        TEST: Kidney Function Test (KFT)
        Must extract Urea, Creatinine, BUN, Ratios, Uric Acid, Calcium, Phosphorus, and Electrolytes.
        """
        pdf_path = self.uploads_dir / "report-1787152899485-514837299.pdf"
        self.assertTrue(pdf_path.exists(), f"Missing test PDF: {pdf_path}")

        res = MedicalPDFExtractor.extract_pdf(pdf_path)

        param_map = {p.canonical_key: p for p in res.clinical_parameters}

        self.assertIn("blood_urea", param_map)
        self.assertEqual(float(param_map["blood_urea"].value), 40.0)

        self.assertIn("serum_creatinine", param_map)
        self.assertEqual(float(param_map["serum_creatinine"].value), 1.1)

        self.assertIn("bun", param_map)
        self.assertEqual(float(param_map["bun"].value), 15.0)

        self.assertIn("bun_creatinine_ratio", param_map)
        self.assertEqual(float(param_map["bun_creatinine_ratio"].value), 13.64)

        self.assertIn("urea_creatinine_ratio", param_map)
        self.assertEqual(float(param_map["urea_creatinine_ratio"].value), 36.36)

        self.assertIn("sodium", param_map)
        self.assertEqual(float(param_map["sodium"].value), 180.0)
        self.assertEqual(param_map["sodium"].flag, "H")

        self.assertIn("potassium", param_map)
        self.assertEqual(float(param_map["potassium"].value), 4.0)

        self.assertIn("chloride", param_map)
        self.assertEqual(float(param_map["chloride"].value), 105.0)

    def test_05_multipage_report(self):
        """
        TEST: 5-Page Multi-page Report
        Must process all 5 pages: CBC on p1-2, CRP on p3, Free T3/T4 on p4.
        """
        pdf_path = self.uploads_dir / "report-1787153032813-282082492.pdf"
        self.assertTrue(pdf_path.exists(), f"Missing test PDF: {pdf_path}")

        res = MedicalPDFExtractor.extract_pdf(pdf_path)

        self.assertEqual(res.page_count, 5)
        self.assertIn("Jyoti", res.patient.name or "")
        self.assertEqual(res.patient.age, 35)
        self.assertEqual(res.patient.sex, "Female")

        param_map = {p.canonical_key: p for p in res.clinical_parameters}

        # Page 1-2 CBC
        self.assertIn("hemoglobin", param_map)
        self.assertEqual(float(param_map["hemoglobin"].value), 10.7)

        # Page 3 CRP
        self.assertIn("crp", param_map)
        self.assertEqual(float(param_map["crp"].value), 3.1)
        self.assertIn("mg/l", param_map["crp"].unit.lower())

        # Page 4 Free T3 & T4
        self.assertIn("free_t3", param_map)
        self.assertEqual(float(param_map["free_t3"].value), 3.34)
        self.assertIn("free_t4", param_map)
        self.assertEqual(float(param_map["free_t4"].value), 1.21)

    def test_06_pdf_ingestion_security_and_validation(self):
        """
        TEST: PDF-only Ingestion Security
        Must reject non-PDF, corrupted, empty, or image buffers.
        """
        # Empty buffer
        with self.assertRaises(PDFIngestionError):
            PDFIngestionService.validate_and_load(b"")

        # JPEG bytes
        with self.assertRaises(PDFIngestionError):
            PDFIngestionService.validate_and_load(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00")

        # PNG bytes
        with self.assertRaises(PDFIngestionError):
            PDFIngestionService.validate_and_load(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")

        # Plain text non-PDF
        with self.assertRaises(PDFIngestionError):
            PDFIngestionService.validate_and_load(b"This is just a plain text file, not a PDF.")

    def test_07_candidate_classification_isolation(self):
        """
        TEST: Taxonomic Candidate Classifier
        Ensures identifiers, condition names, and interpretations are never clinical measurements.
        """
        c1 = CandidateClassifier.classify_candidate("Sample ID", "262590091")
        self.assertFalse(c1["is_clinical"])
        self.assertEqual(c1["category"], CandidateCategory.REPORT_IDENTIFIER)

        c2 = CandidateClassifier.classify_candidate("UHID", "P001928")
        self.assertFalse(c2["is_clinical"])
        self.assertEqual(c2["category"], CandidateCategory.PATIENT_IDENTIFIER)

        c3 = CandidateClassifier.classify_candidate("Diabetes mellitus", "126")
        self.assertFalse(c3["is_clinical"])
        self.assertEqual(c3["category"], CandidateCategory.DIAGNOSIS)

        c4 = CandidateClassifier.classify_candidate("Impaired Fasting Glucose", "110")
        self.assertFalse(c4["is_clinical"])
        self.assertEqual(c4["category"], CandidateCategory.INTERPRETATION_THRESHOLD)

        c5 = CandidateClassifier.classify_candidate("Fasting Blood Sugar", "155", "mg/dL", "60 - 110")
        self.assertTrue(c5["is_clinical"])
        self.assertEqual(c5["canonical_key"], "glucose_fasting")

        c6 = CandidateClassifier.classify_candidate("Biochemistry")
        self.assertFalse(c6["is_clinical"])
        self.assertEqual(c6["category"], CandidateCategory.SECTION_HEADER)

        c7 = CandidateClassifier.classify_candidate("Dr. Pathologist")
        self.assertFalse(c7["is_clinical"])
        self.assertEqual(c7["category"], CandidateCategory.METADATA)

        c8 = CandidateClassifier.classify_candidate("(Photometry)")
        self.assertFalse(c8["is_clinical"])
        self.assertEqual(c8["category"], CandidateCategory.METHODOLOGY)

        c9 = CandidateClassifier.classify_candidate("Collection Date")
        self.assertFalse(c9["is_clinical"])
        self.assertEqual(c9["category"], CandidateCategory.DATE_TIME)

        c10 = CandidateClassifier.classify_candidate("Page 1 of 2")
        self.assertFalse(c10["is_clinical"])
        self.assertEqual(c10["category"], CandidateCategory.ADMINISTRATIVE)


if __name__ == "__main__":
    unittest.main()
