from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal

class PatientContext(BaseModel):
    id: Optional[str] = None
    patientId: Optional[str] = None
    name: Optional[str] = "Patient"
    age: Optional[int] = 45
    gender: Optional[str] = "Male"
    heightCm: Optional[float] = 168.0
    weightKg: Optional[float] = 65.0
    activity_level: Optional[str] = "Moderately Active"
    health_goal: Optional[str] = "Maintenance"
    calorie_target_override: Optional[int] = None

class DiseaseRiskItem(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = "Low"  # Low, Moderate, High
    percentage: Optional[float] = 0.0

class DietPreferences(BaseModel):
    diet_type: Optional[str] = "Vegetarian"  # Vegetarian, Eggetarian, Non-Vegetarian
    food_preference: Optional[str] = "All"    # North Indian, South Indian, East Indian, West Indian, All
    activity_level: Optional[str] = "Moderately Active"
    meal_count: Optional[int] = 5             # 3, 4, 5
    allergies: Optional[List[str]] = Field(default_factory=list)
    excluded_foods: Optional[List[str]] = Field(default_factory=list)
    health_goal: Optional[str] = "Maintenance"
    calorie_target_override: Optional[int] = None

class FoodNutrientItem(BaseModel):
    id: Optional[str] = None
    food_code: str
    food_name: str
    scientific_name: Optional[str] = None
    dietary_tags: Optional[List[str]] = Field(default_factory=list)
    local_names_raw: Optional[str] = None
    group_code: str
    group_name: Optional[str] = None
    nutrients: Dict[str, float] = Field(default_factory=dict)

class OptimizeDietRequest(BaseModel):
    patientProfile: PatientContext = Field(default_factory=PatientContext)
    clinicalVitals: Dict[str, Any] = Field(default_factory=dict)
    diseaseRisks: List[DiseaseRiskItem] = Field(default_factory=list)
    preferences: DietPreferences = Field(default_factory=DietPreferences)
    days: Optional[int] = 7
    solver: Optional[Literal["pulp", "highs", "scipy"]] = "pulp"
    foods: Optional[List[FoodNutrientItem]] = None

class MealFoodItem(BaseModel):
    foodId: Optional[str] = None
    foodCode: str
    name: str
    portion: str
    quantityGrams: float
    foodNutrients: Dict[str, float] = Field(default_factory=dict)
    reasons: List[str] = Field(default_factory=list)

class MealSlot(BaseModel):
    title: str
    time: str
    targetCalories: int
    items: List[MealFoodItem] = Field(default_factory=list)

class DailyNutritionSummary(BaseModel):
    calories: int
    protein: float
    carbs: float
    fat: float
    fiber: float
    sodium: int
    potassium: int
    calcium: int
    iron: float
    vitaminC: float
    folate: Optional[float] = 0.0

class WeeklyDietDayResponse(BaseModel):
    day: str
    date: str
    dayOffset: int
    targetCalories: int
    mealCount: int
    meals: Dict[str, MealSlot]
    nutrition: DailyNutritionSummary

class SafetyReport(BaseModel):
    isValid: bool
    safetyStatus: str
    warnings: List[Dict[str, Any]] = Field(default_factory=list)
    totalItemsCount: int

class ClinicalContextResponse(BaseModel):
    activeRules: List[Dict[str, Any]] = Field(default_factory=list)
    appliedRulesSummary: List[str] = Field(default_factory=list)
    unifiedConstraints: Dict[str, Any] = Field(default_factory=dict)
    solverStatus: Optional[str] = "OPTIMAL"
    solverName: Optional[str] = "PuLP-CBC"
    optimizationTimeMs: Optional[float] = 0.0

class OptimizeDietResponse(BaseModel):
    success: bool
    weekRange: str
    mealCount: int
    targetCalories: int
    weeklyPlan: List[WeeklyDietDayResponse]
    meals: Dict[str, MealSlot]
    dailyNutrition: DailyNutritionSummary
    clinicalContext: ClinicalContextResponse
    safety: SafetyReport
    ruleVersion: str = "2.0.0-MILP-IFCT2017"
    message: Optional[str] = None
