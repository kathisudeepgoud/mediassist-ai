"""
MILP Clinical & Nutritional Constraint Builder
Translates clinical vitals, disease risk predictions, preferences, and nutritional guidelines
into rigorous mathematical linear inequalities and equalities.
"""

from typing import List, Dict, Any
import pulp

from .variables import OptimizationVariables
from ..nutrition import (
    calculate_calories_per_100g,
    extract_nutrient_per_100g,
    get_portion_for_group
)

class ConstraintBuilder:
    """
    Constructs mathematical constraints for the MILP problem.
    """

    def __init__(
        self,
        prob: pulp.LpProblem,
        vars: OptimizationVariables,
        foods: List[Dict[str, Any]],
        meal_slots: List[str],
        unified_constraints: Dict[str, Any],
        preferences: Dict[str, Any],
        portion_scale: float = 1.0
    ):
        self.prob = prob
        self.vars = vars
        self.foods = foods
        self.meal_slots = meal_slots
        self.uc = unified_constraints
        self.pref = preferences
        self.portion_scale = portion_scale

        # Precompute per-food standard serving nutrient delivery
        self._precompute_food_serving_nutrients()

    def _precompute_food_serving_nutrients(self):
        """Precalculate nutrient contents for 1 standard serving of each candidate food."""
        self.serving_grams = []
        self.serving_cal = []
        self.serving_prot = []
        self.serving_carb = []
        self.serving_fat = []
        self.serving_fib = []
        self.serving_na = []
        self.serving_k = []
        self.serving_p = []
        self.serving_fe = []
        self.serving_vitc = []
        self.serving_satfat = []
        self.serving_sugar = []

        for f in self.foods:
            g = f.get("group_code", "A")
            base_g = get_portion_for_group(g, "lunch", self.portion_scale)
            factor = base_g / 100.0
            nut = f.get("nutrients", {})

            self.serving_grams.append(base_g)
            self.serving_cal.append(calculate_calories_per_100g(nut) * factor)
            self.serving_prot.append(extract_nutrient_per_100g(nut, "protcnt") * factor)
            self.serving_carb.append(extract_nutrient_per_100g(nut, "choavldf") * factor)
            self.serving_fat.append(extract_nutrient_per_100g(nut, "fatce") * factor)
            self.serving_fib.append(extract_nutrient_per_100g(nut, "fibtg") * factor)
            self.serving_na.append(extract_nutrient_per_100g(nut, "na") * factor)
            self.serving_k.append(extract_nutrient_per_100g(nut, "k") * factor)
            self.serving_p.append(extract_nutrient_per_100g(nut, "p") * factor)
            self.serving_fe.append(extract_nutrient_per_100g(nut, "fe") * factor)
            self.serving_vitc.append(extract_nutrient_per_100g(nut, "vitc") * factor)
            self.serving_satfat.append(extract_nutrient_per_100g(nut, "fasat") * factor)
            self.serving_sugar.append(extract_nutrient_per_100g(nut, "fsugar") * factor)

    def build_all_constraints(self):
        """Build and register all linear constraints on the LpProblem."""
        self._build_linking_constraints()
        self._build_meal_structure_constraints()
        self._build_caloric_balance_constraints()
        self._build_macronutrient_constraints()
        self._build_micronutrient_safety_constraints()
        self._build_anti_repetition_constraints()

    def _build_linking_constraints(self):
        """
        Semi-continuous / Big-M serving bounds:
        0.5 * y[f, m] <= x[f, m] <= 2.0 * y[f, m]
        Also link daily z[f] >= y[f, m] and z[f] <= sum_m y[f, m]
        """
        for f_idx in range(self.vars.num_foods):
            # Link meal selections to global daily selection z[f]
            self.prob += (
                pulp.lpSum(self.vars.y[f_idx, m_idx] for m_idx in range(self.vars.num_meals))
                >= self.vars.z[f_idx],
                f"Link_Global_Min_{f_idx}"
            )
            for m_idx in range(self.vars.num_meals):
                self.prob += (
                    self.vars.z[f_idx] >= self.vars.y[f_idx, m_idx],
                    f"Link_Global_Max_{f_idx}_{m_idx}"
                )
                # Lower and Upper serving bounds if selected
                self.prob += (
                    self.vars.x[f_idx, m_idx] >= 0.50 * self.vars.y[f_idx, m_idx],
                    f"Serving_Lower_{f_idx}_{m_idx}"
                )
                self.prob += (
                    self.vars.x[f_idx, m_idx] <= 2.00 * self.vars.y[f_idx, m_idx],
                    f"Serving_Upper_{f_idx}_{m_idx}"
                )

    def _build_meal_structure_constraints(self):
        """
        Ensure authentic Indian dining structure:
        - Breakfast: 2-3 items (>=1 grain/cereal, >=1 protein/dairy/egg/legume)
        - Lunch: 3-4 items (>=1 grain/cereal, >=1 dal/protein/meat/fish, >=1 sabzi/salad)
        - Dinner: 2-4 items (>=1 grain/cereal, >=1 dal/protein/meat/fish, >=1 sabzi/salad)
        - Snacks: 1-2 items (fruits, nuts, beverages)
        """
        meal_names = [m.lower() for m in self.meal_slots]

        cereal_indices = [i for i, f in enumerate(self.foods) if f.get("group_code") == "A"]
        protein_indices = [i for i, f in enumerate(self.foods) if f.get("group_code") in ("B", "M", "N", "P", "Q", "R", "S", "L")]
        veg_indices = [i for i, f in enumerate(self.foods) if f.get("group_code") in ("C", "D", "F")]
        snack_indices = [i for i, f in enumerate(self.foods) if f.get("group_code") in ("E", "H", "L")]

        for m_idx, m_name in enumerate(meal_names):
            # Total items in this meal
            meal_y_sum = pulp.lpSum(self.vars.y[f_idx, m_idx] for f_idx in range(self.vars.num_foods))

            if "breakfast" in m_name:
                self.prob += (meal_y_sum >= 1, f"Breakfast_Min_Items_{m_idx}")
                self.prob += (meal_y_sum <= 3, f"Breakfast_Max_Items_{m_idx}")
                if cereal_indices:
                    self.prob += (
                        pulp.lpSum(self.vars.y[i, m_idx] for i in cereal_indices) >= 1,
                        f"Breakfast_Cereal_Req_{m_idx}"
                    )

            elif "lunch" in m_name:
                self.prob += (meal_y_sum >= 2, f"Lunch_Min_Items_{m_idx}")
                self.prob += (meal_y_sum <= 4, f"Lunch_Max_Items_{m_idx}")
                if cereal_indices:
                    self.prob += (
                        pulp.lpSum(self.vars.y[i, m_idx] for i in cereal_indices) >= 1,
                        f"Lunch_Cereal_Req_{m_idx}"
                    )
                if protein_indices:
                    self.prob += (
                        pulp.lpSum(self.vars.y[i, m_idx] for i in protein_indices) >= 1,
                        f"Lunch_Prot_Req_{m_idx}"
                    )
                if veg_indices:
                    self.prob += (
                        pulp.lpSum(self.vars.y[i, m_idx] for i in veg_indices) >= 1,
                        f"Lunch_Veg_Req_{m_idx}"
                    )

            elif "dinner" in m_name:
                self.prob += (meal_y_sum >= 2, f"Dinner_Min_Items_{m_idx}")
                self.prob += (meal_y_sum <= 4, f"Dinner_Max_Items_{m_idx}")
                if cereal_indices:
                    self.prob += (
                        pulp.lpSum(self.vars.y[i, m_idx] for i in cereal_indices) >= 1,
                        f"Dinner_Cereal_Req_{m_idx}"
                    )
                if protein_indices:
                    self.prob += (
                        pulp.lpSum(self.vars.y[i, m_idx] for i in protein_indices) >= 1,
                        f"Dinner_Prot_Req_{m_idx}"
                    )

            else:  # Snacks / Mid-morning / Evening snack
                self.prob += (meal_y_sum >= 1, f"Snack_Min_Items_{m_idx}")
                self.prob += (meal_y_sum <= 2, f"Snack_Max_Items_{m_idx}")
                if snack_indices:
                    self.prob += (
                        pulp.lpSum(self.vars.y[i, m_idx] for i in snack_indices) >= 1,
                        f"Snack_Fruit_Nut_Req_{m_idx}"
                    )

    def _build_caloric_balance_constraints(self):
        """
        Total Daily Energy:
        Sum(cal_f * x_f,m) + slack_cal_neg - slack_cal_pos = TargetCalories
        """
        target_cal = float(self.uc.get("targetCalories", 1800))
        total_energy_expr = pulp.lpSum(
            self.serving_cal[f_idx] * self.vars.x[f_idx, m_idx]
            for f_idx in range(self.vars.num_foods)
            for m_idx in range(self.vars.num_meals)
        )

        self.prob += (
            total_energy_expr + self.vars.slack_cal_neg - self.vars.slack_cal_pos == target_cal,
            "Total_Daily_Energy_Goal"
        )
        # Bounded feasibility limits
        self.prob += (total_energy_expr >= target_cal * 0.70, "Hard_Calorie_Lower_Bound")
        self.prob += (total_energy_expr <= target_cal * 1.30, "Hard_Calorie_Upper_Bound")

    def _build_macronutrient_constraints(self):
        """Protein, Saturated Fat, and Dietary Fiber constraints."""
        total_prot = pulp.lpSum(
            self.serving_prot[f_idx] * self.vars.x[f_idx, m_idx]
            for f_idx in range(self.vars.num_foods)
            for m_idx in range(self.vars.num_meals)
        )
        min_prot = float(self.uc.get("minDailyProteinGrams", 40))
        max_prot = float(self.uc.get("maxDailyProteinGrams", 90))

        self.prob += (total_prot + self.vars.slack_prot_neg >= min_prot, "Protein_Adequacy_Goal")
        self.prob += (total_prot <= max_prot, "Protein_Upper_Limit_Safety")

        # Dietary Fiber
        total_fib = pulp.lpSum(
            self.serving_fib[f_idx] * self.vars.x[f_idx, m_idx]
            for f_idx in range(self.vars.num_foods)
            for m_idx in range(self.vars.num_meals)
        )
        min_fib = float(self.uc.get("minDailyFiberGrams", 25))
        self.prob += (total_fib + self.vars.slack_fib_neg >= min_fib, "Fiber_Target_Goal")

        # Saturated Fat bound (< 8% of calories)
        total_satfat = pulp.lpSum(
            self.serving_satfat[f_idx] * self.vars.x[f_idx, m_idx]
            for f_idx in range(self.vars.num_foods)
            for m_idx in range(self.vars.num_meals)
        )
        target_cal = float(self.uc.get("targetCalories", 1800))
        max_satfat_pct = float(self.uc.get("maxSaturatedFatPercent", 8.0))
        max_satfat_grams = max(15.0, (target_cal * (max_satfat_pct / 100.0)) / 9.0)
        self.prob += (total_satfat <= max_satfat_grams, "Saturated_Fat_Limit")

        # Free / Added Sugars
        total_sugar = pulp.lpSum(
            self.serving_sugar[f_idx] * self.vars.x[f_idx, m_idx]
            for f_idx in range(self.vars.num_foods)
            for m_idx in range(self.vars.num_meals)
        )
        max_sugar_grams = float(self.uc.get("maxDailyFreeSugarsGrams", 25.0))
        self.prob += (total_sugar <= max_sugar_grams, "Free_Sugars_Limit")

    def _build_micronutrient_safety_constraints(self):
        """Sodium, Potassium, Phosphorus, Iron, Vitamin C limits and targets."""
        # Sodium Limit (Cardiovascular & Renal Safety)
        total_na = pulp.lpSum(
            self.serving_na[f_idx] * self.vars.x[f_idx, m_idx]
            for f_idx in range(self.vars.num_foods)
            for m_idx in range(self.vars.num_meals)
        )
        max_na = float(self.uc.get("maxSodiumDailyMg", 2200))
        self.prob += (total_na <= max_na, "Daily_Sodium_Ceiling")

        # Potassium Limit (Renal Safety)
        total_k = pulp.lpSum(
            self.serving_k[f_idx] * self.vars.x[f_idx, m_idx]
            for f_idx in range(self.vars.num_foods)
            for m_idx in range(self.vars.num_meals)
        )
        max_k = float(self.uc.get("maxPotassiumDailyMg", 3500))
        self.prob += (total_k <= max_k, "Daily_Potassium_Ceiling")

        # Phosphorus Limit (Renal Safety)
        total_p = pulp.lpSum(
            self.serving_p[f_idx] * self.vars.x[f_idx, m_idx]
            for f_idx in range(self.vars.num_foods)
            for m_idx in range(self.vars.num_meals)
        )
        max_p = float(self.uc.get("maxPhosphorusDailyMg", 1200))
        self.prob += (total_p <= max_p, "Daily_Phosphorus_Ceiling")

        # Iron target (Anemia / CBC)
        total_fe = pulp.lpSum(
            self.serving_fe[f_idx] * self.vars.x[f_idx, m_idx]
            for f_idx in range(self.vars.num_foods)
            for m_idx in range(self.vars.num_meals)
        )
        min_fe = float(self.uc.get("minIronDailyMg", 15))
        self.prob += (total_fe + self.vars.slack_fe_neg >= min_fe, "Daily_Iron_Adequacy")

        # Vitamin C target
        total_vitc = pulp.lpSum(
            self.serving_vitc[f_idx] * self.vars.x[f_idx, m_idx]
            for f_idx in range(self.vars.num_foods)
            for m_idx in range(self.vars.num_meals)
        )
        min_vitc = float(self.uc.get("minVitaminCDailyMg", 40))
        self.prob += (total_vitc + self.vars.slack_vitc_neg >= min_vitc, "Daily_VitaminC_Adequacy")

    def _build_anti_repetition_constraints(self):
        """
        Anti-repetition within the same day:
        Each distinct food f can be selected at most once across all meals of the day.
        """
        for f_idx, f in enumerate(self.foods):
            max_daily_reps = 2 if f.get("group_code") in ("L", "T") else 1
            self.prob += (
                pulp.lpSum(self.vars.y[f_idx, m_idx] for m_idx in range(self.vars.num_meals)) <= max_daily_reps,
                f"Daily_Max_Repetition_{f_idx}"
            )
