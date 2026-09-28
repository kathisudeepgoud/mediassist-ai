"""
Diet Service Orchestrator
Coordinates clinical constraint extraction, multi-day MILP optimization,
authentic Indian culinary naming, safety validation, and structured output formatting.
"""

import time
import logging
from datetime import date, timedelta
from typing import Dict, List, Any, Optional, Tuple

logger = logging.getLogger(__name__)

from ..schemas import (
    OptimizeDietRequest,
    OptimizeDietResponse,
    WeeklyDietDayResponse,
    MealSlot,
    MealFoodItem,
    DailyNutritionSummary,
    SafetyReport,
    ClinicalContextResponse
)
from ..optimizer import MILPDietEngine
from ..nutrition import sum_daily_nutrients
from ..validation import SafetyValidator

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

MEAL_SLOT_CONFIG = {
    5: [
        {"key": "breakfast", "title": "Breakfast", "time": "8:30 AM", "calPct": 0.25},
        {"key": "midMorning", "title": "Mid-Morning Snack", "time": "11:00 AM", "calPct": 0.10},
        {"key": "lunch", "title": "Lunch", "time": "1:30 PM", "calPct": 0.35},
        {"key": "eveningSnack", "title": "Evening Snack", "time": "5:30 PM", "calPct": 0.10},
        {"key": "dinner", "title": "Dinner", "time": "8:30 PM", "calPct": 0.20},
    ],
    3: [
        {"key": "breakfast", "title": "Breakfast", "time": "8:30 AM", "calPct": 0.30},
        {"key": "lunch", "title": "Lunch", "time": "1:30 PM", "calPct": 0.40},
        {"key": "dinner", "title": "Dinner", "time": "8:30 PM", "calPct": 0.30},
    ]
}

def format_culinary_food_name(food: Dict[str, Any], meal_slot: str = "lunch") -> str:
    """Format authentic Indian culinary presentation name for patient clarity."""
    name = food.get("food_name", "Healthy Food")
    group = food.get("group_code", "A")
    name_lower = name.lower()

    if group == "A":
        if "wheat" in name_lower or "gehun" in name_lower or "atta" in name_lower:
            return f"{name} (Whole Wheat Phulkas / Rotis)"
        if "rice" in name_lower:
            return f"{name} (Steamed Brown / Parboiled Rice)"
        if "bajra" in name_lower:
            return f"{name} (Bajra Roti)"
        if "jowar" in name_lower:
            return f"{name} (Jowar Bhakri)"
        if "ragi" in name_lower:
            return f"{name} (Ragi Dosa / Porridge)"
        if "oat" in name_lower:
            return f"{name} (Oats Porridge / Upma)"
        if "barley" in name_lower or "jau" in name_lower:
            return f"{name} (Barley / Jau Khichdi)"
        return f"{name} (Whole Grain Staple)"

    if group == "B":
        if "moong" in name_lower:
            return f"{name} (Yellow Moong Dal Tadka)"
        if "toor" in name_lower or "arhar" in name_lower:
            return f"{name} (Toor Dal / Sambar)"
        if "chana" in name_lower or "chickpea" in name_lower:
            return f"{name} (Chana Masala / Boiled Chana)"
        if "rajma" in name_lower or "kidney bean" in name_lower:
            return f"{name} (Homestyle Rajma Curry)"
        if "masoor" in name_lower or "lentil" in name_lower:
            return f"{name} (Masoor Dal Curry)"
        if "soya" in name_lower or "soy" in name_lower or "tofu" in name_lower:
            return f"{name} (Soya Chunk / Tofu Curry)"
        return f"{name} (Cooked Dal / Legume Curry)"

    if group == "M":
        if "boiled" in name_lower:
            return f"{name} (2 Hard-Boiled Eggs)"
        return f"{name} (Egg Omelette / Bhurji / Curry)"

    if group == "N":
        if "breast" in name_lower:
            return f"{name} (Grilled Chicken Breast / Curry)"
        return f"{name} (Homestyle Chicken Curry)"

    if group in ("P", "Q", "R", "S"):
        return f"{name} (Steamed / Grilled Fish Curry)"

    if group == "C":
        return f"{name} (Steamed / Sautéed Saag)"

    if group in ("D", "F"):
        if "salad" in meal_slot.lower():
            return f"{name} (Fresh Sliced Salad)"
        return f"{name} (Steamed Sabzi)"

    if group == "E":
        return f"{name} (Fresh Sliced Fruit Bowl)"

    if group == "H":
        return f"{name} (Handful of Soaked / Roasted Nuts)"

    if group == "L":
        return f"{name} (Fresh Curd / Low-Fat Milk)"

    return name

