/**
 * Multi-Disease Conflict Resolver
 *
 * Clinical Precedence Hierarchy:
 * 1. Renal / Kidney Safety (Strict caps on potassium, phosphorus, sodium, and controlled protein)
 * 2. Cardiovascular / Hypertension (Sodium restriction < 2000mg, Saturated Fat < 7%, Zero Trans Fat)
 * 3. Diabetes / Glycemic Control (No simple sugars, high soluble fiber, low GI complex carbs)
 * 4. Hepatic / Liver Support (Adequate plant/dairy protein, ascites-safe sodium, antioxidants)
 * 5. CBC / Anemia (Iron and Vitamin C boost)
 * 6. General Population Nutrition
 */

function resolveDiseaseConflicts(activeRules = [], patientProfile = {}, clinicalVitals = {}) {
  const unifiedConstraints = {
    // Macro bounds
    minDailyCalories: 1600,
    maxDailyCalories: 2200,
    minDailyProteinGrams: 45,
    maxDailyProteinGrams: 75,
    minDailyFiberGrams: 28,
    maxDailyFreeSugarsGrams: 20,
    maxSaturatedFatPercent: 8,

    // Micro bounds (mg / mcg)
    maxSodiumDailyMg: 2200,
    maxPotassiumDailyMg: 3500,
    maxPhosphorusDailyMg: 1200,
    minIronDailyMg: 15,
    minVitaminCDailyMg: 50,
    minFolateDailyMcg: 200,

    // Flags
    preferLowGI: false,
    preferUnsaturatedFats: false,
    preferPlantProteins: false,
    pairIronWithVitaminC: false,
    requireDietitianReview: false,
    safetyDisclaimers: []
  };

  // Extract individual evaluated rules
  const diabetesRule = activeRules.find(r => r.disease === 'Diabetes' && r.active);
  const heartRule = activeRules.find(r => r.disease === 'Heart Disease' && r.active);
  const kidneyRule = activeRules.find(r => r.disease === 'Kidney Disease' && r.active);
  const liverRule = activeRules.find(r => r.disease === 'Liver Disease' && r.active);
  const cbcRule = activeRules.find(r => r.disease === 'CBC Anemia' && r.active);

  const appliedRulesSummary = [];

  // 1. Diabetes Constraints
  if (diabetesRule) {
    appliedRulesSummary.push('DIABETES_GLYCEMIC_CONTROL');
    unifiedConstraints.preferLowGI = true;
    unifiedConstraints.minDailyFiberGrams = Math.max(unifiedConstraints.minDailyFiberGrams, diabetesRule.constraints.minFiberDailyGrams || 30);
    unifiedConstraints.maxDailyFreeSugarsGrams = 10; // strict cap on added sugars
    unifiedConstraints.maxSaturatedFatPercent = Math.min(unifiedConstraints.maxSaturatedFatPercent, 7);
  }

  // 2. Heart Disease / Hypertension Constraints
  if (heartRule) {
    appliedRulesSummary.push('CARDIOVASCULAR_LIPID_SODIUM_LIMIT');
    unifiedConstraints.maxSodiumDailyMg = Math.min(unifiedConstraints.maxSodiumDailyMg, heartRule.constraints.maxSodiumDailyMg || 2000);
    unifiedConstraints.maxSaturatedFatPercent = Math.min(unifiedConstraints.maxSaturatedFatPercent, heartRule.constraints.maxSaturatedFatPercent || 7);
    unifiedConstraints.preferUnsaturatedFats = true;
    unifiedConstraints.minDailyFiberGrams = Math.max(unifiedConstraints.minDailyFiberGrams, 30);
  }

  // 3. Liver Disease Constraints
  if (liverRule) {
    appliedRulesSummary.push('LIVER_HEPATIC_SUPPORT');
    unifiedConstraints.maxSodiumDailyMg = Math.min(unifiedConstraints.maxSodiumDailyMg, 1800);
    unifiedConstraints.preferPlantProteins = true;
    // Liver prefers adequate protein (1.0-1.2 g/kg), unless overridden by severe kidney restriction
    unifiedConstraints.minDailyProteinGrams = Math.max(unifiedConstraints.minDailyProteinGrams, 55);
  }

  // 4. CBC / Anemia Constraints
  if (cbcRule) {
    appliedRulesSummary.push('ANEMIA_IRON_FOLATE_ENHANCEMENT');
    unifiedConstraints.minIronDailyMg = Math.max(unifiedConstraints.minIronDailyMg, cbcRule.constraints.minIronDailyMg || 22);
    unifiedConstraints.minVitaminCDailyMg = Math.max(unifiedConstraints.minVitaminCDailyMg, 60);
    unifiedConstraints.minFolateDailyMcg = Math.max(unifiedConstraints.minFolateDailyMcg, 300);
    unifiedConstraints.pairIronWithVitaminC = true;
  }

  // 5. Kidney Disease Constraints (HIGHEST SAFETY PRECEDENCE)
  if (kidneyRule) {
    appliedRulesSummary.push('RENAL_SAFETY_RESTRICTIONS');
    unifiedConstraints.requireDietitianReview = true;
    unifiedConstraints.safetyDisclaimers.push(
      kidneyRule.disclaimerMessage || 'Detailed kidney-specific dietary guidance requires additional clinical staging and professional dietitian review.'
    );

    // Conflict Resolution: Kidney protein restriction OVERRIDES higher protein desires
    unifiedConstraints.maxDailyProteinGrams = kidneyRule.constraints.maxProteinDailyGrams || 50;
    unifiedConstraints.minDailyProteinGrams = Math.min(unifiedConstraints.minDailyProteinGrams, 40);

    // Conflict Resolution: Potassium ceiling OVERRIDES general high-potassium heart advice
    unifiedConstraints.maxPotassiumDailyMg = kidneyRule.constraints.maxPotassiumDailyMg || 2200;
    unifiedConstraints.maxPhosphorusDailyMg = kidneyRule.constraints.maxPhosphorusDailyMg || 900;
    unifiedConstraints.maxSodiumDailyMg = Math.min(unifiedConstraints.maxSodiumDailyMg, 1800);
  }

  // Aggregate restricted food codes & categories across all active rules
  const allRestrictedFoodCodes = new Set();
  const allRestrictedCategories = new Set();
  const allPreferredFoodCodes = new Set();
  const boostNutrients = new Set();
  const penalizeNutrients = new Set();
  const allReasonTags = new Set();

  for (const rule of activeRules) {
    if (!rule.active) continue;
    (rule.restrictedFoodCodes || []).forEach(c => allRestrictedFoodCodes.add(c));
    (rule.restrictedCategories || []).forEach(c => allRestrictedCategories.add(c));
    (rule.preferredFoodCodes || []).forEach(c => allPreferredFoodCodes.add(c));
    (rule.boostNutrients || []).forEach(n => boostNutrients.add(n));
    (rule.penalizeNutrients || []).forEach(n => penalizeNutrients.add(n));
    (rule.reasonTags || []).forEach(t => allReasonTags.add(t));
  }

  // Calorie targets adjusted for weight/height/activity if available
  const weightKg = parseFloat(patientProfile.weightKg || patientProfile.weight_kg) || 65;
  const heightCm = parseFloat(patientProfile.heightCm || patientProfile.height_cm) || 168;
  const age = parseFloat(patientProfile.age) || 45;
  const gender = (patientProfile.gender || 'Male').toLowerCase();
  const activity = (patientProfile.activity_level || 'Moderately Active').toLowerCase();

  // Mifflin-St Jeor Basal Metabolic Rate (BMR)
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + (gender.startsWith('f') ? -161 : 5);
  let activityMultiplier = 1.375;
  if (activity.includes('sedentary')) activityMultiplier = 1.2;
  else if (activity.includes('light')) activityMultiplier = 1.375;
  else if (activity.includes('moderately') || activity.includes('moderate')) activityMultiplier = 1.55;
  else if (activity.includes('very') || activity.includes('active')) activityMultiplier = 1.725;

  let targetCalories = Math.round(bmr * activityMultiplier);

  // Goal adjustments
  const healthGoal = (patientProfile.health_goal || '').toLowerCase();
  if (healthGoal.includes('loss') || healthGoal.includes('deficit')) {
    targetCalories = Math.max(1400, targetCalories - 400);
  } else if (healthGoal.includes('gain') || healthGoal.includes('muscle')) {
    targetCalories = Math.min(2600, targetCalories + 300);
  }

  if (patientProfile.calorie_target_override && patientProfile.calorie_target_override > 1000) {
    targetCalories = patientProfile.calorie_target_override;
  }

  unifiedConstraints.targetCalories = targetCalories;

  return {
    unifiedConstraints,
    appliedRulesSummary,
    restrictedFoodCodes: Array.from(allRestrictedFoodCodes),
    restrictedCategories: Array.from(allRestrictedCategories),
    preferredFoodCodes: Array.from(allPreferredFoodCodes),
    boostNutrients: Array.from(boostNutrients),
    penalizeNutrients: Array.from(penalizeNutrients),
    reasonTags: Array.from(allReasonTags)
  };
}

module.exports = { resolveDiseaseConflicts };
