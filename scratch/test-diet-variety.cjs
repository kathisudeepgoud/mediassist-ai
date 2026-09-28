const { query } = require('../server/config/db');
const { generatePersonalizedPlan } = require('../server/services/diet/dietEngine');

async function runTest() {
  console.log('=== TESTING PERSONALIZED DIET PLAN ENGINE ===\n');

  // Test User 1: Non-Vegetarian Patient
  const patient1 = {
    id: 'user-001',
    patientId: 'P000001',
    name: 'Rahul Sharma',
    age: 42,
    gender: 'Male',
    heightCm: 175,
    weightKg: 78,
    activity_level: 'Moderately Active',
    health_goal: 'Maintenance'
  };

  const pref1 = {
    diet_type: 'Non-Vegetarian',
    food_preference: 'North Indian',
    activity_level: 'Moderately Active',
    meal_count: 5,
    allergies: [],
    excluded_foods: [],
    health_goal: 'Maintenance'
  };

  const plan1 = await generatePersonalizedPlan({
    patientProfile: patient1,
    clinicalVitals: { fasting_sugar: 105, sysBP: 125, cholesterol: 210 },
    diseaseRisks: [{ name: 'Heart Disease', percentage: 35, status: 'Moderate' }],
    preferences: pref1
  });

  console.log(`[USER 1 - Non-Vegetarian] Plan Target Calories: ${plan1.targetCalories} kcal`);
  console.log(`Weekly Avg Daily Calories: ${plan1.dailyNutrition.calories} kcal, Protein: ${plan1.dailyNutrition.protein}g`);
  
  let nonVegCount = 0;
  console.log('\n--- 7-Day Meal Schedule for Rahul Sharma (Non-Vegetarian) ---');
  plan1.weeklyPlan.forEach(d => {
    console.log(`\n${d.day} (${d.date}):`);
    Object.entries(d.meals).forEach(([slot, meal]) => {
      const itemNames = (meal.items || []).map(i => {
        if (/chicken|egg|fish|meat|poultry|hen|duck|quial|mutton/i.test(i.name) || ['M', 'N', 'O', 'P', 'Q', 'R', 'S'].includes(i.foodCode?.charAt(0))) {
          nonVegCount++;
        }
        return `${i.name} [${i.portion}]`;
      });
      console.log(`  ${meal.title}: ${itemNames.join(' + ')}`);
    });
  });

  console.log(`\nTotal Non-Veg / Egg Servings across week: ${nonVegCount}`);

  // Test User 2: Vegetarian Patient with Different Vitals
  const patient2 = {
    id: 'user-002',
    patientId: 'P000002',
    name: 'Pooja Verma',
    age: 32,
    gender: 'Female',
    heightCm: 160,
    weightKg: 55,
    activity_level: 'Lightly Active',
    health_goal: 'Weight Loss'
  };

  const pref2 = {
    diet_type: 'Vegetarian',
    food_preference: 'South Indian',
    activity_level: 'Lightly Active',
    meal_count: 5,
    allergies: [],
    excluded_foods: [],
    health_goal: 'Weight Loss'
  };

  const plan2 = await generatePersonalizedPlan({
    patientProfile: patient2,
    clinicalVitals: { fasting_sugar: 88, sysBP: 110, hemoglobin: 11.0 },
    diseaseRisks: [{ name: 'CBC Anemia', percentage: 40, status: 'Moderate' }],
    preferences: pref2
  });

  console.log(`\n\n[USER 2 - Vegetarian] Plan Target Calories: ${plan2.targetCalories} kcal`);
  console.log(`Weekly Avg Daily Calories: ${plan2.dailyNutrition.calories} kcal, Protein: ${plan2.dailyNutrition.protein}g`);
  
  console.log('\n--- 7-Day Meal Schedule for Pooja Verma (Vegetarian) ---');
  plan2.weeklyPlan.forEach(d => {
    console.log(`\n${d.day} (${d.date}):`);
    Object.entries(d.meals).forEach(([slot, meal]) => {
      const itemNames = (meal.items || []).map(i => `${i.name} [${i.portion}]`);
      console.log(`  ${meal.title}: ${itemNames.join(' + ')}`);
    });
  });

  // Verify Plans are not identical
  const mondayMeal1 = JSON.stringify(plan1.weeklyPlan[0].meals.lunch);
  const mondayMeal2 = JSON.stringify(plan2.weeklyPlan[0].meals.lunch);
  const areDifferent = mondayMeal1 !== mondayMeal2;

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`1. Non-veg items present in Non-Vegetarian plan: ${nonVegCount > 0 ? 'PASS (' + nonVegCount + ' items)' : 'FAIL'}`);
  console.log(`2. User 1 and User 2 have distinct personalized plans: ${areDifferent ? 'PASS' : 'FAIL'}`);
  console.log(`3. Target Calories user-specific (User 1: ${plan1.targetCalories} vs User 2: ${plan2.targetCalories}): ${plan1.targetCalories !== plan2.targetCalories ? 'PASS' : 'FAIL'}`);

  process.exit(0);
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
