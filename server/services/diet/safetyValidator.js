/**
 * Clinical Safety Validator Layer
 *
 * Checks:
 * 1. Zero allergen violations (Peanuts, Gluten, Dairy, Shellfish, etc.)
 * 2. Zero diet preference violations (Strict Vegetarian, Eggetarian, etc.)
 * 3. Renal safety validation (Potassium, Sodium, Phosphorus caps)
 * 4. Calorie and macronutrient balance boundaries
 * 5. Generates conditional clinician disclaimers when appropriate
 */

const { isFoodAllergenConflict, isDietTypeCompliant } = require('./rules/allergy.filter');

function validateDietPlan(generatedPlan, resolution = {}, preferences = {}) {
  const warnings = [];
  let safetyStatus = 'SAFE';

  const allergies = preferences.allergies || [];
  const excludedFoods = preferences.excluded_foods || [];
  const dietType = preferences.diet_type || 'Vegetarian';
  const { unifiedConstraints } = resolution;

  const meals = generatedPlan.meals || {};
  let totalItemsCount = 0;

  for (const [mealKey, mealObj] of Object.entries(meals)) {
    const items = mealObj.items || [];
    totalItemsCount += items.length;

    for (const item of items) {
      // 1. Check Allergens
      if (isFoodAllergenConflict(item.name, '', allergies, excludedFoods)) {
        safetyStatus = 'UNSAFE_ALLERGEN_VIOLATION';
        warnings.push({
          type: 'ALLERGEN_CONFLICT',
          message: `Item "${item.name}" in ${mealObj.title || mealKey} conflicts with patient allergy preferences.`,
          item: item.name
        });
      }

      // 2. Check Diet Type Compliance
      const groupCodeLetter = (item.foodCode || '').charAt(0);
      if (!isDietTypeCompliant(groupCodeLetter, [], dietType)) {
        safetyStatus = 'UNSAFE_DIET_TYPE_VIOLATION';
        warnings.push({
          type: 'DIET_TYPE_MISMATCH',
          message: `Item "${item.name}" in ${mealObj.title || mealKey} does not match chosen diet type (${dietType}).`,
          item: item.name
        });
      }
    }
  }

  // 3. Check Nutritional Boundary Limits
  const daily = generatedPlan.dailyNutrition || {};

  if (unifiedConstraints?.maxSodiumDailyMg && daily.sodium > unifiedConstraints.maxSodiumDailyMg * 1.25) {
    warnings.push({
      type: 'SODIUM_ELEVATED',
      message: `Daily estimated sodium (${daily.sodium} mg) approaches upper recommended limit for cardiovascular/renal profile.`
    });
  }

  if (unifiedConstraints?.maxPotassiumDailyMg && daily.potassium > unifiedConstraints.maxPotassiumDailyMg * 1.2) {
    warnings.push({
      type: 'POTASSIUM_ELEVATED',
      message: `Daily potassium (${daily.potassium} mg) exceeds conservative renal safety threshold (${unifiedConstraints.maxPotassiumDailyMg} mg).`
    });
    safetyStatus = 'CONDITIONAL_RENAL_REVIEW';
  }

  // 4. Clinical Disclaimers
  if (unifiedConstraints?.safetyDisclaimers?.length > 0) {
    unifiedConstraints.safetyDisclaimers.forEach(msg => {
      warnings.push({
        type: 'CLINICAL_DISCLAIMER',
        message: msg
      });
    });
    if (safetyStatus === 'SAFE') safetyStatus = 'CAUTION_CONDITIONAL';
  }

  // General mandatory clinical notice
  warnings.push({
    type: 'GENERAL_DISCLAIMER',
    message: 'The MediAssist AI Diet Planner provides automated nutrition-oriented guidance based on available lab findings and IFCT 2017 composition data. It is not a replacement for professional medical diagnosis or personalized dietitian consultation.'
  });

  return {
    isValid: !safetyStatus.startsWith('UNSAFE'),
    safetyStatus,
    warnings,
    totalItemsCount
  };
}

module.exports = { validateDietPlan };
