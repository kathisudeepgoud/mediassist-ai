/**
 * Hepatic & Liver Disease Clinical Nutrition Rules
 * Sources: European Association for the Study of the Liver (EASL) Clinical Nutrition Guidelines.
 */

function evaluateLiverRules(riskLevel, riskPercentage, vitals = {}) {
  const isHigh = riskLevel === 'High' || riskLevel === 'HIGH' || riskPercentage >= 60;
  const isMod = riskLevel === 'Moderate' || riskLevel === 'MODERATE' || (riskPercentage >= 30 && riskPercentage < 60);

  if (!isHigh && !isMod) {
    return {
      active: false,
      disease: 'Liver Disease',
      riskLevel: 'Low',
      constraints: {},
      preferredCategories: [],
      restrictedCategories: [],
      restrictedFoodCodes: [],
      boostNutrients: [],
      reasonTags: []
    };
  }

  const bilirubin = vitals.totalBilirubin || vitals.Total_Bilirubin || 1.0;
  const alt = vitals.alt || vitals.Alamine_Aminotransferase || 30;
  const ast = vitals.ast || vitals.Aspartate_Aminotransferase || 32;

  return {
    active: true,
    disease: 'Liver Disease',
    riskLevel: isHigh ? 'High' : 'Moderate',
    riskPercentage,
    clinicalBasis: `Evaluated for ${isHigh ? 'High' : 'Moderate'} liver enzyme risk (Total Bilirubin: ${bilirubin} mg/dL, ALT: ${alt} U/L, AST: ${ast} U/L).`,
    guidelineSource: 'EASL Clinical Practice Guidelines on Nutrition in Chronic Liver Disease',
    constraints: {
      minProteinGramsPerKg: 1.0, // Adequate protein to prevent muscle wasting (1.0-1.2 g/kg)
      maxSodiumDailyMg: 1800, // < 1,800-2,000 mg/day for portal hypertension/ascites prevention
      maxSaturatedFatPercent: 7,
      preferAntioxidants: true,
      preferPlantAndDairyProteins: true // rich in BCAAs, lower ammoniagenic risk
    },
    // Restrict alcohol, ultra-processed fried foods, high saturated fat meats
    restrictedFoodCodes: [
      'T001', 'T002', 'T003', // Vanaspati & heavy fats
      'O001', 'O002'          // Red fatty meats
    ],
    restrictedCategories: [
      'Animal Meat', 'Sugars'
    ],
    // Prefer green leafy vegetables, cruciferous vegetables, whole grains, dairy/tofu, citrus
    preferredFoodGroups: ['A', 'B', 'C', 'D', 'E', 'L'],
    preferredFoodCodes: [
      'C001', 'C005', 'C010', // Green leafy vegetables (Spinach, Fenugreek leaves, Amaranth leaves)
      'D005', 'D006',         // Cruciferous veggies (Cauliflower, Cabbage, Broccoli)
      'E008', 'E009',         // Citrus fruits rich in antioxidants (Amla, Oranges, Lemons)
      'L001', 'L002'          // Low-fat milk & curd
    ],
    boostNutrients: ['vitc', 'vita', 'cartb', 'polyph', 'folsum'],
    penalizeNutrients: ['fasat', 'fatrn', 'na', 'fsugar'],
    reasonTags: ['ANTIOXIDANT_RICH', 'LIVER_PROTECTIVE', 'ADEQUATE_PLANT_PROTEIN', 'LOW_SODIUM']
  };
}

module.exports = { evaluateLiverRules };
