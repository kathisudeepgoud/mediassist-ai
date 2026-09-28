/**
 * Chronic Kidney Disease (CKD) & Renal Safety Clinical Nutrition Rules
 * Sources: KDIGO 2024 Clinical Practice Guideline for CKD, KDOQI Clinical Practice Guideline for Nutrition in CKD.
 */

function evaluateKidneyRules(riskLevel, riskPercentage, vitals = {}) {
  const isHigh = riskLevel === 'High' || riskLevel === 'HIGH' || riskPercentage >= 60;
  const isMod = riskLevel === 'Moderate' || riskLevel === 'MODERATE' || (riskPercentage >= 30 && riskPercentage < 60);

  if (!isHigh && !isMod) {
    return {
      active: false,
      disease: 'Kidney Disease',
      riskLevel: 'Low',
      constraints: {},
      preferredCategories: [],
      restrictedCategories: [],
      restrictedFoodCodes: [],
      boostNutrients: [],
      reasonTags: []
    };
  }

  const creatinine = vitals.sc || vitals.creatinine || 1.1;
  const potassium = vitals.pot || vitals.potassium || 4.4;
  const bloodUrea = vitals.bu || vitals.blood_urea || vitals.urea || 25;
  const sodium = vitals.sod || vitals.sodium || 138;

  // Hyperkalemia risk flag
  const hasHyperkalemiaRisk = potassium >= 5.0 || isHigh;

  return {
    active: true,
    disease: 'Kidney Disease',
    riskLevel: isHigh ? 'High' : 'Moderate',
    riskPercentage,
    clinicalBasis: `Evaluated for ${isHigh ? 'High' : 'Moderate'} renal risk (Serum Creatinine: ${creatinine} mg/dL, Potassium: ${potassium} mEq/L, Blood Urea: ${bloodUrea} mg/dL).`,
    guidelineSource: 'KDIGO 2024 & KDOQI Clinical Practice Guidelines for Nutrition in CKD',
    requiresDietitianDisclaimer: true,
    disclaimerMessage: 'Detailed kidney-specific dietary guidance requires additional clinical staging (eGFR/UACR) and individual nephrology/dietitian review.',
    constraints: {
      // Non-dialysis CKD: Moderate/controlled protein (0.6 - 0.8 g/kg body weight)
      maxProteinGramsPerKg: isHigh ? 0.6 : 0.8,
      maxProteinDailyGrams: isHigh ? 48 : 56, // For approx 60-70kg adult
      maxSodiumDailyMg: 1800, // < 1,800-2,000 mg/day
      maxPotassiumDailyMg: hasHyperkalemiaRisk ? 2000 : 2500, // strict potassium ceiling for renal safety
      maxPhosphorusDailyMg: isHigh ? 800 : 1000, // < 800-1,000 mg/day
      avoidHighProteinDiets: true,
      avoidExcessiveFluidRestrictionWithoutNephrologist: true
    },
    // Restrict high-potassium & high-phosphorus foods if high renal risk
    restrictedFoodCodes: hasHyperkalemiaRisk ? [
      'H005', 'H018', // High potassium/phosphorus nuts in high amounts
      'E001', 'E015', // High potassium fruits in excess (e.g. dried fruits, bananas, tender coconut water)
      'T009'          // High mineral additives
    ] : [],
    restrictedCategories: [
      'Animal Meat', 'Marine Shellfish'
    ],
    // Prefer easily metabolizable grains, low-potassium vegetables, controlled portion legumes
    preferredFoodGroups: ['A', 'D', 'E'],
    preferredFoodCodes: [
      'A015', // Rice, raw, milled (low potassium/phosphorus cereal base)
      'A014', // Rice, parboiled
      'D001', 'D002', 'D015', // Bottle gourd, ridge gourd, ash gourd, cucumber (low potassium vegetables)
      'E005', 'E006'  // Apples, pears, berries (low potassium fruits)
    ],
    boostNutrients: ['fibtg'],
    penalizeNutrients: hasHyperkalemiaRisk ? ['k', 'p', 'na', 'protcnt'] : ['na', 'p'],
    reasonTags: ['KIDNEY_SAFE_CONTROLLED_PROTEIN', 'LOW_SODIUM', 'CONTROLLED_POTASSIUM', 'CONTROLLED_PHOSPHORUS']
  };
}

module.exports = { evaluateKidneyRules };
