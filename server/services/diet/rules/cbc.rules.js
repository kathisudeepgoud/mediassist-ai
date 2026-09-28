/**
 * Complete Blood Count (CBC) & Anemia Clinical Nutrition Rules
 * Sources: WHO Guidelines on Nutritional Anemia, ICMR-NIN Recommended Dietary Allowances.
 */

function evaluateCbcRules(riskLevel, riskPercentage, vitals = {}) {
  const isHigh = riskLevel === 'High' || riskLevel === 'HIGH' || riskPercentage >= 60;
  const isMod = riskLevel === 'Moderate' || riskLevel === 'MODERATE' || (riskPercentage >= 30 && riskPercentage < 60);

  if (!isHigh && !isMod) {
    return {
      active: false,
      disease: 'CBC Anemia',
      riskLevel: 'Low',
      constraints: {},
      preferredCategories: [],
      restrictedCategories: [],
      restrictedFoodCodes: [],
      boostNutrients: ['fe', 'vitc', 'folsum'],
      reasonTags: []
    };
  }

  const hgb = vitals.hgb || vitals.HGB || vitals.hemoglobin || 12.0;
  const rbc = vitals.rbc || vitals.RBC || 4.2;

  return {
    active: true,
    disease: 'CBC Anemia',
    riskLevel: isHigh ? 'High' : 'Moderate',
    riskPercentage,
    clinicalBasis: `Evaluated for ${isHigh ? 'High' : 'Moderate'} anemia risk (Hemoglobin: ${hgb} g/dL, RBC: ${rbc} mil/uL).`,
    guidelineSource: 'WHO & ICMR-NIN Anemia Guidelines for Dietary Iron & Folate Optimization',
    constraints: {
      minIronDailyMg: isHigh ? 25 : 20, // Iron target 20-25 mg/day
      minVitaminCDailyMg: 60, // Vitamin C to enhance non-heme iron absorption
      minFolateDailyMcg: 300, // Folate target >= 300 mcg/day
      pairIronWithVitaminC: true,
      separateTeaCoffeeWithMeals: true
    },
    // Prefer iron-rich green leafy vegetables, legumes, amaranth, dates, figs, jaggery in moderation
    preferredFoodGroups: ['A', 'B', 'C', 'E', 'M', 'N', 'P'],
    preferredFoodCodes: [
      'A001', 'A002', // Amaranth seed (exceptionally rich in iron)
      'A003',         // Bajra (Pearl millet - rich in iron)
      'C001', 'C005', 'C015', // Spinach, Drumstick leaves, Fenugreek leaves
      'B001', 'B005', // Bengal gram, Lentils
      'E021',         // Amla (Indian gooseberry - extremely high Vitamin C)
      'E008', 'E009'  // Citrus / Guava / Lemon
    ],
    boostNutrients: ['fe', 'vitc', 'folsum', 'cu', 'protcnt'],
    penalizeNutrients: [],
    reasonTags: ['RICH_IN_IRON', 'VITAMIN_C_ENHANCED_ABSORPTION', 'FOLATE_RICH', 'BLOOD_BUILDING']
  };
}

module.exports = { evaluateCbcRules };
