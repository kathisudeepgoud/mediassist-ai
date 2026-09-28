"""
MILP Diet Optimization Package
"""

from .schemas import (
    OptimizeDietRequest,
    OptimizeDietResponse,
    WeeklyDietDayResponse,
    DailyNutritionSummary,
    MealSlot,
    MealFoodItem,
    SafetyReport
)
from .services.diet_service import DietService
from .optimizer.model import MILPDietEngine
from .nutrition import sum_daily_nutrients, calculate_calories_per_100g

__all__ = [
    "OptimizeDietRequest",
    "OptimizeDietResponse",
    "WeeklyDietDayResponse",
    "DailyNutritionSummary",
    "MealSlot",
    "MealFoodItem",
    "SafetyReport",
    "DietService",
    "MILPDietEngine",
    "sum_daily_nutrients",
    "calculate_calories_per_100g"
]
