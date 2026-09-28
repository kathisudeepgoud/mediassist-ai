/**
 * Deterministic Food Scoring & Ranking Layer
 *
 * Scoring Formula:
 * food_score = base_nutrition_suitability
 *            + clinical_rule_match_bonus (+10 to +30)
 *            + patient_preference_bonus (+15)
 *            + regional_staple_bonus (+10)
 *            - disease_restriction_penalty (-50)
 *            - excess_nutrient_penalty (-10 to -30)
 */

const { isFoodAllergenConflict, isDietTypeCompliant } = require('./rules/allergy.filter');

function rankFoods(foods = [], resolution = {}, preferences = {}) {
  const {
    unifiedConstraints,
    restrictedFoodCodes = [],
    restrictedCategories = [],
    preferredFoodCodes = [],
    boostNutrients = [],
    penalizeNutrients = []
  } = resolution;

  const dietType = preferences.diet_type || 'Vegetarian';
  const allergies = preferences.allergies || [];
  const excludedFoods = preferences.excluded_foods || [];
  const regionalPref = (preferences.food_preference || 'All').toLowerCase();

  const rankedFoods = [];

  for (const food of foods) {
    // 1. Strict Filter: Allergens and Custom Dislikes
    if (isFoodAllergenConflict(food.food_name, food.local_names_raw, allergies, excludedFoods, food.group_code)) {
      continue; // Filtered out
    }

    // 2. Strict Filter: Diet Type (Vegetarian, Eggetarian, etc.)
    if (!isDietTypeCompliant(food.group_code, food.dietary_tags, dietType)) {
      continue; // Filtered out
    }

    let score = 50.0; // Base score
    const matchedReasons = [];

    const foodCode = food.food_code || '';
    const groupName = food.group_name || '';
    const nutrients = food.nutrients || {}; // nutrient_code -> amount_per_100g

    // Check direct clinical restriction
    if (restrictedFoodCodes.includes(foodCode) || restrictedCategories.includes(groupName)) {
      score -= 50;
    }

    // Check direct clinical preference
    if (preferredFoodCodes.includes(foodCode)) {
      score += 25;
      matchedReasons.push('CLINICALLY_RECOMMENDED_STAPLE');
    }

    // Fiber evaluation
    const fiber = nutrients.fibtg || 0;
    if (fiber >= 8.0) {
      score += 20;
      matchedReasons.push('HIGH_DIETARY_FIBER');
    } else if (fiber >= 4.0) {
      score += 10;
      matchedReasons.push('GOOD_FIBER_SOURCE');
    }

    // Protein & Non-Veg suitability evaluation
    const protein = nutrients.protcnt || 0;
    const isNonVegPref = ['non-vegetarian', 'non-veg', 'fishetarian', 'pescatarian', 'eggetarian'].includes(dietType.toLowerCase());

    if (isNonVegPref) {
      if (['M'].includes(food.group_code)) {
        score += 20;
        matchedReasons.push('HIGH_BIOLOGICAL_VALUE_EGG_PROTEIN');
      } else if (['N'].includes(food.group_code)) {
        score += 22;
        matchedReasons.push('LEAN_POULTRY_PROTEIN');
      } else if (['P', 'Q', 'R', 'S'].includes(food.group_code)) {
        score += 25;
        matchedReasons.push('RICH_IN_OMEGA3_AND_LEAN_PROTEIN');
      } else if (['O'].includes(food.group_code) && !restrictedCategories.includes('Animal Meat')) {
        score += 15;
        matchedReasons.push('NON_VEG_PROTEIN_SOURCE');
      }
    }

    if (unifiedConstraints.preferPlantProteins && ['B', 'L', 'J'].includes(food.group_code)) {
      score += 15;
      matchedReasons.push('HIGH_QUALITY_PLANT_PROTEIN');
    } else if (protein >= 15.0) {
      score += 12;
      matchedReasons.push('RICH_IN_PROTEIN');
    }

    // Sodium evaluation
    const sodium = nutrients.na || 0;
    if (sodium <= 50.0) {
      score += 10;
      matchedReasons.push('LOW_SODIUM_HEART_SAFE');
    } else if (sodium > 500.0) {
      score -= 20;
    }

    // Potassium evaluation (for Renal safety)
    const potassium = nutrients.k || 0;
    if (unifiedConstraints.maxPotassiumDailyMg <= 2200) {
      if (potassium > 600.0) {
        score -= 25; // Renal penalty for very high potassium foods
      } else if (potassium <= 200.0) {
        score += 10;
        matchedReasons.push('KIDNEY_SAFE_LOW_POTASSIUM');
      }
    }

    // Iron evaluation (for CBC/Anemia)
    const iron = nutrients.fe || 0;
    if (iron >= 5.0) {
      score += 20;
      matchedReasons.push('RICH_IN_DIETARY_IRON');
    } else if (iron >= 2.5) {
      score += 10;
      matchedReasons.push('SOURCE_OF_IRON');
    }

    // Vitamin C evaluation
    const vitC = nutrients.vitc || 0;
    if (vitC >= 25.0) {
      score += 15;
      matchedReasons.push('RICH_IN_VITAMIN_C');
    }

    // Unsaturated vs Saturated fats
    const satFat = nutrients.fasat || 0;
    const pufa = nutrients.fapu || 0;
    const mufa = nutrients.fams || 0;
    if (pufa + mufa > 2.0 && satFat < 1.0) {
      score += 15;
      matchedReasons.push('HEART_HEALTHY_UNSATURATED_FATS');
    } else if (satFat > 5.0) {
      score -= 15;
    }

    // Free sugars penalty
    const freeSugars = nutrients.fsugar || nutrients.sucs || 0;
    if (freeSugars > 10.0) {
      score -= 20;
    }

    // Regional Preference Match
    if (regionalPref !== 'all' && regionalPref !== '') {
      const localNamesStr = (food.local_names_raw || '').toLowerCase();
      if (regionalPref.includes('north') && /h\.|p\.|kash\.|g\./.test(localNamesStr)) {
        score += 10;
        matchedReasons.push('REGIONAL_PREFERENCE_MATCH');
      } else if (regionalPref.includes('south') && /tam\.|tel\.|kan\.|mal\./.test(localNamesStr)) {
        score += 10;
        matchedReasons.push('REGIONAL_PREFERENCE_MATCH');
      } else if (regionalPref.includes('east') && /b\.|a\.|o\.|m\./.test(localNamesStr)) {
        score += 10;
        matchedReasons.push('REGIONAL_PREFERENCE_MATCH');
      } else if (regionalPref.includes('west') && /mar\.|g\.|kon\./.test(localNamesStr)) {
        score += 10;
        matchedReasons.push('REGIONAL_PREFERENCE_MATCH');
      }
    }

    rankedFoods.push({
      ...food,
      score: Math.max(0, Math.round(score)),
      reasons: Array.from(new Set(matchedReasons))
    });
  }

  // Sort descending by score
  rankedFoods.sort((a, b) => b.score - a.score);
  return rankedFoods;
}

module.exports = { rankFoods };
