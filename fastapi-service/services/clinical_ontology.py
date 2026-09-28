"""
Central Clinical Parameter Ontology
MedAssist AI — Standardized Medical Analytes, Synonyms, Accepted Units, and Reference Ranges.

Covers 5 Core Clinical Domains:
1. Diabetes & Glycemic Control
2. Complete Blood Count (CBC) & Anemia
3. Cardiovascular & Lipid Profile
4. Renal / Kidney Function & Electrolytes
5. Hepatic / Liver Function (LFT)
+ Vital Signs & Anthropometrics
"""

from typing import Dict, List, Any, Optional, Set

class AnalyteDefinition:
    def __init__(
        self,
        canonical_name: str,
        display_name: str,
        category: str,
        organ_system: str,
        synonyms: List[str],
        accepted_units: List[str],
        default_unit: str,
        default_range: str,
        expected_numeric_range: tuple = (0.0, 10000.0),
        is_categorical: bool = False
    ):
        self.canonical_name = canonical_name
        self.display_name = display_name
        self.category = category
        self.organ_system = organ_system
        self.synonyms = [s.strip().lower() for s in synonyms]
        self.accepted_units = [u.strip().lower() for u in accepted_units]
        self.default_unit = default_unit
        self.default_range = default_range
        self.expected_numeric_range = expected_numeric_range
        self.is_categorical = is_categorical

    def to_dict(self) -> Dict[str, Any]:
        return {
            "canonical_name": self.canonical_name,
            "display_name": self.display_name,
            "category": self.category,
            "organ_system": self.organ_system,
            "synonyms": self.synonyms,
            "accepted_units": self.accepted_units,
            "default_unit": self.default_unit,
            "default_range": self.default_range,
            "expected_numeric_range": self.expected_numeric_range,
            "is_categorical": self.is_categorical
        }


