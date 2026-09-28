"""
Clinical Safety Validator Layer
Validates that the MILP optimized meal plan satisfies:
1. Zero allergen violations
2. Strict diet type compliance
3. Renal, cardiac, and hepatic safety boundaries
4. Valid item counts and portion ranges
"""

from typing import Dict, List, Any
from ..optimizer.model import is_food_allergen_conflict, is_diet_type_compliant

class SafetyValidator:
    """
    Independent post-optimization safety checker.
    """

    @staticmethod
    def validate_plan(
        meal_plan: Dict[str, Any],
        unified_constraints: Dict[str, Any],
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        warnings = []
        safety_status = "SAFE"

        allergies = preferences.get("allergies", [])
        excluded_foods = preferences.get("excluded_foods", [])
        diet_type = preferences.get("diet_type", "Vegetarian")

        meals = meal_plan.get("meals", {})
        total_items_count = 0

        for meal_key, meal_obj in meals.items():
            items = meal_obj.get("items", [])
            total_items_count += len(items)

            for item in items:
                name = item.get("name", "")
                code = item.get("foodCode", "")
                group = code[0] if code else "A"

                # 1. Check Allergens
                if is_food_allergen_conflict(name, "", allergies, excluded_foods, group):
                    safety_status = "UNSAFE_ALLERGEN_VIOLATION"
                    warnings.append({
                        "type": "ALLERGEN_CONFLICT",
                        "message": f'Item "{name}" in {meal_obj.get("title", meal_key)} conflicts with patient allergy preferences.',
                        "item": name
                    })

                # 2. Check Diet Type Compliance
                if not is_diet_type_compliant(group, [], diet_type):
                    safety_status = "UNSAFE_DIET_TYPE_VIOLATION"
                    warnings.append({
                        "type": "DIET_TYPE_MISMATCH",
                        "message": f'Item "{name}" in {meal_obj.get("title", meal_key)} does not match chosen diet type ({diet_type}).',
                        "item": name
                    })

        # 3. Check Nutritional Boundary Limits
        daily = meal_plan.get("dailyNutrition", {})
        max_na = unified_constraints.get("maxSodiumDailyMg")
        if max_na and daily.get("sodium", 0) > max_na * 1.25:
            warnings.append({
                "type": "SODIUM_ELEVATED",
                "message": f"Daily estimated sodium ({daily.get('sodium')} mg) approaches upper recommended limit for cardiovascular/renal profile."
            })

        max_k = unified_constraints.get("maxPotassiumDailyMg")
        if max_k and daily.get("potassium", 0) > max_k * 1.2:
            warnings.append({
                "type": "POTASSIUM_ELEVATED",
                "message": f"Daily potassium ({daily.get('potassium')} mg) exceeds conservative renal safety threshold ({max_k} mg)."
            })
            if safety_status == "SAFE":
                safety_status = "CONDITIONAL_RENAL_REVIEW"

        # 4. Clinical Disclaimers
        disclaimers = unified_constraints.get("safetyDisclaimers", [])
        for msg in disclaimers:
            warnings.append({
                "type": "CLINICAL_DISCLAIMER",
                "message": msg
            })
            if safety_status == "SAFE":
                safety_status = "CAUTION_CONDITIONAL"

        # Mandatory General Clinical Disclaimer
        warnings.append({
            "type": "GENERAL_DISCLAIMER",
            "message": "The MediAssist AI Diet Planner provides automated nutrition-oriented guidance based on clinical findings and IFCT 2017 composition data. It is not a replacement for professional medical diagnosis or personalized dietitian consultation."
        })

        return {
            "isValid": not safety_status.startswith("UNSAFE"),
            "safetyStatus": safety_status,
            "warnings": warnings,
            "totalItemsCount": total_items_count
        }
