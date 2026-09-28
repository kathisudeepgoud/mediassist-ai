"""
Nutritional Calculator for IFCT 2017 Food Database
Converts source units, scales portion weights, and computes comprehensive macro and micro nutrient totals.
"""

from typing import Dict, List, Any

# Standard Baseline Indian Serving Portions in Grams
SERVING_SIZES = {
    "staple_cereal_main": 80.0,       # Whole wheat flour / rice dry weight (~2 rotis or 1 cup cooked rice)
    "staple_cereal_breakfast": 60.0,  # Oats / Poha / Upma / Ragi dry equivalent
    "pulse_dal_main": 45.0,           # Dry dal / legume equivalent for 1 medium katori cooked
    "non_veg_main": 120.0,            # Cooked chicken / fish portion
    "egg_serving": 100.0,             # 2 medium boiled/cooked eggs
    "vegetable_sabzi": 120.0,         # Cooked sabzi vegetable portion
    "leafy_vegetable": 100.0,         # Cooked green leafy vegetables (GLV)
    "salad_veg": 80.0,                # Sliced cucumber / carrot / tomato
    "snack_fruit": 120.0,             # 1 medium fruit (Apple / Guava / Orange / Papaya)
    "snack_nuts": 20.0,               # Handful of almonds / walnuts / seeds
    "dairy_curd_milk": 150.0,         # 1 cup low-fat milk or 1 katori curd
    "oil_cooking": 10.0               # Healthy cooking oil allocation
}

def get_portion_for_group(group_code: str, meal_slot: str = "lunch", portion_scale: float = 1.0) -> float:
    """Determine clinical serving size in grams based on food group and meal context."""
    g = (group_code or "A").upper()
    if g == "A":
        if meal_slot == "breakfast":
            return round(SERVING_SIZES["staple_cereal_breakfast"] * portion_scale, 1)
        return round(SERVING_SIZES["staple_cereal_main"] * portion_scale, 1)
    elif g == "B":
        return round(SERVING_SIZES["pulse_dal_main"] * portion_scale, 1)
    elif g == "C":
        return round(SERVING_SIZES["leafy_vegetable"] * portion_scale, 1)
    elif g in ("D", "F"):
        if meal_slot == "salad":
            return round(SERVING_SIZES["salad_veg"], 1)
        return round(SERVING_SIZES["vegetable_sabzi"] * portion_scale, 1)
    elif g == "E":
        return round(SERVING_SIZES["snack_fruit"], 1)
    elif g == "H":
        return round(SERVING_SIZES["snack_nuts"], 1)
    elif g == "L":
        return round(SERVING_SIZES["dairy_curd_milk"], 1)
    elif g == "M":
        return round(SERVING_SIZES["egg_serving"], 1)
    elif g == "N":
        return round(SERVING_SIZES["non_veg_main"] * portion_scale, 1)
    elif g in ("P", "Q", "R", "S"):
        return round(SERVING_SIZES["non_veg_main"] * portion_scale, 1)
    elif g == "O":
        return round(SERVING_SIZES["non_veg_main"] * portion_scale, 1)
    return round(100.0 * portion_scale, 1)

def extract_nutrient_per_100g(nutrients: Dict[str, Any], code: str) -> float:
    """Extract numeric value of a nutrient per 100g from IFCT nutrient dict."""
    if not nutrients:
        return 0.0
    val = nutrients.get(code, 0.0)
    if isinstance(val, (int, float)):
        return float(val)
    try:
        cleaned = str(val).replace(",", "").replace("<", "").replace(">", "").strip()
        return float(cleaned) if cleaned else 0.0
    except (ValueError, TypeError):
        return 0.0

def calculate_calories_per_100g(nutrients: Dict[str, Any]) -> float:
    """
    Calculate kcal per 100g from IFCT 2017 dataset.
    IFCT stores energy in 'enerc' (kJ). Conversion factor: 1 kcal = 4.184 kJ.
    """
    raw_kj = extract_nutrient_per_100g(nutrients, "enerc")
    if raw_kj > 0:
        return raw_kj / 4.184
    # Fallback to Atwater general factors: 4 * protein + 4 * carbs + 9 * fat
    p = extract_nutrient_per_100g(nutrients, "protcnt")
    c = extract_nutrient_per_100g(nutrients, "choavldf")
    f = extract_nutrient_per_100g(nutrients, "fatce")
    return (p * 4.0) + (c * 4.0) + (f * 9.0)

def calculate_item_nutrients(nutrients: Dict[str, Any], quantity_grams: float) -> Dict[str, float]:
    """Calculate exact nutrient values for a specific portion quantity in grams."""
    factor = quantity_grams / 100.0
    cal_per_100g = calculate_calories_per_100g(nutrients)
    
    return {
        "calories": round(cal_per_100g * factor, 1),
        "protein": round(extract_nutrient_per_100g(nutrients, "protcnt") * factor, 2),
        "carbs": round(extract_nutrient_per_100g(nutrients, "choavldf") * factor, 2),
        "fat": round(extract_nutrient_per_100g(nutrients, "fatce") * factor, 2),
        "fiber": round(extract_nutrient_per_100g(nutrients, "fibtg") * factor, 2),
        "sodium": round(extract_nutrient_per_100g(nutrients, "na") * factor, 1),
        "potassium": round(extract_nutrient_per_100g(nutrients, "k") * factor, 1),
        "calcium": round(extract_nutrient_per_100g(nutrients, "ca") * factor, 1),
        "iron": round(extract_nutrient_per_100g(nutrients, "fe") * factor, 2),
        "vitaminC": round(extract_nutrient_per_100g(nutrients, "vitc") * factor, 1),
        "folate": round(extract_nutrient_per_100g(nutrients, "folsum") * factor, 1),
        "satFat": round(extract_nutrient_per_100g(nutrients, "fasat") * factor, 2),
        "freeSugars": round(extract_nutrient_per_100g(nutrients, "fsugar") * factor, 2)
    }

def sum_daily_nutrients(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate total daily nutrients from a list of selected meal food items."""
    totals = {
        "calories": 0.0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0,
        "fiber": 0.0,
        "sodium": 0.0,
        "potassium": 0.0,
        "calcium": 0.0,
        "iron": 0.0,
        "vitaminC": 0.0,
        "folate": 0.0
    }
    
    for item in items:
        qty = float(item.get("quantityGrams", 100.0))
        nut = item.get("foodNutrients", {})
        item_nut = calculate_item_nutrients(nut, qty)
        
        totals["calories"] += item_nut["calories"]
        totals["protein"] += item_nut["protein"]
        totals["carbs"] += item_nut["carbs"]
        totals["fat"] += item_nut["fat"]
        totals["fiber"] += item_nut["fiber"]
        totals["sodium"] += item_nut["sodium"]
        totals["potassium"] += item_nut["potassium"]
        totals["calcium"] += item_nut["calcium"]
        totals["iron"] += item_nut["iron"]
        totals["vitaminC"] += item_nut["vitaminC"]
        totals["folate"] += item_nut["folate"]
        
    return {
        "calories": int(round(totals["calories"])),
        "protein": round(totals["protein"], 1),
        "carbs": round(totals["carbs"], 1),
        "fat": round(totals["fat"], 1),
        "fiber": round(totals["fiber"], 1),
        "sodium": int(round(totals["sodium"])),
        "potassium": int(round(totals["potassium"])),
        "calcium": int(round(totals["calcium"])),
        "iron": round(totals["iron"], 1),
        "vitaminC": round(totals["vitaminC"], 1),
        "folate": round(totals["folate"], 1)
    }
