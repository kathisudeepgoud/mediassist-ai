"""
MILP Diet Optimization Engine
Integrates candidate selection, variable creation, constraint building, multi-objective formulation,
and solution extraction into a unified mathematical optimization engine.
"""

from typing import List, Dict, Any, Optional, Tuple
import pulp

from .variables import OptimizationVariables
from .constraints import ConstraintBuilder
from .objective import ObjectiveFormulator
from .solver import MILPSolver, SolverResult
from ..nutrition import get_portion_for_group

# Common Indian / Global Allergen Mapping
ALLERGEN_KEYWORD_MAP = {
    "peanut": ["peanut", "groundnut", "singdana", "mungphali", "shenga", "verkadalai", "pallilu"],
    "treenut": ["almond", "walnut", "cashew", "pistachio", "badam", "akhrot", "kaju", "pista"],
    "dairy": ["milk", "curd", "yogurt", "paneer", "cheese", "butter", "ghee", "whey", "dahi", "chhena", "khoya", "mava", "paalu", "haalu"],
    "gluten": ["wheat", "atta", "maida", "suji", "rava", "semolina", "dalia", "vermicelli", "sewai", "barley", "jau", "gehun", "godhumai", "godhuma"],
    "egg": ["egg", "anda", "muttai", "guddu", "eeg"],
    "fish": ["fish", "macha", "meen", "chepa", "surmai", "pomfret", "rohu", "catla", "hilsa", "sardine", "mackerel", "tuna", "salmon"],
    "shellfish": ["prawn", "shrimp", "crab", "lobster", "clam", "mussel", "oyster", "jhinga", "yera", "royyalu", "nandu", "kekda"],
    "soy": ["soy", "soya", "soybean", "tofu", "edamame"],
    "sesame": ["sesame", "til", "ellu", "nuvvulu"],
    "mustard": ["mustard", "sarson", "rai", "kadugu", "aavalu"]
}

def is_food_allergen_conflict(
    food_name: str,
    local_names_raw: str,
    allergies: List[str] = None,
    excluded_foods: List[str] = None,
    group_code: str = ""
) -> bool:
    """Zero-tolerance allergy and custom food exclusion check."""
    allergies = allergies or []
    excluded_foods = excluded_foods or []
    target_text = f"{food_name or ''} {local_names_raw or ''}".lower()
    group = (group_code or "").upper()

    for allergy in allergies:
        clean = str(allergy).lower().strip()
        if not clean:
            continue
        if any(w in clean for w in ["fish", "seafood", "prawn", "shellfish"]) and group in ("P", "Q", "R", "S"):
            return True
        if clean in target_text:
            return True
        for key, keywords in ALLERGEN_KEYWORD_MAP.items():
            if key in clean:
                for kw in keywords:
                    if kw in target_text:
                        return True

    for excl in excluded_foods:
        clean_ex = str(excl).lower().strip()
        if clean_ex and clean_ex in target_text:
            return True

    return False

def is_diet_type_compliant(group_code: str, dietary_tags: List[str] = None, diet_type: str = "Vegetarian") -> bool:
    """Strict dietary pattern filter (Vegetarian, Eggetarian, Non-Vegetarian)."""
    dt = (diet_type or "Vegetarian").lower()
    g = (group_code or "").upper()

    if dt in ("vegetarian", "veg"):
        # Exclude eggs (M), meat (N, O), seafood (P, Q, R, S)
        return g not in ("M", "N", "O", "P", "Q", "R", "S")

    if dt == "eggetarian":
        # Exclude meat (N, O), seafood (P, Q, R, S)
        return g not in ("N", "O", "P", "Q", "R", "S")

    # Non-Vegetarian: all food groups allowed
    return True

