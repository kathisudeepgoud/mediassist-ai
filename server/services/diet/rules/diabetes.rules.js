/**
 * Diabetes Clinical Nutrition Rules
 * Sources: ICMR-NIN Dietary Guidelines for Indians, American Diabetes Association (ADA) Standards of Care.
 */

function evaluateDiabetesRules(riskLevel, riskPercentage, vitals = {}) {
  const isHigh = riskLevel === 'High' || riskLevel === 'HIGH' || riskPercentage >= 60;
  const isMod = riskLevel === 'Moderate' || riskLevel === 'MODERATE' || (riskPercentage >= 30 && riskPercentage < 60);

  if (!isHigh && !isMod) {
    return {
      active: false,
      disease: 'Diabetes',
      riskLevel: 'Low',
      constraints: {},
      preferredCategories: [],
      restrictedCategories: [],
      restrictedFoodCodes: [],
      boostNutrients: ['fibtg'],
      reasonTags: []
    };
  }

  const glucose = vitals.glucose || vitals.blood_glucose_level || vitals.fasting_sugar || 100;
  const hba1c = vitals.hba1c || vitals.HbA1c_level || 5.5;

  return {
    active: true,
    disease: 'Diabetes',
    riskLevel: isHigh ? 'High' : 'Moderate',
    riskPercentage,
    clinicalBasis: `Evaluated for ${isHigh ? 'High' : 'Moderate'} glycemic risk (HbA1c: ${hba1c}%, Fasting Glucose: ${glucose} mg/dL).`,
    guidelineSource: 'ICMR-NIN & ADA Clinical Guidelines for Glycemic Management',
    constraints: {
      maxFreeSugarsPercent: isHigh ? 3 : 5, // <5% total energy from free sugars
      minFiberDailyGrams: isHigh ? 35 : 30, // >= 30-35g dietary fiber daily
      maxCarbEnergyPercent: isHigh ? 50 : 55, // 45-55% energy from complex carbs
      maxSaturatedFatPercent: 7,
      preferLowGlycemicIndex: true
    },
    // Restrict refined flours, added sugars, confectioneries, sweet syrups
    restrictedFoodCodes: [
      'A018', // Wheat flour, refined (Maida)
      'I001', 'I002', // Refined sugars, sugar cane products
      'K001', 'K002'  // Confectioneries & sweet syrups
    ],
    restrictedCategories: [
      'Sugars', 'Sweets and Confectioneries'
    ],
    // Strongly prefer millets, whole legumes, green leafy vegetables, non-starchy vegetables
    preferredFoodGroups: ['A', 'B', 'C', 'D'],
    preferredFoodCodes: [
      'A003', // Bajra (Pearl millet)
      'A005', // Jowar (Sorghum)
      'A010', // Ragi (Finger millet)
      'A004', // Barley
      'A009', // Quinoa
      'A013', // Rice, raw, brown
      'B001', 'B002', 'B003', 'B005', 'B007', // Whole pulses (Bengal gram, Green gram, Lentils)
      'G011'  // Fenugreek seeds (Methi)
    ],
    boostNutrients: ['fibtg', 'fibsol', 'protcnt', 'mg'],
    penalizeNutrients: ['fsugar', 'sucs', 'glus', 'frus'],
    reasonTags: ['LOW_GLYCEMIC_INDEX', 'HIGH_SOLUBLE_FIBER', 'NO_ADDED_SUGAR', 'COMPLEX_CARBOHYDRATES']
  };
}

module.exports = { evaluateDiabetesRules };
