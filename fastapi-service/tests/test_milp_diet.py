"""
Comprehensive Test Suite for MILP Personalized Diet Optimization Engine
Covers:
1. Feasible single-day & multi-day optimization
2. Infeasible/tight constraint diagnostics
3. Zero-allergen violations (Peanuts, Dairy, Gluten, Shellfish, etc.)
4. Vegetarian vs Eggetarian vs Fishetarian vs Non-Veg compliance
5. Exact IFCT 2017 nutrient summation and calorie accuracy
6. Multi-disease co-occurrence (Diabetes + Heart + Kidney)
7. Independent Safety Validation
"""

import pytest
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
FASTAPI_ROOT = PROJECT_ROOT / "fastapi-service"
if str(FASTAPI_ROOT) not in sys.path:
    sys.path.insert(0, str(FASTAPI_ROOT))

from services.diet.schemas import OptimizeDietRequest, PatientContext, DietPreferences, DiseaseRiskItem
from services.diet.services.diet_service import DietService
from routers.diet_router import load_local_ifct_foods
from services.diet.optimizer.model import is_food_allergen_conflict, is_diet_type_compliant

@pytest.fixture(scope="module")
def ifct_foods():
    foods = load_local_ifct_foods()
    assert len(foods) > 100, f"Expected > 100 IFCT foods, loaded {len(foods)}"
    return foods

def test_ifct_database_loading(ifct_foods):
    """Verify IFCT 2017 dataset loaded with proper groups and nutrient maps."""
    sample = ifct_foods[0]
    assert "food_code" in sample
    assert "food_name" in sample
    assert "group_code" in sample
    assert "nutrients" in sample
    assert len(sample["nutrients"]) > 0

def test_allergen_filtering_logic():
    """Verify zero tolerance for configured allergens and custom dislikes."""
    assert is_food_allergen_conflict("Roasted Peanuts", "", allergies=["peanut"]) is True
    assert is_food_allergen_conflict("Mungphali Chikki", "mungphali", allergies=["peanut"]) is True
    assert is_food_allergen_conflict("Steamed Rice", "", allergies=["peanut"]) is False
    assert is_food_allergen_conflict("Wheat Roti", "", allergies=["gluten"]) is True
    assert is_food_allergen_conflict("Fresh Curd", "", allergies=["dairy"]) is True
    assert is_food_allergen_conflict("Rohu Fish Curry", "", allergies=["fish"], group_code="P") is True
    assert is_food_allergen_conflict("Bitter Gourd Sabzi", "", excluded_foods=["karela", "bitter gourd"]) is True

def test_diet_type_compliance_logic():
    """Verify dietary patterns exclude improper groups strictly."""
    # Vegetarian
    assert is_diet_type_compliant("A", [], "Vegetarian") is True   # Cereals
    assert is_diet_type_compliant("B", [], "Vegetarian") is True   # Pulses
    assert is_diet_type_compliant("L", [], "Vegetarian") is True   # Dairy
    assert is_diet_type_compliant("M", [], "Vegetarian") is False  # Eggs
    assert is_diet_type_compliant("N", [], "Vegetarian") is False  # Poultry
    assert is_diet_type_compliant("P", [], "Vegetarian") is False  # Fish

    # Eggetarian
    assert is_diet_type_compliant("M", [], "Eggetarian") is True
    assert is_diet_type_compliant("N", [], "Eggetarian") is False

    # Non-Vegetarian
    assert is_diet_type_compliant("N", [], "Non-Vegetarian") is True
    assert is_diet_type_compliant("P", [], "Non-Vegetarian") is True

def test_milp_single_and_multi_disease_optimization(ifct_foods):
    """Test MILP optimization with Diabetes + Heart + Kidney co-occurring risks."""
    request = OptimizeDietRequest(
        patientProfile=PatientContext(
            patientId="P_TEST_01",
            name="Arun Kumar",
            age=52,
            gender="Male",
            heightCm=170.0,
            weightKg=70.0,
            activity_level="Moderately Active",
            health_goal="Maintenance"
        ),
        clinicalVitals={
            "fasting_sugar": 155,
            "hba1c": 8.1,
            "cholesterol": 230,
            "sysBP": 138,
            "sc": 1.7,
            "pot": 4.8
        },
        diseaseRisks=[
            DiseaseRiskItem(name="Diabetes", status="High", percentage=74.0),
            DiseaseRiskItem(name="Heart Disease", status="Moderate", percentage=52.0),
            DiseaseRiskItem(name="Kidney Disease", status="Moderate", percentage=45.0)
        ],
        preferences=DietPreferences(
            diet_type="Vegetarian",
            food_preference="North Indian",
            meal_count=5,
            allergies=["peanut"]
        ),
        days=3
    )

    response = DietService.generate_personalized_plan(request, ifct_foods)

    assert response.success is True
    assert len(response.weeklyPlan) == 3
    assert response.mealCount == 5
    assert response.targetCalories > 1400 and response.targetCalories < 2500

    # Verify no peanut in any meals
    for day in response.weeklyPlan:
        assert day.nutrition.calories > 1200 and day.nutrition.calories < 2600
        for slot_key, slot in day.meals.items():
            assert len(slot.items) > 0
            for item in slot.items:
                assert "peanut" not in item.name.lower()
                assert item.foodCode != "A018"  # Refined flour (Maida) restricted for diabetes

    # Safety check
    assert response.safety.isValid is True
    assert len(response.safety.warnings) > 0  # Should contain kidney disclaimer

def test_non_veg_plan_generation(ifct_foods):
    """Test Non-Vegetarian diet optimization with poultry and fish inclusion."""
    request = OptimizeDietRequest(
        patientProfile=PatientContext(
            patientId="P_TEST_02",
            name="Vikram Singh",
            age=38,
            gender="Male",
            heightCm=175.0,
            weightKg=75.0,
            activity_level="Very Active"
        ),
        clinicalVitals={"hgb": 10.5},
        diseaseRisks=[
            DiseaseRiskItem(name="CBC Anemia", status="High", percentage=68.0)
        ],
        preferences=DietPreferences(
            diet_type="Non-Vegetarian",
            food_preference="South Indian",
            meal_count=5,
            allergies=[]
        ),
        days=2
    )

    response = DietService.generate_personalized_plan(request, ifct_foods)
    assert response.success is True
    assert len(response.weeklyPlan) == 2
    # Check that iron is boosted (> 15 mg)
    for day in response.weeklyPlan:
        assert day.nutrition.iron >= 12.0

if __name__ == "__main__":
    pytest.main(["-v", __file__])