# ================================================================================
# CLINICAL ONTOLOGY REPOSITORY
# ================================================================================
CLINICAL_ONTOLOGY: Dict[str, AnalyteDefinition] = {
    # ----------------------------------------------------------------------------
    # 1. DIABETES & GLYCEMIC
    # ----------------------------------------------------------------------------
    "glucose_fasting": AnalyteDefinition(
        canonical_name="glucose_fasting",
        display_name="Fasting Blood Glucose",
        category="Biochemistry",
        organ_system="Metabolic",
        synonyms=[
            "fasting blood glucose", "fasting blood sugar", "fbs", "fpg",
            "fasting plasma glucose", "glucose fasting", "sugar fasting",
            "blood sugar fasting", "glucose (fasting)", "plasma glucose fasting",
            "blood glucose fasting", "fasting glucose"
        ],
        accepted_units=["mg/dl", "mmol/l", "mg%", "mg/100ml"],
        default_unit="mg/dL",
        default_range="70 - 100",
        expected_numeric_range=(20.0, 1500.0)
    ),
    "glucose_postprandial": AnalyteDefinition(
        canonical_name="glucose_postprandial",
        display_name="Postprandial Blood Glucose",
        category="Biochemistry",
        organ_system="Metabolic",
        synonyms=[
            "postprandial blood glucose", "post prandial blood sugar", "ppbs", "ppbg",
            "postprandial plasma glucose", "glucose pp", "sugar pp",
            "blood sugar post prandial", "glucose post prandial", "2 hr pp glucose"
        ],
        accepted_units=["mg/dl", "mmol/l", "mg%", "mg/100ml"],
        default_unit="mg/dL",
        default_range="< 140",
        expected_numeric_range=(20.0, 1500.0)
    ),
    "glucose_random": AnalyteDefinition(
        canonical_name="glucose_random",
        display_name="Random Blood Glucose",
        category="Biochemistry",
        organ_system="Metabolic",
        synonyms=[
            "random blood glucose", "random blood sugar", "rbs",
            "random plasma glucose", "glucose random", "sugar random", "blood glucose random"
        ],
        accepted_units=["mg/dl", "mmol/l", "mg%"],
        default_unit="mg/dL",
        default_range="70 - 140",
        expected_numeric_range=(20.0, 1500.0)
    ),
    "hba1c": AnalyteDefinition(
        canonical_name="hba1c",
        display_name="HbA1c (Glycated Hemoglobin)",
        category="Biochemistry",
        organ_system="Metabolic",
        synonyms=[
            "hba1c", "glycated hemoglobin", "glycosylated hemoglobin",
            "hemoglobin a1c", "a1c", "glyco hb", "hba1c (glycated hemoglobin)"
        ],
        accepted_units=["%", "mmol/mol"],
        default_unit="%",
        default_range="< 5.7",
        expected_numeric_range=(3.0, 25.0)
    ),
    "fasting_insulin": AnalyteDefinition(
        canonical_name="fasting_insulin",
        display_name="Fasting Serum Insulin",
        category="Endocrinology",
        organ_system="Metabolic",
        synonyms=["fasting insulin", "serum insulin", "insulin fasting", "insulin"],
        accepted_units=["uiu/ml", "uIU/mL", "pmol/l", "uu/ml", "miu/l"],
        default_unit="uIU/mL",
        default_range="2.6 - 24.9",
        expected_numeric_range=(0.5, 500.0)
    ),

    # ----------------------------------------------------------------------------
    # 2. COMPLETE BLOOD COUNT (CBC) & HEMATOLOGY
    # ----------------------------------------------------------------------------
    "hemoglobin": AnalyteDefinition(
        canonical_name="hemoglobin",
        display_name="Hemoglobin",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "hemoglobin", "hb", "hgb", "hemoglobin total", "haemoglobin",
            "hb (hemoglobin)", "total hemoglobin"
        ],
        accepted_units=["g/dl", "gm/dl", "g/l", "gm%", "g%"],
        default_unit="g/dL",
        default_range="13.0 - 17.0",
        expected_numeric_range=(2.0, 30.0)
    ),
    "wbc_count": AnalyteDefinition(
        canonical_name="wbc_count",
        display_name="Total White Blood Cell Count (WBC)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "wbc", "total wbc", "tlc", "total leucocyte count", "white blood cell count",
            "total leukocyte count", "wbc count", "leukocytes", "leucocytes"
        ],
        accepted_units=["cells/cumm", "cells/mcl", "/cumm", "cumm", "10^3/ul", "k/ul", "10^9/l", "thou/mcl"],
        default_unit="cells/cumm",
        default_range="4000 - 11000",
        expected_numeric_range=(100.0, 200000.0)
    ),
    "rbc_count": AnalyteDefinition(
        canonical_name="rbc_count",
        display_name="Red Blood Cell Count (RBC)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "rbc", "total rbc", "red blood cell count", "red blood cells",
            "erythrocyte count", "rbc count", "erythrocytes", "total rbc count"
        ],
        accepted_units=["mill/cumm", "million/cumm", "10^6/ul", "mil/cumm", "10^12/l", "m/ul", "millions/mcl"],
        default_unit="mill/cumm",
        default_range="4.5 - 5.5",
        expected_numeric_range=(0.5, 15.0)
    ),
    "packed_cell_volume": AnalyteDefinition(
        canonical_name="packed_cell_volume",
        display_name="Packed Cell Volume (PCV / Hematocrit)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "pcv", "packed cell volume", "hematocrit", "hct", "packed cell volume (pcv)",
            "haematocrit", "pcv / hematocrit"
        ],
        accepted_units=["%", "l/l"],
        default_unit="%",
        default_range="40 - 50",
        expected_numeric_range=(10.0, 80.0)
    ),
    "platelet_count": AnalyteDefinition(
        canonical_name="platelet_count",
        display_name="Platelet Count",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "platelet count", "platelets", "plt", "total platelets",
            "platelet", "thrombocytes", "thrombocyte count"
        ],
        accepted_units=["lakhs/cumm", "lakh/cumm", "10^3/ul", "k/ul", "cells/cumm", "/cumm", "10^5/cumm", "thou/mcl", "10^9/l"],
        default_unit="lakhs/cumm",
        default_range="1.5 - 4.5",
        expected_numeric_range=(5.0, 2000000.0)
    ),
    "mcv": AnalyteDefinition(
        canonical_name="mcv",
        display_name="Mean Corpuscular Volume (MCV)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["mcv", "mean corpuscular volume", "mean cell volume"],
        accepted_units=["fl", "fL", "um^3"],
        default_unit="fL",
        default_range="80 - 100",
        expected_numeric_range=(30.0, 160.0)
    ),
    "mch": AnalyteDefinition(
        canonical_name="mch",
        display_name="Mean Corpuscular Hemoglobin (MCH)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["mch", "mean corpuscular hemoglobin", "mean cell hemoglobin"],
        accepted_units=["pg", "pico grams", "picograms"],
        default_unit="pg",
        default_range="27 - 33",
        expected_numeric_range=(10.0, 60.0)
    ),
    "mchc": AnalyteDefinition(
        canonical_name="mchc",
        display_name="Mean Corpuscular Hemoglobin Concentration (MCHC)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["mchc", "mean corpuscular hemoglobin concentration", "mean cell hb conc"],
        accepted_units=["g/dl", "%", "g/l"],
        default_unit="g/dL",
        default_range="32 - 36",
        expected_numeric_range=(15.0, 50.0)
    ),
    "rdw": AnalyteDefinition(
        canonical_name="rdw",
        display_name="Red Cell Distribution Width (RDW)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["rdw", "rdw-cv", "rdw cv", "red cell distribution width", "rdw-sd", "rdw sd"],
        accepted_units=["%", "fl"],
        default_unit="%",
        default_range="11.5 - 14.5",
        expected_numeric_range=(5.0, 40.0)
    ),
    "neutrophils": AnalyteDefinition(
        canonical_name="neutrophils",
        display_name="Neutrophils",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["neutrophils", "neutrophil count", "neut", "polymorphs", "segs", "segmented neutrophils"],
        accepted_units=["%", "/cumm", "cells/cumm", "10^3/ul"],
        default_unit="%",
        default_range="40 - 70",
        expected_numeric_range=(0.0, 100.0)
    ),
    "lymphocytes": AnalyteDefinition(
        canonical_name="lymphocytes",
        display_name="Lymphocytes",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["lymphocytes", "lymphocyte count", "lymph", "lymphs"],
        accepted_units=["%", "/cumm", "cells/cumm", "10^3/ul"],
        default_unit="%",
        default_range="20 - 40",
        expected_numeric_range=(0.0, 100.0)
    ),
    "monocytes": AnalyteDefinition(
        canonical_name="monocytes",
        display_name="Monocytes",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["monocytes", "monocyte count", "mono"],
        accepted_units=["%", "/cumm", "cells/cumm"],
        default_unit="%",
        default_range="2 - 8",
        expected_numeric_range=(0.0, 50.0)
    ),
    "eosinophils": AnalyteDefinition(
        canonical_name="eosinophils",
        display_name="Eosinophils",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["eosinophils", "eosinophil count", "eos", "absolute eosinophil count", "aec"],
        accepted_units=["%", "/cumm", "cells/cumm"],
        default_unit="%",
        default_range="1 - 6",
        expected_numeric_range=(0.0, 50.0)
    ),
    "basophils": AnalyteDefinition(
        canonical_name="basophils",
        display_name="Basophils",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["basophils", "basophil count", "baso"],
        accepted_units=["%", "/cumm", "cells/cumm"],
        default_unit="%",
        default_range="0 - 2",
        expected_numeric_range=(0.0, 20.0)
    ),
    "esr": AnalyteDefinition(
        canonical_name="esr",
        display_name="Erythrocyte Sedimentation Rate (ESR)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["esr", "erythrocyte sedimentation rate", "esr (westergren)", "esr westergren"],
        accepted_units=["mm/hr", "mm/1st hr", "mm"],
        default_unit="mm/hr",
        default_range="0 - 20",
        expected_numeric_range=(0.0, 150.0)
    ),

    # ----------------------------------------------------------------------------
    # 3. CARDIOVASCULAR & LIPID PROFILE
    # ----------------------------------------------------------------------------
    "cholesterol_total": AnalyteDefinition(
        canonical_name="cholesterol_total",
        display_name="Total Cholesterol",
        category="Lipid Profile",
        organ_system="Cardiovascular",
        synonyms=[
            "total cholesterol", "cholesterol", "serum cholesterol",
            "cholesterol total", "cholesterol (total)"
        ],
        accepted_units=["mg/dl", "mmol/l", "mg%"],
        default_unit="mg/dL",
        default_range="< 200",
        expected_numeric_range=(20.0, 1000.0)
    ),
    "triglycerides": AnalyteDefinition(
        canonical_name="triglycerides",
        display_name="Triglycerides",
        category="Lipid Profile",
        organ_system="Cardiovascular",
        synonyms=["triglycerides", "serum triglycerides", "tg", "trigs", "triglyceride"],
        accepted_units=["mg/dl", "mmol/l", "mg%"],
        default_unit="mg/dL",
        default_range="< 150",
        expected_numeric_range=(10.0, 3000.0)
    ),
    "cholesterol_hdl": AnalyteDefinition(
        canonical_name="cholesterol_hdl",
        display_name="HDL Cholesterol",
        category="Lipid Profile",
        organ_system="Cardiovascular",
        synonyms=["hdl cholesterol", "hdl", "hdl-c", "serum hdl", "high density lipoprotein"],
        accepted_units=["mg/dl", "mmol/l", "mg%"],
        default_unit="mg/dL",
        default_range="> 40",
        expected_numeric_range=(5.0, 200.0)
    ),
    "cholesterol_ldl": AnalyteDefinition(
        canonical_name="cholesterol_ldl",
        display_name="LDL Cholesterol",
        category="Lipid Profile",
        organ_system="Cardiovascular",
        synonyms=["ldl cholesterol", "ldl", "ldl-c", "serum ldl", "low density lipoprotein", "calculated ldl"],
        accepted_units=["mg/dl", "mmol/l", "mg%"],
        default_unit="mg/dL",
        default_range="< 100",
        expected_numeric_range=(5.0, 600.0)
    ),
    "cholesterol_vldl": AnalyteDefinition(
        canonical_name="cholesterol_vldl",
        display_name="VLDL Cholesterol",
        category="Lipid Profile",
        organ_system="Cardiovascular",
        synonyms=["vldl cholesterol", "vldl", "vldl-c", "very low density lipoprotein"],
        accepted_units=["mg/dl", "mmol/l", "mg%"],
        default_unit="mg/dL",
        default_range="< 30",
        expected_numeric_range=(2.0, 200.0)
    ),
    "troponin_i": AnalyteDefinition(
        canonical_name="troponin_i",
        display_name="Troponin I",
        category="Cardiac Markers",
        organ_system="Cardiovascular",
        synonyms=["troponin i", "serum troponin i", "hs-trop i", "high sensitivity troponin i", "trop i"],
        accepted_units=["ng/ml", "pg/ml", "ug/l", "ng/l"],
        default_unit="ng/mL",
        default_range="< 0.04",
        expected_numeric_range=(0.0, 500.0)
    ),
    "troponin_t": AnalyteDefinition(
        canonical_name="troponin_t",
        display_name="Troponin T",
        category="Cardiac Markers",
        organ_system="Cardiovascular",
        synonyms=["troponin t", "serum troponin t", "hs-trop t", "trop t"],
        accepted_units=["ng/ml", "pg/ml", "ng/l"],
        default_unit="ng/mL",
        default_range="< 0.01",
        expected_numeric_range=(0.0, 500.0)
    ),
    "ck_mb": AnalyteDefinition(
        canonical_name="ck_mb",
        display_name="Creatine Kinase-MB (CK-MB)",
        category="Cardiac Markers",
        organ_system="Cardiovascular",
        synonyms=["ck-mb", "ckmb", "creatine kinase mb", "cpk-mb", "cpk mb"],
        accepted_units=["u/l", "iu/l", "ng/ml"],
        default_unit="U/L",
        default_range="< 25",
        expected_numeric_range=(0.0, 1000.0)
    ),
    "hs_crp": AnalyteDefinition(
        canonical_name="hs_crp",
        display_name="High-Sensitivity C-Reactive Protein (hs-CRP)",
        category="Cardiac Markers",
        organ_system="Cardiovascular",
        synonyms=["hs-crp", "hscrp", "high sensitivity crp", "crp (hs)", "cardiac crp"],
        accepted_units=["mg/l", "mg/dl"],
        default_unit="mg/L",
        default_range="< 1.0",
        expected_numeric_range=(0.0, 100.0)
    ),

    # ----------------------------------------------------------------------------
    # 4. RENAL / KIDNEY FUNCTION & ELECTROLYTES
    # ----------------------------------------------------------------------------
    "serum_creatinine": AnalyteDefinition(
        canonical_name="serum_creatinine",
        display_name="Serum Creatinine",
        category="Kidney Function",
        organ_system="Renal",
        synonyms=[
            "serum creatinine", "creatinine", "creat", "s. creatinine",
            "creatinine serum", "blood creatinine"
        ],
        accepted_units=["mg/dl", "umol/l", "µmol/l", "mg%"],
        default_unit="mg/dL",
        default_range="0.7 - 1.3",
        expected_numeric_range=(0.1, 30.0)
    ),
    "blood_urea": AnalyteDefinition(
        canonical_name="blood_urea",
        display_name="Blood Urea Nitrogen (BUN / Urea)",
        category="Kidney Function",
        organ_system="Renal",
        synonyms=[
            "blood urea", "urea", "bun", "blood urea nitrogen",
            "s. urea", "serum urea", "urea serum"
        ],
        accepted_units=["mg/dl", "mmol/l", "mg%"],
        default_unit="mg/dL",
        default_range="15 - 45",
        expected_numeric_range=(1.0, 300.0)
    ),
    "uric_acid": AnalyteDefinition(
        canonical_name="uric_acid",
        display_name="Serum Uric Acid",
        category="Kidney Function",
        organ_system="Renal",
        synonyms=["uric acid", "serum uric acid", "s. uric acid", "blood uric acid"],
        accepted_units=["mg/dl", "umol/l", "µmol/l"],
        default_unit="mg/dL",
        default_range="3.5 - 7.2",
        expected_numeric_range=(0.5, 30.0)
    ),
    "egfr": AnalyteDefinition(
        canonical_name="egfr",
        display_name="Estimated Glomerular Filtration Rate (eGFR)",
        category="Kidney Function",
        organ_system="Renal",
        synonyms=["egfr", "estimated gfr", "gfr", "estimated glomerular filtration rate"],
        accepted_units=["ml/min/1.73m2", "ml/min", "mL/min/1.73 m2"],
        default_unit="mL/min/1.73 m2",
        default_range="> 90",
        expected_numeric_range=(1.0, 200.0)
    ),
    "serum_sodium": AnalyteDefinition(
        canonical_name="serum_sodium",
        display_name="Serum Sodium (Na+)",
        category="Electrolytes",
        organ_system="Renal",
        synonyms=["sodium", "serum sodium", "na", "na+", "s. sodium", "electrolytes - sodium"],
        accepted_units=["meq/l", "mmol/l"],
        default_unit="mEq/L",
        default_range="135 - 145",
        expected_numeric_range=(80.0, 200.0)
    ),
    "serum_potassium": AnalyteDefinition(
        canonical_name="serum_potassium",
        display_name="Serum Potassium (K+)",
        category="Electrolytes",
        organ_system="Renal",
        synonyms=["potassium", "serum potassium", "k", "k+", "s. potassium", "electrolytes - potassium"],
        accepted_units=["meq/l", "mmol/l"],
        default_unit="mEq/L",
        default_range="3.5 - 5.1",
        expected_numeric_range=(1.0, 15.0)
    ),
    "serum_chloride": AnalyteDefinition(
        canonical_name="serum_chloride",
        display_name="Serum Chloride (Cl-)",
        category="Electrolytes",
        organ_system="Renal",
        synonyms=["chloride", "serum chloride", "cl", "cl-", "s. chloride"],
        accepted_units=["meq/l", "mmol/l"],
        default_unit="mEq/L",
        default_range="96 - 106",
        expected_numeric_range=(50.0, 180.0)
    ),
    "serum_calcium": AnalyteDefinition(
        canonical_name="serum_calcium",
        display_name="Serum Calcium",
        category="Electrolytes",
        organ_system="Renal",
        synonyms=["calcium", "serum calcium", "total calcium", "ca", "s. calcium"],
        accepted_units=["mg/dl", "mmol/l"],
        default_unit="mg/dL",
        default_range="8.5 - 10.5",
        expected_numeric_range=(2.0, 25.0)
    ),

    # ----------------------------------------------------------------------------
    # 5. HEPATIC / LIVER FUNCTION (LFT)
    # ----------------------------------------------------------------------------
    "alt_sgpt": AnalyteDefinition(
        canonical_name="alt_sgpt",
        display_name="Alanine Aminotransferase (ALT / SGPT)",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=[
            "alt", "sgpt", "alanine aminotransferase", "alanine transaminase",
            "sgpt (alt)", "alt (sgpt)", "serum glutamic pyruvic transaminase"
        ],
        accepted_units=["u/l", "iu/l", "u/ml"],
        default_unit="U/L",
        default_range="< 45",
        expected_numeric_range=(1.0, 5000.0)
    ),
    "ast_sgot": AnalyteDefinition(
        canonical_name="ast_sgot",
        display_name="Aspartate Aminotransferase (AST / SGOT)",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=[
            "ast", "sgot", "aspartate aminotransferase", "aspartate transaminase",
            "sgot (ast)", "ast (sgot)", "serum glutamic oxaloacetic transaminase"
        ],
        accepted_units=["u/l", "iu/l", "u/ml"],
        default_unit="U/L",
        default_range="< 40",
        expected_numeric_range=(1.0, 5000.0)
    ),
    "alkaline_phosphatase": AnalyteDefinition(
        canonical_name="alkaline_phosphatase",
        display_name="Alkaline Phosphatase (ALP)",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["alp", "alkaline phosphatase", "alk phos", "s. alkaline phosphatase"],
        accepted_units=["u/l", "iu/l", "ka units"],
        default_unit="U/L",
        default_range="40 - 130",
        expected_numeric_range=(5.0, 3000.0)
    ),
    "bilirubin_total": AnalyteDefinition(
        canonical_name="bilirubin_total",
        display_name="Total Bilirubin",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=[
            "total bilirubin", "bilirubin total", "serum bilirubin total",
            "s. bilirubin (total)", "bilirubin (total)", "total serum bilirubin"
        ],
        accepted_units=["mg/dl", "umol/l", "µmol/l"],
        default_unit="mg/dL",
        default_range="0.2 - 1.2",
        expected_numeric_range=(0.05, 50.0)
    ),
    "bilirubin_direct": AnalyteDefinition(
        canonical_name="bilirubin_direct",
        display_name="Direct Bilirubin (Conjugated)",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["direct bilirubin", "conjugated bilirubin", "bilirubin direct", "s. bilirubin (direct)"],
        accepted_units=["mg/dl", "umol/l", "µmol/l"],
        default_unit="mg/dL",
        default_range="< 0.3",
        expected_numeric_range=(0.0, 30.0)
    ),
    "bilirubin_indirect": AnalyteDefinition(
        canonical_name="bilirubin_indirect",
        display_name="Indirect Bilirubin (Unconjugated)",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["indirect bilirubin", "unconjugated bilirubin", "bilirubin indirect"],
        accepted_units=["mg/dl", "umol/l", "µmol/l"],
        default_unit="mg/dL",
        default_range="0.2 - 0.8",
        expected_numeric_range=(0.0, 30.0)
    ),
    "total_protein": AnalyteDefinition(
        canonical_name="total_protein",
        display_name="Total Serum Protein",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["total protein", "protein total", "serum protein", "s. total protein"],
        accepted_units=["g/dl", "gm/dl", "g/l"],
        default_unit="g/dL",
        default_range="6.0 - 8.3",
        expected_numeric_range=(1.0, 15.0)
    ),
    "serum_albumin": AnalyteDefinition(
        canonical_name="serum_albumin",
        display_name="Serum Albumin",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["albumin", "serum albumin", "s. albumin", "albumin serum"],
        accepted_units=["g/dl", "gm/dl", "g/l"],
        default_unit="g/dL",
        default_range="3.5 - 5.0",
        expected_numeric_range=(0.5, 10.0)
    ),
    "serum_globulin": AnalyteDefinition(
        canonical_name="serum_globulin",
        display_name="Serum Globulin",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["globulin", "serum globulin", "s. globulin"],
        accepted_units=["g/dl", "gm/dl", "g/l"],
        default_unit="g/dL",
        default_range="2.0 - 3.5",
        expected_numeric_range=(0.5, 10.0)
    ),
    "ag_ratio": AnalyteDefinition(
        canonical_name="ag_ratio",
        display_name="Albumin / Globulin (A/G) Ratio",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["a/g ratio", "ag ratio", "albumin globulin ratio", "albumin/globulin ratio"],
        accepted_units=["ratio", ""],
        default_unit="",
        default_range="1.0 - 2.2",
        expected_numeric_range=(0.1, 10.0)
    ),
    "ggt": AnalyteDefinition(
        canonical_name="ggt",
        display_name="Gamma-Glutamyl Transferase (GGT)",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["ggt", "gamma gt", "gamma glutamyl transferase", "ggtp"],
        accepted_units=["u/l", "iu/l"],
        default_unit="U/L",
        default_range="< 55",
        expected_numeric_range=(1.0, 2000.0)
    ),

    # ----------------------------------------------------------------------------
    # 6. VITAL SIGNS & ANTHROPOMETRICS
    # ----------------------------------------------------------------------------
    "bp_systolic": AnalyteDefinition(
        canonical_name="bp_systolic",
        display_name="Systolic Blood Pressure",
        category="Vital Signs",
        organ_system="Cardiovascular",
        synonyms=["systolic blood pressure", "systolic bp", "systolic", "bp systolic", "blood pressure systolic"],
        accepted_units=["mmhg", "mm hg"],
        default_unit="mmHg",
        default_range="90 - 120",
        expected_numeric_range=(40.0, 300.0)
    ),
    "bp_diastolic": AnalyteDefinition(
        canonical_name="bp_diastolic",
        display_name="Diastolic Blood Pressure",
        category="Vital Signs",
        organ_system="Cardiovascular",
        synonyms=["diastolic blood pressure", "diastolic bp", "diastolic", "bp diastolic", "blood pressure diastolic"],
        accepted_units=["mmhg", "mm hg"],
        default_unit="mmHg",
        default_range="60 - 80",
        expected_numeric_range=(30.0, 200.0)
    ),
    "heart_rate": AnalyteDefinition(
        canonical_name="heart_rate",
        display_name="Heart Rate / Pulse",
        category="Vital Signs",
        organ_system="Cardiovascular",
        synonyms=["heart rate", "pulse", "pulse rate", "hr", "pr", "radial pulse"],
        accepted_units=["bpm", "/min", "beats/min"],
        default_unit="bpm",
        default_range="60 - 100",
        expected_numeric_range=(20.0, 300.0)
    ),
    "respiratory_rate": AnalyteDefinition(
        canonical_name="respiratory_rate",
        display_name="Respiratory Rate",
        category="Vital Signs",
        organ_system="Pulmonary",
        synonyms=["respiratory rate", "rr", "breathing rate"],
        accepted_units=["breaths/min", "/min", "bpm"],
        default_unit="breaths/min",
        default_range="12 - 20",
        expected_numeric_range=(4.0, 80.0)
    ),
    "spo2": AnalyteDefinition(
        canonical_name="spo2",
        display_name="Oxygen Saturation (SpO2)",
        category="Vital Signs",
        organ_system="Pulmonary",
        synonyms=["spo2", "oxygen saturation", "o2 sat", "pulse oximetry", "sat o2"],
        accepted_units=["%", "percent"],
        default_unit="%",
        default_range="95 - 100",
        expected_numeric_range=(40.0, 100.0)
    ),
    "body_temperature": AnalyteDefinition(
        canonical_name="body_temperature",
        display_name="Body Temperature",
        category="Vital Signs",
        organ_system="General",
        synonyms=["body temperature", "temperature", "temp", "oral temperature"],
        accepted_units=["c", "f", "°c", "°f", "deg c", "deg f"],
        default_unit="°F",
        default_range="97.0 - 99.0",
        expected_numeric_range=(30.0, 115.0)
    ),
    "bmi": AnalyteDefinition(
        canonical_name="bmi",
        display_name="Body Mass Index (BMI)",
        category="Anthropometrics",
        organ_system="General",
        synonyms=["bmi", "body mass index", "quetelet index"],
        accepted_units=["kg/m2", "kg/m^2", ""],
        default_unit="kg/m²",
        default_range="18.5 - 24.9",
        expected_numeric_range=(10.0, 90.0)
    ),
    "weight": AnalyteDefinition(
        canonical_name="weight",
        display_name="Body Weight",
        category="Anthropometrics",
        organ_system="General",
        synonyms=["body weight", "weight", "wt"],
        accepted_units=["kg", "lbs", "pounds"],
        default_unit="kg",
        default_range="Standard",
        expected_numeric_range=(1.0, 400.0)
    ),
    "height": AnalyteDefinition(
        canonical_name="height",
        display_name="Height",
        category="Anthropometrics",
        organ_system="General",
        synonyms=["height", "ht", "stature"],
        accepted_units=["cm", "m", "feet", "inches", "in", "ft"],
        default_unit="cm",
        default_range="Standard",
        expected_numeric_range=(30.0, 300.0)
    )
}