def generate_clinical_reasons(food: Dict[str, Any], uc: Dict[str, Any], pref: Dict[str, Any]) -> List[str]:
    """Derive transparent explanation tags for why the MILP optimizer selected this food."""
    reasons = []
    nut = food.get("nutrients", {})
    code = food.get("food_code", "")
    group = food.get("group_code", "")

    # Nutrient analysis
    fib = nut.get("fibtg", 0)
    prot = nut.get("protcnt", 0)
    na = nut.get("na", 0)
    fe = nut.get("fe", 0)
    vitc = nut.get("vitc", 0)
    k = nut.get("k", 0)

    if fib >= 6.0:
        reasons.append("HIGH_DIETARY_FIBER")
    elif fib >= 3.0:
        reasons.append("GOOD_FIBER_SOURCE")

    if prot >= 12.0:
        reasons.append("RICH_IN_PROTEIN")
    elif group == "M":
        reasons.append("HIGH_BIOLOGICAL_VALUE_EGG_PROTEIN")
    elif group in ("P", "Q", "R", "S"):
        reasons.append("RICH_IN_OMEGA3_AND_LEAN_PROTEIN")
    elif group == "N":
        reasons.append("LEAN_POULTRY_PROTEIN")

    if na <= 50.0:
        reasons.append("LOW_SODIUM_HEART_SAFE")

    if uc.get("maxPotassiumDailyMg", 3500) <= 2200 and k <= 250.0:
        reasons.append("KIDNEY_SAFE_LOW_POTASSIUM")

    if fe >= 3.5:
        reasons.append("RICH_IN_DIETARY_IRON")

    if vitc >= 20.0:
        reasons.append("RICH_IN_VITAMIN_C")

    # Regional / preference match
    reg = (pref.get("food_preference", "All") or "All").lower()
    local_raw = (food.get("local_names_raw", "") or "").lower()
    if reg != "all" and reg != "":
        if ("north" in reg and any(k in local_raw for k in ["h.", "p.", "kash.", "g."])) or \
           ("south" in reg and any(k in local_raw for k in ["tam.", "tel.", "kan.", "mal."])) or \
           ("east" in reg and any(k in local_raw for k in ["b.", "a.", "o.", "m."])) or \
           ("west" in reg and any(k in local_raw for k in ["mar.", "g.", "kon."])):
            reasons.append("REGIONAL_PREFERENCE_MATCH")

    if not reasons:
        reasons.append("NUTRITIONAL_BALANCE")

    return list(set(reasons))

