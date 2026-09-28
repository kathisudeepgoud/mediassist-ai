"""
Standardized Clinical Parameter Ontology
MedAssist AI — Multi-Organ Analytes, Synonyms, Accepted Units, and Clinical Plausibility Bounds
"""

from typing import Dict, List, Any, Optional, Set, Tuple


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
        expected_numeric_range: Tuple[float, float] = (0.0, 10000.0),
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


CLINICAL_ONTOLOGY: Dict[str, AnalyteDefinition] = {
    # ----------------------------------------------------------------------------
    # 1. DIABETES & GLYCEMIC CONTROL
    # ----------------------------------------------------------------------------
    "glucose_fasting": AnalyteDefinition(
        canonical_name="glucose_fasting",
        display_name="Fasting Blood Sugar",
        category="Biochemistry",
        organ_system="Metabolic",
        synonyms=[
            "fasting blood sugar", "fasting blood glucose", "fbs", "fpg",
            "fasting plasma glucose", "glucose fasting", "sugar fasting",
            "blood sugar fasting", "glucose (fasting)", "plasma glucose fasting",
            "blood glucose fasting", "fasting glucose", "blood sugar (fasting)"
        ],
        accepted_units=["mg/dl", "mmol/l", "mg%", "mg/100ml"],
        default_unit="mg/dL",
        default_range="70 - 100",
        expected_numeric_range=(20.0, 1500.0)
    ),
    "glucose_postprandial": AnalyteDefinition(
        canonical_name="glucose_postprandial",
        display_name="Postprandial Blood Sugar",
        category="Biochemistry",
        organ_system="Metabolic",
        synonyms=[
            "postprandial blood sugar", "postprandial blood glucose", "ppbs", "ppbg",
            "post prandial blood sugar", "blood sugar pp", "glucose pp", "sugar pp",
            "postprandial plasma glucose", "glucose post prandial", "2 hr pp glucose",
            "2 hour pp glucose", "post prandial plasma glucose", "blood glucose pp"
        ],
        accepted_units=["mg/dl", "mmol/l", "mg%", "mg/100ml"],
        default_unit="mg/dL",
        default_range="< 140",
        expected_numeric_range=(20.0, 1500.0)
    ),
    "glucose_random": AnalyteDefinition(
        canonical_name="glucose_random",
        display_name="Random Blood Sugar",
        category="Biochemistry",
        organ_system="Metabolic",
        synonyms=[
            "random blood sugar", "random blood glucose", "rbs",
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

    # ----------------------------------------------------------------------------
    # 2. COMPLETE BLOOD COUNT (CBC) & HEMATOLOGY
    # ----------------------------------------------------------------------------
    "hemoglobin": AnalyteDefinition(
        canonical_name="hemoglobin",
        display_name="Hemoglobin",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "hemoglobin", "haemoglobin", "hb", "hgb", "total hemoglobin",
            "haemoglobin (hb)", "hemoglobin (hb)", "hemoglobin (photometry)"
        ],
        accepted_units=["g/dl", "gm/dl", "g/l", "gm%", "%"],
        default_unit="g/dL",
        default_range="13.0 - 17.0",
        expected_numeric_range=(1.0, 30.0)
    ),
    "wbc_count": AnalyteDefinition(
        canonical_name="wbc_count",
        display_name="Total Leukocyte Count (WBC)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "total leukocyte count", "total leucocyte count", "tlc", "wbc", "total wbc",
            "white blood cells", "white blood cell count", "total wbc count",
            "leukocyte count", "leucocyte count", "wbc count", "leukocytes"
        ],
        accepted_units=["cumm", "/cumm", "cells/cumm", "/ul", "10^3/ul", "k/ul", "thou/mm3", "thou/cumm"],
        default_unit="cumm",
        default_range="4000 - 11000",
        expected_numeric_range=(100.0, 300000.0)
    ),
    "rbc_count": AnalyteDefinition(
        canonical_name="rbc_count",
        display_name="Total RBC Count",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "total rbc count", "rbc count", "rbc", "red blood cell count",
            "total red blood cell count", "erythrocyte count", "red blood cells"
        ],
        accepted_units=["million/cumm", "mill/cumm", "mil/cumm", "10^6/ul", "10^6/mm3", "m/ul"],
        default_unit="million/cumm",
        default_range="4.5 - 5.5",
        expected_numeric_range=(0.5, 15.0)
    ),
    "platelet_count": AnalyteDefinition(
        canonical_name="platelet_count",
        display_name="Platelet Count",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "platelet count", "platelets", "plt", "total platelet count",
            "thrombocytes", "platelet count (electrical impedence)"
        ],
        accepted_units=["lakhs/cumm", "lakh/cumm", "10^3/ul", "k/ul", "cumm", "thou/mm3", "cells/cumm"],
        default_unit="lakhs/cumm",
        default_range="1.5 - 4.5",
        expected_numeric_range=(5.0, 2000000.0)
    ),
    "neutrophils": AnalyteDefinition(
        canonical_name="neutrophils",
        display_name="Neutrophils",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["neutrophils", "neutrophil count", "neut", "polymorphs", "neutrophils percent"],
        accepted_units=["%", "cumm", "cells/cumm", "thou/mm3", "k/ul"],
        default_unit="%",
        default_range="40 - 80",
        expected_numeric_range=(0.0, 100.0)
    ),
    "lymphocytes": AnalyteDefinition(
        canonical_name="lymphocytes",
        display_name="Lymphocytes",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["lymphocyte", "lymphocytes", "lymphocyte count", "lymph", "lymphocytes percent"],
        accepted_units=["%", "cumm", "cells/cumm", "thou/mm3", "k/ul"],
        default_unit="%",
        default_range="20 - 40",
        expected_numeric_range=(0.0, 100.0)
    ),
    "monocytes": AnalyteDefinition(
        canonical_name="monocytes",
        display_name="Monocytes",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["monocytes", "monocyte count", "mono", "monocytes percent"],
        accepted_units=["%", "cumm", "cells/cumm", "thou/mm3", "k/ul"],
        default_unit="%",
        default_range="2 - 10",
        expected_numeric_range=(0.0, 100.0)
    ),
    "eosinophils": AnalyteDefinition(
        canonical_name="eosinophils",
        display_name="Eosinophils",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["eosinophils", "eosinophil count", "eosino", "eos", "eosinophils percent"],
        accepted_units=["%", "cumm", "cells/cumm", "thou/mm3", "k/ul"],
        default_unit="%",
        default_range="1 - 6",
        expected_numeric_range=(0.0, 100.0)
    ),
    "basophils": AnalyteDefinition(
        canonical_name="basophils",
        display_name="Basophils",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["basophils", "basophil count", "baso", "basophils percent", "basophils (calculated)"],
        accepted_units=["%", "cumm", "cells/cumm", "thou/mm3", "k/ul"],
        default_unit="%",
        default_range="0 - 2",
        expected_numeric_range=(0.0, 100.0)
    ),
    "hematocrit": AnalyteDefinition(
        canonical_name="hematocrit",
        display_name="Packed Cell Volume (PCV / HCT)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "hematocrit value, hct", "packed cell volume (pcv)", "hematocrit", "pcv", "hct",
            "packed cell volume", "hct (hematocrit)", "pcv (packed cell volume)"
        ],
        accepted_units=["%", "vol%"],
        default_unit="%",
        default_range="40 - 50",
        expected_numeric_range=(10.0, 80.0)
    ),
    "mcv": AnalyteDefinition(
        canonical_name="mcv",
        display_name="Mean Corpuscular Volume (MCV)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["mean corpuscular volume, mcv", "mean corpuscular volume (mcv)", "mcv", "mean corpuscular volume"],
        accepted_units=["fl", "fL"],
        default_unit="fL",
        default_range="83 - 101",
        expected_numeric_range=(40.0, 150.0)
    ),
    "mch": AnalyteDefinition(
        canonical_name="mch",
        display_name="Mean Corpuscular Hemoglobin (MCH)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["mean cell haemoglobin, mch", "mch", "mean cell hemoglobin", "mean corpuscular hemoglobin"],
        accepted_units=["pg", "Pg"],
        default_unit="pg",
        default_range="27 - 32",
        expected_numeric_range=(10.0, 60.0)
    ),
    "mchc": AnalyteDefinition(
        canonical_name="mchc",
        display_name="Mean Corpuscular Hemoglobin Concentration (MCHC)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=[
            "mean cell haemoglobin con, mchc", "mchc", "mean corpuscular hemoglobin concentration",
            "mean cell hemoglobin concentration"
        ],
        accepted_units=["g/dl", "%", "g/l"],
        default_unit="g/dL",
        default_range="31.5 - 34.5",
        expected_numeric_range=(15.0, 50.0)
    ),
    "rdw": AnalyteDefinition(
        canonical_name="rdw",
        display_name="Red Cell Distribution Width (RDW)",
        category="Hematology",
        organ_system="Hematologic",
        synonyms=["rdw", "rdw-cv", "rdw-sd", "red cell distribution width"],
        accepted_units=["%", "fl"],
        default_unit="%",
        default_range="11.5 - 14.5",
        expected_numeric_range=(5.0, 40.0)
    ),

    # ----------------------------------------------------------------------------
    # 3. RENAL / KIDNEY FUNCTION TEST (KFT / RFT) & ELECTROLYTES
    # ----------------------------------------------------------------------------
    "serum_creatinine": AnalyteDefinition(
        canonical_name="serum_creatinine",
        display_name="Serum Creatinine",
        category="Kidney Function",
        organ_system="Renal",
        synonyms=["creatinine serum", "serum creatinine", "creatinine", "s. creatinine", "sr. creatinine", "creat"],
        accepted_units=["mg/dl", "umol/l", "mmol/l"],
        default_unit="mg/dL",
        default_range="0.40 - 1.20",
        expected_numeric_range=(0.1, 30.0)
    ),
    "blood_urea": AnalyteDefinition(
        canonical_name="blood_urea",
        display_name="Serum Urea",
        category="Kidney Function",
        organ_system="Renal",
        synonyms=["urea serum", "serum urea", "urea", "blood urea"],
        accepted_units=["mg/dl", "mmol/l"],
        default_unit="mg/dL",
        default_range="10 - 50",
        expected_numeric_range=(2.0, 300.0)
    ),
    "bun": AnalyteDefinition(
        canonical_name="bun",
        display_name="Blood Urea Nitrogen (BUN)",
        category="Kidney Function",
        organ_system="Renal",
        synonyms=["bun", "blood urea nitrogen"],
        accepted_units=["mg/dl", "mmol/l"],
        default_unit="mg/dL",
        default_range="7 - 25",
        expected_numeric_range=(1.0, 150.0)
    ),
    "bun_creatinine_ratio": AnalyteDefinition(
        canonical_name="bun_creatinine_ratio",
        display_name="BUN / Creatinine Ratio",
        category="Kidney Function",
        organ_system="Renal",
        synonyms=["bun / creatinine", "bun/creatinine", "bun / creatinine ratio", "bun/creatinine ratio"],
        accepted_units=["ratio", ""],
        default_unit="Ratio",
        default_range="10.0 - 20.0",
        expected_numeric_range=(1.0, 100.0)
    ),
    "urea_creatinine_ratio": AnalyteDefinition(
        canonical_name="urea_creatinine_ratio",
        display_name="Urea / Creatinine Ratio",
        category="Kidney Function",
        organ_system="Renal",
        synonyms=["urea / creatinine", "urea/creatinine", "urea / creatinine ratio"],
        accepted_units=["ratio", ""],
        default_unit="Ratio",
        default_range="20.0 - 40.0",
        expected_numeric_range=(1.0, 200.0)
    ),
    "uric_acid": AnalyteDefinition(
        canonical_name="uric_acid",
        display_name="Uric Acid",
        category="Kidney Function",
        organ_system="Renal",
        synonyms=["uric acid", "serum uric acid", "s. uric acid"],
        accepted_units=["mg/dl", "umol/l"],
        default_unit="mg/dL",
        default_range="2.5 - 6.8",
        expected_numeric_range=(0.5, 30.0)
    ),
    "calcium": AnalyteDefinition(
        canonical_name="calcium",
        display_name="Calcium",
        category="Kidney Function",
        organ_system="Electrolytes",
        synonyms=["calcium", "serum calcium", "s. calcium", "total calcium"],
        accepted_units=["mg/dl", "mmol/l"],
        default_unit="mg/dL",
        default_range="8.5 - 10.6",
        expected_numeric_range=(2.0, 25.0)
    ),
    "phosphorus": AnalyteDefinition(
        canonical_name="phosphorus",
        display_name="Phosphorus",
        category="Kidney Function",
        organ_system="Electrolytes",
        synonyms=["phosphorus", "phosphorous", "serum phosphorus", "phosphate", "inorganic phosphorus"],
        accepted_units=["mg/dl", "mmol/l"],
        default_unit="mg/dL",
        default_range="2.5 - 4.5",
        expected_numeric_range=(0.5, 20.0)
    ),
    "sodium": AnalyteDefinition(
        canonical_name="sodium",
        display_name="Sodium",
        category="Electrolytes",
        organ_system="Electrolytes",
        synonyms=["sodium", "serum sodium", "s. sodium", "na+"],
        accepted_units=["meq/l", "mmol/l", "mg/dl"],
        default_unit="mEq/L",
        default_range="135 - 145",
        expected_numeric_range=(80.0, 200.0)
    ),
    "potassium": AnalyteDefinition(
        canonical_name="potassium",
        display_name="Potassium",
        category="Electrolytes",
        organ_system="Electrolytes",
        synonyms=["potassium", "serum potassium", "s. potassium", "k+"],
        accepted_units=["meq/l", "mmol/l"],
        default_unit="mEq/L",
        default_range="3.5 - 5.0",
        expected_numeric_range=(1.0, 15.0)
    ),
    "chloride": AnalyteDefinition(
        canonical_name="chloride",
        display_name="Chloride",
        category="Electrolytes",
        organ_system="Electrolytes",
        synonyms=["chloride", "serum chloride", "s. chloride", "cl-"],
        accepted_units=["meq/l", "mmol/l"],
        default_unit="mEq/L",
        default_range="98 - 107",
        expected_numeric_range=(50.0, 160.0)
    ),

    # ----------------------------------------------------------------------------
    # 4. INFLAMMATION & THYROID PROFILE
    # ----------------------------------------------------------------------------
    "crp": AnalyteDefinition(
        canonical_name="crp",
        display_name="C-Reactive Protein (CRP)",
        category="Biochemistry",
        organ_system="Immunologic",
        synonyms=[
            "c-reactive protein; crp, serum", "c-reactive protein", "crp", "crp, serum",
            "c-reactive protein (crp)", "hs-crp", "c reactive protein"
        ],
        accepted_units=["mg/l", "mg/dl"],
        default_unit="mg/L",
        default_range="< 3.30",
        expected_numeric_range=(0.1, 500.0)
    ),
    "free_t3": AnalyteDefinition(
        canonical_name="free_t3",
        display_name="Free Triiodothyronine (Free T3)",
        category="Endocrinology",
        organ_system="Endocrine",
        synonyms=[
            "free triiodothyronine (t3, free)", "free t3", "ft3", "t3 free",
            "free triiodothyronine", "triiodothyronine free"
        ],
        accepted_units=["pg/ml", "pmol/l"],
        default_unit="pg/mL",
        default_range="2.30 - 4.20",
        expected_numeric_range=(0.1, 50.0)
    ),
    "free_t4": AnalyteDefinition(
        canonical_name="free_t4",
        display_name="Free Thyroxine (Free T4)",
        category="Endocrinology",
        organ_system="Endocrine",
        synonyms=[
            "free thyroxine (t4, free)", "free t4", "ft4", "t4 free",
            "free thyroxine", "thyroxine free"
        ],
        accepted_units=["ng/dl", "pmol/l"],
        default_unit="ng/dL",
        default_range="0.80 - 1.80",
        expected_numeric_range=(0.1, 30.0)
    ),
    "tsh": AnalyteDefinition(
        canonical_name="tsh",
        display_name="Thyroid Stimulating Hormone (TSH)",
        category="Endocrinology",
        organ_system="Endocrine",
        synonyms=["tsh", "thyroid stimulating hormone", "ultrasensitive tsh", "tsh, serum"],
        accepted_units=["uiu/ml", "miu/l", "uciu/ml"],
        default_unit="µIU/mL",
        default_range="0.35 - 4.94",
        expected_numeric_range=(0.01, 150.0)
    ),

    # ----------------------------------------------------------------------------
    # 5. LIVER FUNCTION TEST (LFT) & LIPIDS
    # ----------------------------------------------------------------------------
    "alt_sgpt": AnalyteDefinition(
        canonical_name="alt_sgpt",
        display_name="Alanine Aminotransferase (ALT / SGPT)",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["alt", "sgpt", "alt/sgpt", "alanine aminotransferase", "alanine transaminase", "sgpt (alt)"],
        accepted_units=["u/l", "iu/l", "units/l"],
        default_unit="U/L",
        default_range="7 - 56",
        expected_numeric_range=(1.0, 5000.0)
    ),
    "ast_sgot": AnalyteDefinition(
        canonical_name="ast_sgot",
        display_name="Aspartate Aminotransferase (AST / SGOT)",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["ast", "sgot", "ast/sgot", "aspartate aminotransferase", "aspartate transaminase", "sgot (ast)"],
        accepted_units=["u/l", "iu/l", "units/l"],
        default_unit="U/L",
        default_range="10 - 40",
        expected_numeric_range=(1.0, 5000.0)
    ),
    "bilirubin_total": AnalyteDefinition(
        canonical_name="bilirubin_total",
        display_name="Total Bilirubin",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["total bilirubin", "bilirubin total", "serum bilirubin total", "t. bilirubin"],
        accepted_units=["mg/dl", "umol/l"],
        default_unit="mg/dL",
        default_range="0.2 - 1.2",
        expected_numeric_range=(0.05, 50.0)
    ),
    "bilirubin_direct": AnalyteDefinition(
        canonical_name="bilirubin_direct",
        display_name="Direct Bilirubin",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["direct bilirubin", "bilirubin direct", "conjugated bilirubin"],
        accepted_units=["mg/dl", "umol/l"],
        default_unit="mg/dL",
        default_range="0.0 - 0.3",
        expected_numeric_range=(0.0, 30.0)
    ),
    "alkaline_phosphatase": AnalyteDefinition(
        canonical_name="alkaline_phosphatase",
        display_name="Alkaline Phosphatase (ALP)",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["alkaline phosphatase", "alp", "alk phos", "s. alp"],
        accepted_units=["u/l", "iu/l"],
        default_unit="U/L",
        default_range="44 - 147",
        expected_numeric_range=(5.0, 3000.0)
    ),
    "total_protein": AnalyteDefinition(
        canonical_name="total_protein",
        display_name="Total Protein",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["total protein", "total proteins", "serum total protein", "protein total"],
        accepted_units=["g/dl", "g/l"],
        default_unit="g/dL",
        default_range="6.0 - 8.3",
        expected_numeric_range=(1.0, 20.0)
    ),
    "serum_albumin": AnalyteDefinition(
        canonical_name="serum_albumin",
        display_name="Serum Albumin",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["albumin", "serum albumin", "s. albumin"],
        accepted_units=["g/dl", "g/l"],
        default_unit="g/dL",
        default_range="3.5 - 5.0",
        expected_numeric_range=(0.5, 15.0)
    ),
    "ag_ratio": AnalyteDefinition(
        canonical_name="ag_ratio",
        display_name="Albumin / Globulin Ratio (A/G Ratio)",
        category="Liver Function",
        organ_system="Hepatic",
        synonyms=["a/g ratio", "albumin globulin ratio", "ag ratio", "albumin/globulin ratio"],
        accepted_units=["ratio", ""],
        default_unit="Ratio",
        default_range="1.1 - 2.2",
        expected_numeric_range=(0.2, 10.0)
    ),
    "cholesterol_total": AnalyteDefinition(
        canonical_name="cholesterol_total",
        display_name="Total Cholesterol",
        category="Lipid Profile",
        organ_system="Cardiovascular",
        synonyms=["total cholesterol", "cholesterol total", "serum cholesterol", "cholesterol"],
        accepted_units=["mg/dl", "mmol/l"],
        default_unit="mg/dL",
        default_range="< 200",
        expected_numeric_range=(30.0, 1000.0)
    ),
    "cholesterol_hdl": AnalyteDefinition(
        canonical_name="cholesterol_hdl",
        display_name="HDL Cholesterol",
        category="Lipid Profile",
        organ_system="Cardiovascular",
        synonyms=["hdl cholesterol", "hdl", "high density lipoprotein"],
        accepted_units=["mg/dl", "mmol/l"],
        default_unit="mg/dL",
        default_range="> 40",
        expected_numeric_range=(5.0, 200.0)
    ),
    "cholesterol_ldl": AnalyteDefinition(
        canonical_name="cholesterol_ldl",
        display_name="LDL Cholesterol",
        category="Lipid Profile",
        organ_system="Cardiovascular",
        synonyms=["ldl cholesterol", "ldl", "low density lipoprotein"],
        accepted_units=["mg/dl", "mmol/l"],
        default_unit="mg/dL",
        default_range="< 100",
        expected_numeric_range=(10.0, 500.0)
    ),
    "triglycerides": AnalyteDefinition(
        canonical_name="triglycerides",
        display_name="Triglycerides",
        category="Lipid Profile",
        organ_system="Cardiovascular",
        synonyms=["triglycerides", "serum triglycerides", "tg"],
        accepted_units=["mg/dl", "mmol/l"],
        default_unit="mg/dL",
        default_range="< 150",
        expected_numeric_range=(20.0, 3000.0)
    )
}


