import type { FoodItem, MealPlanDay } from '@/types'

export const recommendedFoods: FoodItem[] = [
  { id: 'f1', name: 'Steel-Cut Oats', benefits: 'Slow-releasing carbs that steady blood sugar', calories: 150, protein: '5g', category: 'Grains' },
  { id: 'f2', name: 'Grilled Salmon', benefits: 'Rich in omega-3s that support heart health', calories: 210, protein: '23g', category: 'Protein' },
  { id: 'f3', name: 'Spinach & Kale Mix', benefits: 'High in iron and supports hemoglobin levels', calories: 40, protein: '3g', category: 'Vegetables' },
  { id: 'f4', name: 'Greek Yogurt', benefits: 'Probiotics and protein for steady energy', calories: 120, protein: '15g', category: 'Dairy' },
  { id: 'f5', name: 'Walnuts', benefits: 'Omega-3 fats that help manage LDL cholesterol', calories: 185, protein: '4g', category: 'Nuts' },
  { id: 'f6', name: 'Mushrooms (sun-exposed)', benefits: 'Natural source of Vitamin D', calories: 22, protein: '3g', category: 'Vegetables' },
]

export const foodsToAvoid: FoodItem[] = [
  { id: 'a1', name: 'Refined White Bread', benefits: 'Spikes blood sugar quickly — best limited', calories: 265, protein: '9g', category: 'Grains' },
  { id: 'a2', name: 'Sugary Sodas', benefits: 'High in added sugar, no nutritional value', calories: 150, protein: '0g', category: 'Beverages' },
  { id: 'a3', name: 'Deep-Fried Snacks', benefits: 'High saturated fat raises LDL cholesterol', calories: 320, protein: '4g', category: 'Fried' },
  { id: 'a4', name: 'Processed Deli Meats', benefits: 'High sodium content raises blood pressure', calories: 180, protein: '12g', category: 'Protein' },
]

export const weeklyMealPlan: MealPlanDay[] = [
  { day: 'Monday', breakfast: 'Oats with berries & walnuts', lunch: 'Grilled salmon, quinoa, sautéed spinach', dinner: 'Lentil soup with whole-grain bread', snacks: 'Greek yogurt with almonds' },
  { day: 'Tuesday', breakfast: 'Vegetable poha with peanuts', lunch: 'Grilled chicken salad with olive oil dressing', dinner: 'Stir-fried tofu and vegetables', snacks: 'Orange & handful of walnuts' },
  { day: 'Wednesday', breakfast: 'Moong dal chilla with mint chutney', lunch: 'Brown rice, rajma, cucumber salad', dinner: 'Baked fish with roasted vegetables', snacks: 'Sprouts chaat' },
  { day: 'Thursday', breakfast: 'Greek yogurt parfait with granola', lunch: 'Quinoa bowl with chickpeas & greens', dinner: 'Vegetable khichdi with curd', snacks: 'Apple slices with peanut butter' },
  { day: 'Friday', breakfast: 'Multigrain toast with avocado', lunch: 'Grilled paneer, brown rice, salad', dinner: 'Clear vegetable soup with grilled tofu', snacks: 'Roasted makhana' },
  { day: 'Saturday', breakfast: 'Idli with sambar', lunch: 'Whole wheat wrap with hummus & veggies', dinner: 'Baked salmon with steamed broccoli', snacks: 'Mixed nuts' },
  { day: 'Sunday', breakfast: 'Vegetable upma', lunch: 'Dal, brown rice, mixed vegetable curry', dinner: 'Light khichdi with buttermilk', snacks: 'Fresh fruit bowl' },
]

export const dietTargets = {
  dailyCalories: 1850,
  proteinIntake: '75g / day',
  vitaminRecommendations: ['Vitamin D — 2000 IU daily', 'Vitamin B12 — 500 mcg weekly', 'Vitamin C — 65 mg daily'],
  mineralRecommendations: ['Iron — 18 mg daily', 'Calcium — 1000 mg daily', 'Magnesium — 320 mg daily'],
  waterIntake: '2.5 liters / day',
}
