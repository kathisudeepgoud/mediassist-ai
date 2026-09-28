/**
 * MedAssist AI — Diet Planner Comprehensive Test Suite
 * Validates IFCT database integrity, MILP clinical optimizer, multi-disease resolution,
 * allergy filtering, meal generation, safety validation, and API persistence.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('assert');
const { pool, query } = require('../config/db');
const { evaluateDiabetesRules } = require('../services/diet/rules/diabetes.rules');
const { evaluateHeartRules } = require('../services/diet/rules/heart.rules');
const { evaluateKidneyRules } = require('../services/diet/rules/kidney.rules');
const { evaluateLiverRules } = require('../services/diet/rules/liver.rules');
const { evaluateCbcRules } = require('../services/diet/rules/cbc.rules');
const { isFoodAllergenConflict, isDietTypeCompliant } = require('../services/diet/rules/allergy.filter');
const { resolveDiseaseConflicts } = require('../services/diet/conflictResolver');
const { validateDietPlan } = require('../services/diet/safetyValidator');
const { generatePersonalizedPlan, loadAllIFCTFoods } = require('../services/diet/dietEngine');

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('       MEDASSIST AI — MILP DIET PLANNER TEST SUITE              ');
  console.log('================================================================\n');

  // TEST SUITE 1: DATABASE INTEGRITY
  console.log('--- Suite 1: IFCT 2017 Database Integrity & Schema ---');
  await itAsync('Should have imported >= 500 foods from IFCT 2017', async () => {
    const res = await query('SELECT count(*) FROM foods');
    const count = parseInt(res.rows[0].count, 10);
    assert(count >= 500, `Expected >= 500 foods, found ${count}`);
  });

  await itAsync('Should have 20 Indian Food Groups (A to T)', async () => {
    const res = await query('SELECT count(*) FROM food_groups');
    const count = parseInt(res.rows[0].count, 10);
    assert.strictEqual(count, 20, `Expected 20 groups, found ${count}`);
  });

  await itAsync('Should have >= 200 defined nutrients', async () => {
    const res = await query('SELECT count(*) FROM nutrients');
    const count = parseInt(res.rows[0].count, 10);
    assert(count >= 200, `Expected >= 200 nutrients, found ${count}`);
  });

  await itAsync('Should have >= 100,000 food-nutrient records', async () => {
    const res = await query('SELECT count(*) FROM food_nutrients');
    const count = parseInt(res.rows[0].count, 10);
    assert(count >= 100000, `Expected >= 100k records, found ${count}`);
  });

  await itAsync('Should have indexed multilingual names for foods', async () => {
    const res = await query("SELECT count(*) FROM food_names WHERE language = 'Hindi'");
    const count = parseInt(res.rows[0].count, 10);
    assert(count > 100, `Expected > 100 Hindi food names, found ${count}`);
  });

  // TEST SUITE 2: CLINICAL RULES EVALUATION
  console.log('\n--- Suite 2: Clinical Nutrition Rules & Bounds ---');
  it('Diabetes rules should activate for High Diabetes risk and restrict refined sugars/flour', () => {
    const rule = evaluateDiabetesRules('High', 75, { glucose: 160, hba1c: 8.2 });
    assert.strictEqual(rule.active, true);
    assert.strictEqual(rule.riskLevel, 'High');
    assert(rule.restrictedFoodCodes.includes('A018'), 'Should restrict Maida (A018)');
    assert(rule.constraints.maxFreeSugarsPercent <= 5);
  });

  it('Heart rules should restrict sodium and saturated fat for High CVD risk', () => {
    const rule = evaluateHeartRules('High', 68, { cholesterol: 260, sysBP: 145 });
    assert.strictEqual(rule.active, true);
    assert(rule.constraints.maxSodiumDailyMg <= 2000, 'Should restrict sodium < 2000mg');
    assert(rule.constraints.maxSaturatedFatPercent <= 7);
  });

  it('Kidney rules should cap protein, potassium, and phosphorus for High CKD risk', () => {
    const rule = evaluateKidneyRules('High', 70, { sc: 2.1, pot: 5.2 });
    assert.strictEqual(rule.active, true);
    assert(rule.constraints.maxProteinGramsPerKg <= 0.8, 'Should restrict protein <= 0.8 g/kg');
    assert(rule.constraints.maxPotassiumDailyMg <= 2200, 'Should cap potassium <= 2200 mg');
    assert.strictEqual(rule.requiresDietitianDisclaimer, true);
  });

  it('Liver rules should ensure adequate plant protein and ascites-safe sodium', () => {
    const rule = evaluateLiverRules('High', 65, { totalBilirubin: 2.8, alt: 75 });
    assert.strictEqual(rule.active, true);
    assert(rule.constraints.minProteinGramsPerKg >= 1.0);
    assert(rule.constraints.maxSodiumDailyMg <= 1800);
  });

  it('CBC rules should boost iron, vitamin C, and folate for High Anemia risk', () => {
    const rule = evaluateCbcRules('High', 72, { hgb: 9.2, rbc: 3.4 });
    assert.strictEqual(rule.active, true);
    assert(rule.constraints.minIronDailyMg >= 20);
  });

  // TEST SUITE 3: ALLERGY & DIET TYPE FILTERING
  console.log('\n--- Suite 3: Allergy & Diet Type Filtering ---');
  it('Should correctly identify and filter peanut allergen', () => {
    const isConflict = isFoodAllergenConflict('Roasted Peanut snack', 'Mungphali', ['peanut'], []);
    assert.strictEqual(isConflict, true, 'Peanut conflict should be flagged');
  });

  it('Should allow non-allergic foods', () => {
    const isConflict = isFoodAllergenConflict('Steamed Rice', 'Chawal', ['peanut'], []);
    assert.strictEqual(isConflict, false, 'Rice should not conflict with peanut allergy');
  });

  it('Should strictly filter non-veg food groups for Vegetarian diet', () => {
    assert.strictEqual(isDietTypeCompliant('A', [], 'Vegetarian'), true, 'Cereals (A) allowed for Veg');
    assert.strictEqual(isDietTypeCompliant('B', [], 'Vegetarian'), true, 'Pulses (B) allowed for Veg');
    assert.strictEqual(isDietTypeCompliant('M', [], 'Vegetarian'), false, 'Eggs (M) disallowed for Veg');
    assert.strictEqual(isDietTypeCompliant('N', [], 'Vegetarian'), false, 'Poultry (N) disallowed for Veg');
    assert.strictEqual(isDietTypeCompliant('P', [], 'Vegetarian'), false, 'Fish (P) disallowed for Veg');
  });

  it('Should allow eggs for Eggetarian and all non-veg for Non-Vegetarian', () => {
    assert.strictEqual(isDietTypeCompliant('M', [], 'Eggetarian'), true, 'Eggs allowed for Eggetarian');
    assert.strictEqual(isDietTypeCompliant('N', [], 'Eggetarian'), false, 'Chicken disallowed for Eggetarian');
    assert.strictEqual(isDietTypeCompliant('P', [], 'Non-Vegetarian'), true, 'Fish allowed for Non-Vegetarian');
    assert.strictEqual(isDietTypeCompliant('N', [], 'Non-Vegetarian'), true, 'Poultry allowed for Non-Vegetarian');
  });

  // TEST SUITE 4: MULTI-DISEASE CONFLICT RESOLUTION
  console.log('\n--- Suite 4: Multi-Disease Conflict Resolution ---');
  it('Should resolve conflict when Diabetes, Heart, and Kidney risks co-occur', () => {
    const diabetes = evaluateDiabetesRules('High', 75, { glucose: 170, hba1c: 8.5 });
    const heart = evaluateHeartRules('Moderate', 45, { cholesterol: 210, sysBP: 135 });
    const kidney = evaluateKidneyRules('High', 70, { sc: 2.0, pot: 5.1 });

    const resolution = resolveDiseaseConflicts([diabetes, heart, kidney], { weightKg: 65, age: 50 }, {});
    const c = resolution.unifiedConstraints;

    // Kidney precedence: protein capped at <= 50g, potassium capped <= 2200mg, sodium <= 1800mg
    assert(c.maxDailyProteinGrams <= 50, `Expected protein <= 50g, got ${c.maxDailyProteinGrams}`);
    assert(c.maxPotassiumDailyMg <= 2200, `Expected potassium <= 2200mg, got ${c.maxPotassiumDailyMg}`);
    assert(c.maxSodiumDailyMg <= 1800, `Expected sodium <= 1800mg, got ${c.maxSodiumDailyMg}`);
    assert.strictEqual(c.preferLowGI, true);
    assert.strictEqual(c.requireDietitianReview, true);
  });

  // TEST SUITE 5: MILP MEAL GENERATION & NUTRIENT SUMMATION
  console.log('\n--- Suite 5: MILP Multi-Day Optimization & Nutrition Summation ---');
  await itAsync('Should generate personalized weekly plan via MILP optimizer', async () => {
    const plan = await generatePersonalizedPlan({
      patientProfile: { age: 48, gender: 'Male', weightKg: 70, heightCm: 172 },
      clinicalVitals: { glucose: 135, hba1c: 6.8, cholesterol: 215, sysBP: 132 },
      diseaseRisks: [
        { id: 'diabetes', name: 'Diabetes Risk', percentage: 65, status: 'High' },
        { id: 'heart', name: 'Heart Disease Risk', percentage: 38, status: 'Moderate' },
        { id: 'kidney', name: 'Kidney Disease Risk', percentage: 15, status: 'Low' }
      ],
      preferences: {
        diet_type: 'Vegetarian',
        food_preference: 'North Indian',
        meal_count: 5,
        allergies: ['peanut'],
        excluded_foods: []
      },
      days: 3
    });

    assert.strictEqual(plan.mealCount, 5);
    assert(plan.weeklyPlan.length === 3, 'Should optimize 3 days');
    assert(plan.meals.breakfast.items.length > 0, 'Breakfast should contain items');
    assert(plan.meals.lunch.items.length > 0, 'Lunch should contain items');
    assert(plan.meals.dinner.items.length > 0, 'Dinner should contain items');

    const daily = plan.dailyNutrition;
    assert(daily.calories > 1200 && daily.calories < 2600, `Calories within bounds: ${daily.calories}`);
    assert(daily.protein > 20, `Protein calculated: ${daily.protein}g`);
    assert(daily.fiber > 10, `Fiber calculated: ${daily.fiber}g`);
    assert(daily.sodium > 0, `Sodium calculated: ${daily.sodium}mg`);
  });

  // TEST SUITE 6: SAFETY VALIDATION
  console.log('\n--- Suite 6: Safety Validation ---');
  it('Safety validator should pass clean meal plan and flag disclaimers', () => {
    const samplePlan = {
      meals: {
        breakfast: { title: 'Breakfast', items: [{ name: 'Bajra porridge', foodCode: 'A003', foodNutrients: {} }] },
        lunch: { title: 'Lunch', items: [{ name: 'Moong dal', foodCode: 'B003', foodNutrients: {} }] },
        dinner: { title: 'Dinner', items: [{ name: 'Rice khichdi', foodCode: 'A015', foodNutrients: {} }] }
      },
      dailyNutrition: { calories: 1750, sodium: 1200, potassium: 1800 }
    };

    const safety = validateDietPlan(samplePlan, { unifiedConstraints: { maxSodiumDailyMg: 2000 } }, { diet_type: 'Vegetarian' });
    assert.strictEqual(safety.isValid, true);
    assert(safety.warnings.length > 0, 'Should include general disclaimer');
  });

  // TEST SUITE 7: END-TO-END ORCHESTRATION & PERSISTENCE
  console.log('\n--- Suite 7: End-to-End Orchestration & Database Persistence ---');
  await itAsync('Should execute generatePersonalizedPlan and persist in diet_plans table', async () => {
    let testUser = (await query("SELECT id, patient_id FROM users WHERE role = 'patient' LIMIT 1")).rows[0];
    if (!testUser) {
      const uRes = await query(
        `INSERT INTO users (name, email, role, patient_id, age, gender)
         VALUES ('Test Patient', 'testpatient@medassist.ai', 'patient', 'P999999', 48, 'Male')
         RETURNING id, patient_id`
      );
      testUser = uRes.rows[0];
    }

    const plan = await generatePersonalizedPlan({
      patientProfile: { age: 48, gender: 'Male', weightKg: 70, heightCm: 172 },
      clinicalVitals: { glucose: 135, hba1c: 6.8, cholesterol: 215, sysBP: 132 },
      diseaseRisks: [
        { id: 'diabetes', name: 'Diabetes Risk', percentage: 65, status: 'High' },
        { id: 'heart', name: 'Heart Disease Risk', percentage: 38, status: 'Moderate' },
        { id: 'kidney', name: 'Kidney Disease Risk', percentage: 15, status: 'Low' }
      ],
      preferences: {
        diet_type: 'Vegetarian',
        food_preference: 'North Indian',
        meal_count: 5,
        allergies: ['peanut'],
        excluded_foods: []
      },
      days: 3
    });

    assert(plan.meals.breakfast, 'Plan should contain breakfast');
    assert(plan.dailyNutrition.calories > 0, 'Plan should have calculated calories');

    // Persist to diet_plans
    const insertRes = await query(
      `INSERT INTO diet_plans (user_id, patient_id, risk_snapshot, plan_json, nutrition_summary, reasons_json, safety_status, warnings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, patient_id as "patientId", created_at as "createdAt"`,
      [
        testUser.id,
        testUser.patient_id || 'P999999',
        JSON.stringify(plan.clinicalContext),
        JSON.stringify(plan.meals),
        JSON.stringify(plan.dailyNutrition),
        JSON.stringify(plan.clinicalContext),
        plan.safety.safetyStatus,
        JSON.stringify(plan.safety.warnings)
      ]
    );

    assert(insertRes.rows[0].id, 'Plan should be saved and return UUID');
    console.log(`    Successfully saved diet plan ${insertRes.rows[0].id} for patient ${insertRes.rows[0].patientId}`);
  });

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .then(() => pool.end())
  .catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
