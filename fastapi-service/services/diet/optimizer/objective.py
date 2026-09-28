"""
MILP Multi-Objective Function Formulator
Constructs the multi-criteria linear objective function balancing:
1. Calorie target deviation minimization
2. Excessive clinical nutrient penalties (sodium, saturated fat, free sugars)
3. Nutritional adequacy bonuses (fiber, protein, iron, vitamin C)
4. Patient preference alignment & regional affinity
5. Variety & anti-repetition across weekly days
"""

from typing import List, Dict, Any
import pulp

from .variables import OptimizationVariables
from .constraints import ConstraintBuilder

class ObjectiveFormulator:
    """
    Formulates a weighted multi-objective linear function.
    """

    def __init__(
        self,
        prob: pulp.LpProblem,
        vars: OptimizationVariables,
        constraint_builder: ConstraintBuilder,
        foods: List[Dict[str, Any]],
        preferences: Dict[str, Any],
        used_in_week: Dict[str, int] = None,
        preferred_food_codes: List[str] = None
    ):
        self.prob = prob
        self.vars = vars
        self.cb = constraint_builder
        self.foods = foods
        self.pref = preferences
        self.used_in_week = used_in_week or {}
        self.preferred_food_codes = set(preferred_food_codes or [])

    def build_objective(self):
        """
        Build and set the LpProblem objective function:
        Minimize Z = Sum(Penalties + Deficits + Deviations) - Sum(Benefits + Preferences)
        """
        # Objective weights
        w_cal_dev = 2.0         # Caloric precision weight
        w_prot_deficit = 15.0   # Protein deficiency penalty
        w_fib_deficit = 10.0    # Fiber deficiency penalty
        w_fe_deficit = 8.0      # Iron deficiency penalty
        w_vitc_deficit = 5.0    # Vitamin C deficiency penalty

        w_sodium = 0.005        # Sodium penalty per mg
        w_satfat = 0.8          # Saturated fat penalty per gram
        w_sugar = 0.6           # Free sugar penalty per gram

        w_fiber_boost = 1.5     # Dietary fiber reward per gram
        w_prot_boost = 0.8      # Protein reward per gram
        w_fe_boost = 0.5        # Iron reward per mg
        w_vitc_boost = 0.2      # Vitamin C reward per mg

        w_pref_match = 12.0     # Preference & regional affinity bonus
        w_clinical_staple = 15.0 # Direct guideline-recommended staple bonus
        w_repeat_penalty = 8.0  # Weekly repetition penalty

        obj_terms = []

        # 1. Soft Goal Deficit & Caloric Deviation Penalties
        obj_terms.append(w_cal_dev * (self.vars.slack_cal_pos + self.vars.slack_cal_neg))
        obj_terms.append(w_prot_deficit * self.vars.slack_prot_neg)
        obj_terms.append(w_fib_deficit * self.vars.slack_fib_neg)
        obj_terms.append(w_fe_deficit * self.vars.slack_fe_neg)
        obj_terms.append(w_vitc_deficit * self.vars.slack_vitc_neg)

        # 2. Food-level linear nutrient and preference terms
        regional_pref = (self.pref.get("food_preference", "All") or "All").lower()

        for f_idx, food in enumerate(self.foods):
            code = food.get("food_code", "")
            local_names = (food.get("local_names_raw", "") or "").lower()

            # Base preference score
            pref_score = 0.0
            if regional_pref != "all" and regional_pref != "":
                if "north" in regional_pref and any(k in local_names for k in ["h.", "p.", "kash.", "g."]):
                    pref_score += 1.0
                elif "south" in regional_pref and any(k in local_names for k in ["tam.", "tel.", "kan.", "mal."]):
                    pref_score += 1.0
                elif "east" in regional_pref and any(k in local_names for k in ["b.", "a.", "o.", "m."]):
                    pref_score += 1.0
                elif "west" in regional_pref and any(k in local_names for k in ["mar.", "g.", "kon."]):
                    pref_score += 1.0

            if code in self.preferred_food_codes:
                pref_score += 1.5

            # Weekly repetition count penalty for variety
            past_uses = self.used_in_week.get(code, 0)
            rep_penalty = past_uses * w_repeat_penalty

            # Food global activation term
            if rep_penalty > 0:
                obj_terms.append(rep_penalty * self.vars.z[f_idx])

            # Per-meal food selection coefficients
            for m_idx in range(self.vars.num_meals):
                x_var = self.vars.x[f_idx, m_idx]
                y_var = self.vars.y[f_idx, m_idx]

                # Clinical & nutritional item terms
                term = (
                    (w_sodium * self.cb.serving_na[f_idx] * x_var)
                    + (w_satfat * self.cb.serving_satfat[f_idx] * x_var)
                    + (w_sugar * self.cb.serving_sugar[f_idx] * x_var)
                    - (w_fiber_boost * self.cb.serving_fib[f_idx] * x_var)
                    - (w_prot_boost * self.cb.serving_prot[f_idx] * x_var)
                    - (w_fe_boost * self.cb.serving_fe[f_idx] * x_var)
                    - (w_vitc_boost * self.cb.serving_vitc[f_idx] * x_var)
                    - (w_pref_match * pref_score * y_var)
                )
                obj_terms.append(term)

        # Set LpProblem objective
        self.prob += pulp.lpSum(obj_terms), "Multi_Objective_Nutrition_Score"