# Precomputed Reverse Synonym Index
_SYNONYM_INDEX: Dict[str, str] = {}
for canonical_key, item in CLINICAL_ONTOLOGY.items():
    for syn in item.synonyms:
        _SYNONYM_INDEX[syn] = canonical_key


def get_ontology_definition(canonical_key: str) -> Optional[AnalyteDefinition]:
    return CLINICAL_ONTOLOGY.get(canonical_key)


def find_canonical_key_by_exact_synonym(query: str) -> Optional[str]:
    if not query:
        return None
    cleaned = query.strip().lower()
    return _SYNONYM_INDEX.get(cleaned)


def is_unit_compatible(canonical_key: str, unit: str) -> bool:
    """Verifies whether an extracted unit is valid for the given canonical analyte."""
    if not unit:
        # Unit missing from report is allowed if analyte matches strongly
        return True
    
    definition = CLINICAL_ONTOLOGY.get(canonical_key)
    if not definition:
        return False
    
    u_clean = unit.strip().lower()
    
    # Generic 'units' is not a specific analyte unit, but permitted if no specific alternative
    if u_clean in ['units', 'unit', '']:
        return True
        
    for accepted in definition.accepted_units:
        if u_clean == accepted or u_clean in accepted or accepted in u_clean:
            return True
    return False


def get_all_synonym_list() -> List[str]:
    """Returns flat list of all recognized synonyms for vector / fuzzy index construction."""
    return list(_SYNONYM_INDEX.keys())