class MILPDietEngine:
    """
    Mixed Integer Linear Programming Diet Optimizer.
    """

    def __init__(self, all_foods: List[Dict[str, Any]]):
        self.all_foods = all_foods

    def filter_candidate_foods(
        self,
        preferences: Dict[str, Any],
        restricted_food_codes: List[str] = None,
        restricted_categories: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Pre-optimization candidate space reduction:
        Removes foods that violate hard allergen, diet-type, or clinical bans.
        This reduces the branch-and-cut tree size while strictly preserving feasibility.
        """
        allergies = preferences.get("allergies", [])
        excluded_foods = preferences.get("excluded_foods", [])
        diet_type = preferences.get("diet_type", "Vegetarian")
        restricted_codes = set(restricted_food_codes or [])
        restricted_cats = set(restricted_categories or [])

        valid_foods = []
        for food in self.all_foods:
            f_code = food.get("food_code", "")
            g_code = food.get("group_code", "")
            g_name = food.get("group_name", "")
            f_name = food.get("food_name", "")
            local_raw = food.get("local_names_raw", "")
            tags = food.get("dietary_tags", [])

            # Hard Allergen Check
            if is_food_allergen_conflict(f_name, local_raw, allergies, excluded_foods, g_code):
                continue

            # Hard Diet Type Check
            if not is_diet_type_compliant(g_code, tags, diet_type):
                continue

            # Hard Clinical Code / Category Restriction
            if f_code in restricted_codes or g_name in restricted_cats:
                continue

            valid_foods.append(food)

        # Group by group_code and retain up to 8 diverse items per group for fast MILP branch-and-cut
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for f in valid_foods:
            g = f.get("group_code", "A")
            if g not in grouped:
                grouped[g] = []
            grouped[g].append(f)

        candidates = []
        for g, items in grouped.items():
            # Keep up to 8 items per group (e.g. cereals, pulses, veggies, fruits, nuts, poultry, fish)
            candidates.extend(items[:8])

        return candidates

    def optimize_day(
        self,
        candidate_foods: List[Dict[str, Any]],
        unified_constraints: Dict[str, Any],
        preferences: Dict[str, Any],
        meal_slots: List[str],
        used_in_week: Dict[str, int] = None,
        preferred_food_codes: List[str] = None
    ) -> Tuple[Optional[Dict[str, List[Dict[str, Any]]]], SolverResult]:
        """
        Build and solve a single day's MILP model across configured meal slots.
        """
        if not candidate_foods:
            return None, SolverResult(
                is_optimal=False,
                status="NO_CANDIDATES",
                solver_name="PuLP-CBC",
                solve_time_ms=0.0,
                diagnostics="Candidate food set is empty after applying hard allergen/diet-type filters."
            )

        prob = pulp.LpProblem("Personalized_Diet_Optimization", pulp.LpMinimize)

        target_cal = float(unified_constraints.get("targetCalories", 1800))
        portion_scale = max(0.75, min(1.35, target_cal / 1800.0))

        # 1. Variables
        vars_mgr = OptimizationVariables(prob, candidate_foods, meal_slots)

        # 2. Constraints
        cb = ConstraintBuilder(
            prob=prob,
            vars=vars_mgr,
            foods=candidate_foods,
            meal_slots=meal_slots,
            unified_constraints=unified_constraints,
            preferences=preferences,
            portion_scale=portion_scale
        )
        cb.build_all_constraints()

        # 3. Multi-Objective Function
        obj_formulator = ObjectiveFormulator(
            prob=prob,
            vars=vars_mgr,
            constraint_builder=cb,
            foods=candidate_foods,
            preferences=preferences,
            used_in_week=used_in_week,
            preferred_food_codes=preferred_food_codes
        )
        obj_formulator.build_objective()

        # 4. Solve
        solver_res = MILPSolver.solve_pulp(prob, time_limit_sec=15)

        if not solver_res.is_optimal:
            return None, solver_res

        # 5. Extract Optimal Solution
        selected_meals: Dict[str, List[Dict[str, Any]]] = {m: [] for m in meal_slots}

        for m_idx, m_name in enumerate(meal_slots):
            for f_idx, food in enumerate(candidate_foods):
                y_val = pulp.value(vars_mgr.y[f_idx, m_idx])
                if y_val is not None and y_val > 0.5:
                    x_mult = pulp.value(vars_mgr.x[f_idx, m_idx]) or 1.0
                    g_code = food.get("group_code", "A")
                    base_g = get_portion_for_group(g_code, m_name.lower(), portion_scale)
                    actual_grams = round(base_g * x_mult, 1)

                    selected_meals[m_name].append({
                        "food": food,
                        "quantityGrams": actual_grams,
                        "servingMultiplier": round(x_mult, 2)
                    })

        return selected_meals, solver_res