# Precompiled synonym to canonical key lookup dictionary for fast O(1) matching
_SYNONYM_LOOKUP: Dict[str, str] = {}
for canonical_key, definition in CLINICAL_ONTOLOGY.items():
    _SYNONYM_LOOKUP[canonical_key] = canonical_key
    _SYNONYM_LOOKUP[definition.display_name.lower()] = canonical_key
    for syn in definition.synonyms:
        _SYNONYM_LOOKUP[syn] = canonical_key


def find_canonical_key_by_exact_synonym(query_str: str) -> Optional[str]:
    """Matches normalized query string against exact ontology synonyms in O(1) time."""
    if not query_str:
        return None
    cleaned = query_str.strip().lower()
    return _SYNONYM_LOOKUP.get(cleaned)


def get_ontology_definition(canonical_key: str) -> Optional[AnalyteDefinition]:
    return CLINICAL_ONTOLOGY.get(canonical_key)


def is_unit_compatible(canonical_key: str, unit_str: str) -> bool:
    """Checks if unit_str is accepted for the specified canonical analyte."""
    if not unit_str or not unit_str.strip():
        return True
    defn = CLINICAL_ONTOLOGY.get(canonical_key)
    if not defn or not defn.accepted_units:
        return True
    norm_u = unit_str.strip().lower().replace(" ", "")
    for acc in defn.accepted_units:
        if norm_u == acc.replace(" ", ""):
            return True
    return False
