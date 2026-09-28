/**
 * Cardiovascular & Heart Disease Clinical Nutrition Rules
 * Sources: American Heart Association (AHA), European Society of Cardiology (ESC), ICMR Dyslipidemia Guidelines.
 */

function evaluateHeartRules(riskLevel, riskPercentage, vitals = {}) {
  const isHigh = riskLevel === 'High' || riskLevel === 'HIGH' || riskPercentage >= 60;
  const isMod = riskLevel === 'Moderate' || riskLevel === 'MODERATE' || (riskPercentage >= 30 && riskPercentage < 60);

  if (!isHigh && !isMod) {
    return {
      active: false,
      disease: 'Heart Disease',
      riskLevel: 'Low',
      constraints: {},
      preferredCategories: [],
      restrictedCategories: [],
      restrictedFoodCodes: [],
      boostNutrients: ['fibtg', 'fapu', 'fams'],
      reasonTags: []
    };
  }

  const cholesterol = vitals.totChol || vitals.cholesterol || 190;
  const sysBP = vitals.sysBP || vitals.bp_systolic || 120;

  return {
    active: true,
    disease: 'Heart Disease',
    riskLevel: isHigh ? 'High' : 'Moderate',
    riskPercentage,
    clinicalBasis: `Evaluated for ${isHigh ? 'High' : 'Moderate'} 10-year CVD risk (Total Cholesterol: ${cholesterol} mg/dL, Systolic BP: ${sysBP} mmHg).`,
    guidelineSource: 'AHA & ESC Cardiovascular Disease Prevention & Nutrition Guidelines',
    constraints: {
      maxSodiumDailyMg: isHigh ? 1800 : 2000, // < 2,000 mg sodium daily (< 5g salt)
      maxSaturatedFatPercent: isHigh ? 5 : 7, // < 7% energy from saturated fat
      maxDietaryCholesterolMg: 200, // < 200 mg dietary cholesterol daily
      minFiberDailyGrams: 30, // soluble fiber for LDL reduction
      maxTransFatPercent: 0,
      preferUnsaturatedFats: true
    },
    // Restrict high saturated fat, high trans fat, high cholesterol foods
    restrictedFoodCodes: [
      'T001', 'T002', // Vanaspati / hydrogenated fats
      'T003', // Palm oil / high saturated fats
      'M001', 'M002', // Whole egg yolks (limit)
      'O001', 'O002', 'O003' // Fatty red meat / organ meats
    ],
    restrictedCategories: [
      'Animal Meat', 'Marine Mollusks'
    ],
    // Strongly prefer oats, barley, nuts (almonds, walnuts), flaxseeds, oily fish (salmon/mackerel), green leafy vegetables
    preferredFoodGroups: ['A', 'B', 'C', 'D', 'E', 'H', 'P'],
    preferredFoodCodes: [
      'A004', // Barley
      'A001', 'A002', // Amaranth seed
      'H001', // Almond
      'H018', // Walnut
      'H005', // Flax seeds (Alsi)
      'H003', // Chia / Sesame seeds
      'P001', 'P005', 'P010' // Marine fish rich in omega-3 (if non-veg)
    ],
    boostNutrients: ['fibsol', 'fibtg', 'fapu', 'fams', 'facn3', 'k', 'mg', 'polyph'],
    penalizeNutrients: ['fasat', 'fatrn', 'cholc', 'na'],
    reasonTags: ['LOW_SODIUM', 'HEART_HEALTHY_MUFA_PUFA', 'RICH_IN_OMEGA3', 'LOW_SATURATED_FAT', 'CHOLESTEROL_LOWERING']
  };
}

module.exports = { evaluateHeartRules };