class DietService:
    """
    Main Service for MILP Diet Planning.
    """

    @staticmethod
    def extract_unified_constraints(
        patient_profile: Dict[str, Any],
        clinical_vitals: Dict[str, Any],
        disease_risks: List[Dict[str, Any]],
        preferences: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], List[str], List[Dict[str, Any]], List[str], List[str]]:
        """
        Builds clinical constraint parameters from patient vitals and RF risk outputs.
        """
        # Baseline limits for healthy adults
        unified_constraints = {
            "minDailyCalories": 1600,
            "maxDailyCalories": 2200,
            "minDailyProteinGrams": 45,
            "maxDailyProteinGrams": 75,
            "minDailyFiberGrams": 28,
            "maxDailyFreeSugarsGrams": 20,
            "maxSaturatedFatPercent": 8.0,
            "maxSodiumDailyMg": 2200,
            "maxPotassiumDailyMg": 3500,
            "maxPhosphorusDailyMg": 1200,
            "minIronDailyMg": 15,
            "minVitaminCDailyMg": 50,
            "minFolateDailyMcg": 200,
            "safetyDisclaimers": []
        }

        applied_rules_summary = []
        active_rules = []
        restricted_food_codes = set()
        preferred_food_codes = set()
        restricted_categories = set()

        risk_map = {}
        for r in disease_risks:
            k = str(r.get("id") or r.get("name") or "").lower()
            risk_map[k] = {
                "status": r.get("status", "Low"),
                "percentage": float(r.get("percentage", 0.0))
            }

        # 1. Diabetes Clinical Constraints
        diab = risk_map.get("diabetes", {})
        is_diab = diab.get("status") in ("High", "Moderate") or diab.get("percentage", 0) >= 30
        if is_diab:
            applied_rules_summary.append("DIABETES_GLYCEMIC_CONTROL")
            active_rules.append({"disease": "Diabetes", "status": diab.get("status"), "percentage": diab.get("percentage")})
            unified_constraints["minDailyFiberGrams"] = max(unified_constraints["minDailyFiberGrams"], 35 if diab.get("percentage", 0) >= 60 else 30)
            unified_constraints["maxDailyFreeSugarsGrams"] = 10.0
            unified_constraints["maxSaturatedFatPercent"] = min(unified_constraints["maxSaturatedFatPercent"], 7.0)
            restricted_food_codes.update(["A018", "I001", "I002", "K001", "K002"])
            restricted_categories.update(["Sugars", "Sweets and Confectioneries"])
            preferred_food_codes.update(["A003", "A005", "A010", "A004", "A009", "A013", "B001", "B002", "B003", "B005", "B007", "G011"])

        # 2. Heart Disease / Cardiovascular Constraints
        heart = risk_map.get("heart") or risk_map.get("heart disease", {})
        is_heart = heart.get("status") in ("High", "Moderate") or heart.get("percentage", 0) >= 30
        if is_heart:
            applied_rules_summary.append("CARDIOVASCULAR_LIPID_SODIUM_LIMIT")
            active_rules.append({"disease": "Heart Disease", "status": heart.get("status"), "percentage": heart.get("percentage")})
            unified_constraints["maxSodiumDailyMg"] = min(unified_constraints["maxSodiumDailyMg"], 1800 if heart.get("percentage", 0) >= 60 else 2000)
            unified_constraints["maxSaturatedFatPercent"] = min(unified_constraints["maxSaturatedFatPercent"], 6.0)
            unified_constraints["minDailyFiberGrams"] = max(unified_constraints["minDailyFiberGrams"], 30)
            restricted_food_codes.update(["T001", "T002", "T003", "M001", "M002", "O001", "O002", "O003"])
            restricted_categories.update(["Animal Meat", "Marine Mollusks"])
            preferred_food_codes.update(["A004", "A001", "A002", "H001", "H018", "H005", "H003", "P001", "P005", "P010"])

        # 3. Liver Disease Constraints
        liver = risk_map.get("liver") or risk_map.get("liver disease", {})
        is_liver = liver.get("status") in ("High", "Moderate") or liver.get("percentage", 0) >= 30
        if is_liver:
            applied_rules_summary.append("LIVER_HEPATIC_SUPPORT")
            active_rules.append({"disease": "Liver Disease", "status": liver.get("status"), "percentage": liver.get("percentage")})
            unified_constraints["maxSodiumDailyMg"] = min(unified_constraints["maxSodiumDailyMg"], 1800)
            unified_constraints["minDailyProteinGrams"] = max(unified_constraints["minDailyProteinGrams"], 55)
            restricted_food_codes.update(["T001", "T002", "T003", "O001", "O002"])
            preferred_food_codes.update(["C001", "C005", "C010", "D005", "D006", "E008", "E009", "L001", "L002"])

        # 4. CBC / Anemia Constraints
        cbc = risk_map.get("cbc") or risk_map.get("cbc anemia", {})
        is_cbc = cbc.get("status") in ("High", "Moderate") or cbc.get("percentage", 0) >= 30
        if is_cbc:
            applied_rules_summary.append("ANEMIA_IRON_FOLATE_ENHANCEMENT")
            active_rules.append({"disease": "CBC Anemia", "status": cbc.get("status"), "percentage": cbc.get("percentage")})
            unified_constraints["minIronDailyMg"] = max(unified_constraints["minIronDailyMg"], 25 if cbc.get("percentage", 0) >= 60 else 20)
            unified_constraints["minVitaminCDailyMg"] = max(unified_constraints["minVitaminCDailyMg"], 60)
            unified_constraints["minFolateDailyMcg"] = max(unified_constraints["minFolateDailyMcg"], 300)
            preferred_food_codes.update(["A001", "A002", "A003", "C001", "C005", "C015", "B001", "B005", "E021", "E008", "E009"])

        # 5. Kidney Disease Constraints (Highest Clinical Precedence)
        kidney = risk_map.get("kidney") or risk_map.get("kidney disease", {})
        is_kidney = kidney.get("status") in ("High", "Moderate") or kidney.get("percentage", 0) >= 30
        if is_kidney:
            applied_rules_summary.append("RENAL_SAFETY_RESTRICTIONS")
            active_rules.append({"disease": "Kidney Disease", "status": kidney.get("status"), "percentage": kidney.get("percentage")})
            unified_constraints["safetyDisclaimers"].append(
                "Detailed kidney-specific dietary guidance requires additional clinical staging (eGFR/UACR) and individual nephrology/dietitian review."
            )
            # Cap protein strictly for renal safety
            unified_constraints["maxDailyProteinGrams"] = 48 if kidney.get("percentage", 0) >= 60 else 56
            unified_constraints["minDailyProteinGrams"] = min(unified_constraints["minDailyProteinGrams"], 40)
            unified_constraints["maxPotassiumDailyMg"] = 2200 if kidney.get("percentage", 0) >= 60 else 2500
            unified_constraints["maxPhosphorusDailyMg"] = 900
            unified_constraints["maxSodiumDailyMg"] = min(unified_constraints["maxSodiumDailyMg"], 1800)
            restricted_food_codes.update(["H005", "H018", "E001", "E015", "T009"])
            preferred_food_codes.update(["A015", "A014", "D001", "D002", "D015", "E005", "E006"])

        # Calculate Caloric Baseline via Mifflin-St Jeor
        wt = float(patient_profile.get("weightKg") or patient_profile.get("weight_kg") or 65.0)
        ht = float(patient_profile.get("heightCm") or patient_profile.get("height_cm") or 168.0)
        age = float(patient_profile.get("age") or 45.0)
        gender = str(patient_profile.get("gender") or "Male").lower()
        act = str(patient_profile.get("activity_level") or preferences.get("activity_level") or "Moderately Active").lower()

        bmr = (10.0 * wt) + (6.25 * ht) - (5.0 * age) + (-161.0 if gender.startswith("f") else 5.0)
        act_mult = 1.375
        if "sedentary" in act:
            act_mult = 1.2
        elif "light" in act:
            act_mult = 1.375
        elif "moderately" in act or "moderate" in act:
            act_mult = 1.55
        elif "very" in act or "active" in act:
            act_mult = 1.725

        target_cal = int(round(bmr * act_mult))

        # Goal adjustments
        goal = str(patient_profile.get("health_goal") or preferences.get("health_goal") or "").lower()
        if "loss" in goal or "deficit" in goal:
            target_cal = max(1400, target_cal - 400)
        elif "gain" in goal or "muscle" in goal:
            target_cal = min(2600, target_cal + 300)

        override = patient_profile.get("calorie_target_override") or preferences.get("calorie_target_override")
        if override and int(override) > 1000:
            target_cal = int(override)

        unified_constraints["targetCalories"] = target_cal

        return (
            unified_constraints,
            applied_rules_summary,
            active_rules,
            list(restricted_food_codes),
            list(preferred_food_codes)
        )

    @classmethod
    def generate_personalized_plan(
        cls,
        request: OptimizeDietRequest,
        food_database: List[Dict[str, Any]]
    ) -> OptimizeDietResponse:
        """
        Executes full MILP meal optimization for the requested duration.
        """
        patient = request.patientProfile.model_dump()
        vitals = request.clinicalVitals
        risks = [r.model_dump() for r in request.diseaseRisks]
        prefs = request.preferences.model_dump()
        days_count = request.days or 7
        t_start_total = time.perf_counter()
        logger.info(f"[MILP Diet Engine] Diet generation started (requested duration: {days_count} days)")

        # 1. Build unified clinical constraints
        t_uc_start = time.perf_counter()
        (
            uc,
            applied_summary,
            active_rules,
            restricted_codes,
            preferred_codes
        ) = cls.extract_unified_constraints(patient, vitals, risks, prefs)
        t_uc_ms = (time.perf_counter() - t_uc_start) * 1000
        logger.info(f"[MILP Diet Engine] Constraint construction: {t_uc_ms:.2f}ms")

        # 2. Initialize MILP Engine
        engine = MILPDietEngine(food_database)

        # Pre-filter candidate space (removes allergens & diet type violations)
        t_filt_start = time.perf_counter()
        candidates = engine.filter_candidate_foods(
            preferences=prefs,
            restricted_food_codes=restricted_codes
        )
        t_filt_ms = (time.perf_counter() - t_filt_start) * 1000
        logger.info(f"[MILP Diet Engine] Candidate filtering: {t_filt_ms:.2f}ms ({len(candidates)} candidate foods)")

        meal_count = 3 if prefs.get("meal_count") == 3 else 5
        slot_defs = MEAL_SLOT_CONFIG[meal_count]
        meal_slot_keys = [s["key"] for s in slot_defs]

        # 3. High-Speed Multi-Day Optimization (Sequential to prevent OS file locks & CPU contention)
        t_opt_start = time.perf_counter()
        today = date.today()
        solved_days = []
        total_opt_time = 0.0

        for day_offset in range(days_count):
            t_day_start = time.perf_counter()
            current_date = today + timedelta(days=day_offset)
            day_name = DAY_NAMES[current_date.weekday()]

            # Variety dispersion across days
            day_used = {c.get("food_code", ""): (day_offset * 2 + idx) % 4 for idx, c in enumerate(candidates[:20])}

            selected_meals, solver_res = engine.optimize_day(
                candidate_foods=candidates,
                unified_constraints=uc,
                preferences=prefs,
                meal_slots=meal_slot_keys,
                used_in_week=day_used,
                preferred_food_codes=preferred_codes
            )

            day_opt_ms = (time.perf_counter() - t_day_start) * 1000
            logger.info(
                f"[MILP Diet Engine] Day {day_offset + 1} ({day_name}) solved in {day_opt_ms:.1f}ms "
                f"(Solver status: {solver_res.status}, Solver time: {solver_res.solve_time_ms:.1f}ms)"
            )

            if not selected_meals or not solver_res.is_optimal:
                raise ValueError(
                    f"MILP Solver was unable to find a feasible solution for Day {day_offset + 1} ({day_name}). "
                    f"Solver Status: {solver_res.status}. {solver_res.diagnostics}"
                )

            # Format day meal slots
            day_meals_dict: Dict[str, MealSlot] = {}
            all_day_items = []

            for s_def in slot_defs:
                s_key = s_def["key"]
                s_items_raw = selected_meals.get(s_key, [])
                slot_cal_target = int(round(uc["targetCalories"] * s_def["calPct"]))

                formatted_items: List[MealFoodItem] = []
                for entry in s_items_raw:
                    food_obj = entry["food"]
                    qty_g = entry["quantityGrams"]
                    f_code = food_obj.get("food_code", "")

                    culinary_name = format_culinary_food_name(food_obj, s_key)
                    reasons = generate_clinical_reasons(food_obj, uc, prefs)

                    m_item = MealFoodItem(
                        foodId=food_obj.get("id"),
                        foodCode=f_code,
                        name=culinary_name,
                        portion=f"{qty_g}g serving",
                        quantityGrams=qty_g,
                        foodNutrients=food_obj.get("nutrients", {}),
                        reasons=reasons
                    )
                    formatted_items.append(m_item)
                    all_day_items.append(m_item.model_dump())

                day_meals_dict[s_key] = MealSlot(
                    title=s_def["title"],
                    time=s_def["time"],
                    targetCalories=slot_cal_target,
                    items=formatted_items
                )

            # Sum Daily Nutrition
            nut_totals = sum_daily_nutrients(all_day_items)
            daily_nut_summary = DailyNutritionSummary(**nut_totals)

            day_response = WeeklyDietDayResponse(
                day=day_name,
                date=current_date.strftime("%b %d, %Y"),
                dayOffset=day_offset,
                targetCalories=uc["targetCalories"],
                mealCount=meal_count,
                meals=day_meals_dict,
                nutrition=daily_nut_summary
            )

            solved_days.append((day_offset, day_response, day_meals_dict, daily_nut_summary, solver_res.solve_time_ms))
            total_opt_time += solver_res.solve_time_ms

        weekly_plan: List[WeeklyDietDayResponse] = [item[1] for item in solved_days]
        first_day_meals = solved_days[0][2]
        first_day_nutrition = solved_days[0][3]

        # 4. Safety Validation
        t_val_start = time.perf_counter()
        sample_plan_to_validate = {
            "meals": {k: v.model_dump() for k, v in first_day_meals.items()},
            "dailyNutrition": first_day_nutrition.model_dump() if first_day_nutrition else {}
        }
        safety_dict = SafetyValidator.validate_plan(sample_plan_to_validate, uc, prefs)
        safety_report = SafetyReport(**safety_dict)
        t_val_ms = (time.perf_counter() - t_val_start) * 1000
        logger.info(f"[MILP Diet Engine] Validation: {t_val_ms:.2f}ms (Status: {safety_report.safetyStatus})")

        # 5. Format Week Range String
        start_date = today.strftime("%b %d")
        end_date = (today + timedelta(days=days_count - 1)).strftime("%b %d, %Y")
        week_range_str = f"{start_date} – {end_date}"

        total_diet_gen_ms = (time.perf_counter() - t_start_total) * 1000
        logger.info(
            f"[MILP Diet Engine] Diet generation completed: Total: {total_diet_gen_ms:.2f}ms "
            f"(Solver execution: {total_opt_time:.2f}ms, Solver status: OPTIMAL)"
        )

        clinical_context_resp = ClinicalContextResponse(
            activeRules=active_rules,
            appliedRulesSummary=applied_summary,
            unifiedConstraints=uc,
            solverStatus="OPTIMAL",
            solverName="PuLP-CBC",
            optimizationTimeMs=round(total_opt_time, 2)
        )

        return OptimizeDietResponse(
            success=True,
            weekRange=week_range_str,
            mealCount=meal_count,
            targetCalories=uc["targetCalories"],
            weeklyPlan=weekly_plan,
            meals=first_day_meals,
            dailyNutrition=first_day_nutrition,
            clinicalContext=clinical_context_resp,
            safety=safety_report,
            ruleVersion="2.0.0-MILP-IFCT2017",
            message="Personalized multi-day diet plan successfully generated via Mixed Integer Linear Programming (MILP)."
        )
