/**
 * Diet Planner Controller
 * Endpoints for Personalized Clinical Diet Generation, Preferences, History, and IFCT Food Search.
 */

const { query } = require('../config/db');
const { calculateDiseaseRisks } = require('./report.controller');
const { generatePersonalizedPlan, loadAllIFCTFoods } = require('../services/diet/dietEngine');

/**
 * Helper to extract latest clinical vitals from PostgreSQL for a given user
 */
async function getLatestPatientClinicalContext(userId) {
  const userRes = await query(
    `SELECT id, name, age, gender, blood_group as "bloodGroup", height_cm as "heightCm", 
            weight_kg as "weightKg", patient_id as "patientId", role 
     FROM users WHERE id = $1`,
    [userId]
  );
  const user = userRes.rows[0] || {};

  // Fetch latest vitals
  const vitalsRes = await query(
    `SELECT vr.label, vr.value, vr.unit, vr.status, vr.raw_value
     FROM vital_readings vr
     JOIN medical_reports mr ON vr.report_id = mr.id
     WHERE vr.user_id = $1
     ORDER BY mr.report_date DESC, mr.created_at DESC`,
    [userId]
  );

  const rawVitals = vitalsRes.rows;
  const clinicalVitals = {};

  for (const v of rawVitals) {
    const lbl = (v.label || '').toLowerCase();
    const val = typeof v.value === 'number' ? v.value : parseFloat(String(v.value).replace(/[^0-9\.]/g, ''));
    if (!isNaN(val) && val > 0) {
      if (/sugar|glucose|fbs/i.test(lbl) && !/hba1c|glycated/i.test(lbl) && !clinicalVitals.fasting_sugar) {
        clinicalVitals.fasting_sugar = val;
        clinicalVitals.blood_glucose_level = val;
      }
      if (/hba1c|glycated/i.test(lbl) && !clinicalVitals.hba1c) {
        clinicalVitals.hba1c = val;
      }
      if (/cholesterol|lipid|ldl/i.test(lbl) && !clinicalVitals.cholesterol) {
        clinicalVitals.cholesterol = val;
        clinicalVitals.totChol = val;
      }
      if (/systolic/i.test(lbl) && !clinicalVitals.sysBP) clinicalVitals.sysBP = val;
      else if (/diastolic/i.test(lbl) && !clinicalVitals.diaBP) clinicalVitals.diaBP = val;
      else if (/pressure|bp/i.test(lbl) && !clinicalVitals.sysBP) clinicalVitals.sysBP = val;

      if (/creatinine/i.test(lbl) && !clinicalVitals.creatinine) {
        clinicalVitals.creatinine = val;
        clinicalVitals.sc = val;
      }
      if (/urea|bun/i.test(lbl) && !clinicalVitals.blood_urea) {
        clinicalVitals.blood_urea = val;
        clinicalVitals.bu = val;
      }
      if (/sodium|na\+/i.test(lbl) && !clinicalVitals.sodium) clinicalVitals.sodium = val;
      if (/potassium|k\+/i.test(lbl) && !clinicalVitals.potassium) clinicalVitals.potassium = val;
      if (/hgb|hb|hemoglobin/i.test(lbl) && !clinicalVitals.hemoglobin) clinicalVitals.hemoglobin = val;
      if (/rbc/i.test(lbl) && !clinicalVitals.rbc) clinicalVitals.rbc = val;
      if (/total bilirubin|bilirubin/i.test(lbl) && !clinicalVitals.totalBilirubin) clinicalVitals.totalBilirubin = val;
      if (/alt|sgpt/i.test(lbl) && !clinicalVitals.alt) clinicalVitals.alt = val;
      if (/ast|sgot/i.test(lbl) && !clinicalVitals.ast) clinicalVitals.ast = val;
    }
  }

  // Calculate ML Disease Risks using existing Random Forest service
  let diseaseRisks = [];
  if (rawVitals.length > 0) {
    try {
      const riskData = await calculateDiseaseRisks(userId);
      diseaseRisks = Array.isArray(riskData) ? riskData : (riskData.diseaseRisks || []);
    } catch (err) {
      console.warn('[Diet Controller Warning] Failed to calculate live ML risks:', err.message);
      diseaseRisks = [];
    }
  }

  return { user, rawVitals, clinicalVitals, diseaseRisks };
}

/**
 * GET /api/diet/profile
 * Get patient's dietary preferences and current clinical health context
 */
const getDietProfile = async (req, res, next) => {
  try {
    let targetUserId = req.user.id;

    // If doctor is accessing a patient's diet profile
    if (req.user.role === 'doctor' && req.query.patientId) {
      const pRes = await query('SELECT id FROM users WHERE patient_id = $1 OR id::text = $1', [req.query.patientId]);
      if (pRes.rows.length === 0) {
        return res.status(404).json({ error: { message: 'Patient not found' } });
      }
      targetUserId = pRes.rows[0].id;
    }

    // 1. Fetch preferences
    let prefRes = await query(
      `SELECT id, user_id as "userId", diet_type as "dietType", food_preference as "foodPreference",
              activity_level as "activityLevel", meal_count as "mealCount", allergies, excluded_foods as "excludedFoods",
              health_goal as "healthGoal", calorie_target_override as "calorieTargetOverride",
              updated_at as "updatedAt"
       FROM diet_preferences WHERE user_id = $1`,
      [targetUserId]
    );

    let preferences = prefRes.rows[0];
    if (!preferences) {
      const initRes = await query(
        `INSERT INTO diet_preferences (user_id, diet_type, food_preference, activity_level, meal_count, allergies, excluded_foods, health_goal)
         VALUES ($1, 'Vegetarian', 'All', 'Moderately Active', 5, '[]'::jsonb, '[]'::jsonb, 'Maintenance')
         RETURNING id, user_id as "userId", diet_type as "dietType", food_preference as "foodPreference",
                   activity_level as "activityLevel", meal_count as "mealCount", allergies, excluded_foods as "excludedFoods",
                   health_goal as "healthGoal", calorie_target_override as "calorieTargetOverride",
                   updated_at as "updatedAt"`,
        [targetUserId]
      );
      preferences = initRes.rows[0];
    }

    // 2. Fetch latest clinical context
    const { user, clinicalVitals, diseaseRisks } = await getLatestPatientClinicalContext(targetUserId);

    return res.status(200).json({
      preferences,
      patient: {
        id: user.id,
        patientId: user.patientId,
        name: user.name,
        age: user.age,
        gender: user.gender,
        heightCm: user.heightCm,
        weightKg: user.weightKg
      },
      clinicalVitals,
      diseaseRisks
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/diet/profile
 * Update patient's dietary preferences
 */
const updateDietProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      dietType,
      foodPreference,
      activityLevel,
      mealCount,
      allergies,
      excludedFoods,
      healthGoal,
      calorieTargetOverride
    } = req.body;

    const allergiesJson = JSON.stringify(Array.isArray(allergies) ? allergies : []);
    const excludedJson = JSON.stringify(Array.isArray(excludedFoods) ? excludedFoods : []);
    const cleanMealCount = [3, 4, 5].includes(parseInt(mealCount, 10)) ? parseInt(mealCount, 10) : 5;

    const result = await query(
      `INSERT INTO diet_preferences 
       (user_id, diet_type, food_preference, activity_level, meal_count, allergies, excluded_foods, health_goal, calorie_target_override, updated_at)
       VALUES ($1, COALESCE($2, 'Vegetarian'), COALESCE($3, 'All'), COALESCE($4, 'Moderately Active'), $5, $6::jsonb, $7::jsonb, COALESCE($8, 'Maintenance'), $9, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE
       SET diet_type = COALESCE($2, diet_preferences.diet_type),
           food_preference = COALESCE($3, diet_preferences.food_preference),
           activity_level = COALESCE($4, diet_preferences.activity_level),
           meal_count = COALESCE($5, diet_preferences.meal_count),
           allergies = COALESCE($6::jsonb, diet_preferences.allergies),
           excluded_foods = COALESCE($7::jsonb, diet_preferences.excluded_foods),
           health_goal = COALESCE($8, diet_preferences.health_goal),
           calorie_target_override = $9,
           updated_at = CURRENT_TIMESTAMP
       RETURNING id, user_id as "userId", diet_type as "dietType", food_preference as "foodPreference",
                 activity_level as "activityLevel", meal_count as "mealCount", allergies, excluded_foods as "excludedFoods",
                 health_goal as "healthGoal", calorie_target_override as "calorieTargetOverride",
                 updated_at as "updatedAt"`,
      [userId, dietType, foodPreference, activityLevel, cleanMealCount, allergiesJson, excludedJson, healthGoal, calorieTargetOverride || null]
    );

    return res.status(200).json({
      message: 'Diet preferences updated successfully',
      preferences: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/diet/generate
 * Generate and persist a new personalized diet plan
 */
const generateDietPlan = async (req, res, next) => {
  try {
    let userId = req.targetUserId || req.user.id;

    if (req.user.role === 'doctor' && req.query.patientId && !req.targetUserId) {
      const pRes = await query('SELECT id FROM users WHERE patient_id = $1 OR id::text = $1', [req.query.patientId]);
      if (pRes.rows.length > 0) {
        userId = pRes.rows[0].id;
      }
    }

    // 1. Fetch preferences
    let prefRes = await query(
      `SELECT diet_type, food_preference, activity_level, meal_count, allergies, excluded_foods, health_goal, calorie_target_override
       FROM diet_preferences WHERE user_id = $1`,
      [userId]
    );
    const preferences = prefRes.rows[0] || {
      diet_type: 'Vegetarian',
      food_preference: 'All',
      activity_level: 'Moderately Active',
      meal_count: 5,
      allergies: [],
      excluded_foods: [],
      health_goal: 'Maintenance'
    };

    // Override preferences from request body if passed
    const body = req.body || {};
    if (body.dietType) preferences.diet_type = body.dietType;
    if (body.foodPreference) preferences.food_preference = body.foodPreference;
    if (body.activityLevel) preferences.activity_level = body.activityLevel;
    if (body.mealCount) preferences.meal_count = parseInt(body.mealCount, 10);
    if (body.allergies) preferences.allergies = body.allergies;
    if (body.excludedFoods) preferences.excluded_foods = body.excludedFoods;
    if (body.healthGoal) preferences.health_goal = body.healthGoal;

    // 2. Fetch clinical vitals and ML risks
    const { user, clinicalVitals, diseaseRisks } = await getLatestPatientClinicalContext(userId);

    // 3. Run master diet engine
    const planResult = await generatePersonalizedPlan({
      patientProfile: {
        ...user,
        activity_level: preferences.activity_level,
        health_goal: preferences.health_goal,
        calorie_target_override: preferences.calorie_target_override
      },
      clinicalVitals,
      diseaseRisks,
      preferences
    });

    // 4. Persist generated plan in database
    const planStorageJson = {
      weeklyPlan: planResult.weeklyPlan,
      meals: planResult.meals,
      weekRange: planResult.weekRange
    };

    const insertRes = await query(
      `INSERT INTO diet_plans 
       (user_id, patient_id, risk_snapshot, plan_json, nutrition_summary, reasons_json, safety_status, warnings, rule_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id as "userId", patient_id as "patientId", generated_at as "generatedAt",
                 risk_snapshot as "riskSnapshot", plan_json as "planJson", nutrition_summary as "nutritionSummary",
                 reasons_json as "reasonsJson", safety_status as "safetyStatus", warnings, rule_version as "ruleVersion",
                 created_at as "createdAt"`,
      [
        userId,
        user.patientId || 'P000001',
        JSON.stringify(diseaseRisks),
        JSON.stringify(planStorageJson),
        JSON.stringify(planResult.dailyNutrition),
        JSON.stringify(planResult.clinicalContext),
        planResult.safety.safetyStatus,
        JSON.stringify(planResult.safety.warnings),
        planResult.ruleVersion
      ]
    );

    const savedPlan = insertRes.rows[0];

    return res.status(201).json({
      message: 'Personalized weekly diet plan generated successfully',
      planId: savedPlan.id,
      generatedAt: savedPlan.generatedAt,
      weekRange: planResult.weekRange,
      targetCalories: planResult.targetCalories,
      mealCount: planResult.mealCount,
      weeklyPlan: planResult.weeklyPlan,
      meals: planResult.meals,
      dailyNutrition: planResult.dailyNutrition,
      clinicalContext: planResult.clinicalContext,
      safety: planResult.safety,
      preferences,
      diseaseRisks
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/diet/current
 * Retrieve the latest active diet plan (or generate one if none exists)
 */
const getCurrentDietPlan = async (req, res, next) => {
  try {
    let targetUserId = req.user.id;

    if (req.user.role === 'doctor' && req.query.patientId) {
      const pRes = await query('SELECT id FROM users WHERE patient_id = $1 OR id::text = $1', [req.query.patientId]);
      if (pRes.rows.length === 0) {
        return res.status(404).json({ error: { message: 'Patient not found' } });
      }
      targetUserId = pRes.rows[0].id;
    }

    const planRes = await query(
      `SELECT id, user_id as "userId", patient_id as "patientId", generated_at as "generatedAt",
              risk_snapshot as "riskSnapshot", plan_json as "planJson", nutrition_summary as "nutritionSummary",
              reasons_json as "reasonsJson", safety_status as "safetyStatus", warnings, rule_version as "ruleVersion"
       FROM diet_plans 
       WHERE user_id = $1 
       ORDER BY generated_at DESC, created_at DESC 
       LIMIT 1`,
      [targetUserId]
    );

    if (planRes.rows.length > 0) {
      const row = planRes.rows[0];
      const parsedPlan = typeof row.planJson === 'string' ? JSON.parse(row.planJson) : row.planJson;
      let weeklyPlan = Array.isArray(parsedPlan) ? parsedPlan : (parsedPlan?.weeklyPlan || null);
      let meals = parsedPlan?.meals || (!Array.isArray(parsedPlan) && !parsedPlan?.weeklyPlan ? parsedPlan : (weeklyPlan?.[0]?.meals || {}));

      // If weeklyPlan was not saved in older schema, build 7-day schedule from meals
      if ((!weeklyPlan || weeklyPlan.length === 0) && meals && Object.keys(meals).length > 0) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const nutSummary = typeof row.nutritionSummary === 'string' ? JSON.parse(row.nutritionSummary) : row.nutritionSummary;
        weeklyPlan = days.map((dayName, idx) => ({
          day: idx + 1,
          dayName,
          meals: meals,
          nutrition: nutSummary
        }));
      }

      return res.status(200).json({
        planId: row.id,
        generatedAt: row.generatedAt,
        weekRange: parsedPlan?.weekRange,
        weeklyPlan: weeklyPlan || [],
        meals: meals,
        dailyNutrition: typeof row.nutritionSummary === 'string' ? JSON.parse(row.nutritionSummary) : row.nutritionSummary,
        clinicalContext: typeof row.reasonsJson === 'string' ? JSON.parse(row.reasonsJson) : row.reasonsJson,
        safety: {
          safetyStatus: row.safetyStatus,
          warnings: typeof row.warnings === 'string' ? JSON.parse(row.warnings) : row.warnings
        },
        diseaseRisks: typeof row.riskSnapshot === 'string' ? JSON.parse(row.riskSnapshot) : row.riskSnapshot
      });
    }

    // If no plan exists yet, generate one dynamically
    req.targetUserId = targetUserId;
    return generateDietPlan(req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/diet/history
 * List historical generated diet plans for the patient
 */
const getDietPlanHistory = async (req, res, next) => {
  try {
    let targetUserId = req.user.id;

    if (req.user.role === 'doctor' && req.query.patientId) {
      const pRes = await query('SELECT id FROM users WHERE patient_id = $1 OR id::text = $1', [req.query.patientId]);
      if (pRes.rows.length === 0) {
        return res.status(404).json({ error: { message: 'Patient not found' } });
      }
      targetUserId = pRes.rows[0].id;
    }

    const plansRes = await query(
      `SELECT id, patient_id as "patientId", generated_at as "generatedAt",
              nutrition_summary as "nutritionSummary", safety_status as "safetyStatus",
              rule_version as "ruleVersion", created_at as "createdAt"
       FROM diet_plans 
       WHERE user_id = $1 
       ORDER BY generated_at DESC, created_at DESC 
       LIMIT 20`,
      [targetUserId]
    );

    return res.status(200).json({
      total: plansRes.rows.length,
      history: plansRes.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/diet/foods/search
 * Search and browse IFCT 2017 foods by name, regional name, or category
 */
const searchFoods = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const group = (req.query.group || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    let sql = `
      SELECT 
        f.id,
        f.food_code as "foodCode",
        f.food_name as "foodName",
        f.scientific_name as "scientificName",
        f.dietary_tags as "dietaryTags",
        f.local_names_raw as "localNamesRaw",
        fg.group_code as "groupCode",
        fg.group_name as "groupName",
        json_object_agg(n.nutrient_code, fn.amount_per_100g) as nutrients
      FROM foods f
      LEFT JOIN food_groups fg ON f.food_group_id = fg.id
      LEFT JOIN food_nutrients fn ON f.id = fn.food_id
      LEFT JOIN nutrients n ON fn.nutrient_id = n.id
    `;

    const whereClauses = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      whereClauses.push(`(f.food_name ILIKE $${params.length} OR f.local_names_raw ILIKE $${params.length} OR f.food_code ILIKE $${params.length} OR f.scientific_name ILIKE $${params.length})`);
    }

    if (group) {
      params.push(group);
      whereClauses.push(`(fg.group_code = $${params.length} OR fg.group_name ILIKE $${params.length})`);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += `
      GROUP BY f.id, f.food_code, f.food_name, f.scientific_name, f.dietary_tags, f.local_names_raw, fg.group_code, fg.group_name
      ORDER BY f.food_code ASC
      LIMIT ${limit}
    `;

    const result = await query(sql, params);

    return res.status(200).json({
      total: result.rows.length,
      foods: result.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/diet/foods/:id
 * Get complete nutritional breakdown of an IFCT food
 */
const getFoodDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const foodRes = await query(
      `SELECT 
        f.id,
        f.food_code as "foodCode",
        f.food_name as "foodName",
        f.scientific_name as "scientificName",
        f.dietary_tags as "dietaryTags",
        f.local_names_raw as "localNamesRaw",
        fg.group_code as "groupCode",
        fg.group_name as "groupName"
       FROM foods f
       LEFT JOIN food_groups fg ON f.food_group_id = fg.id
       WHERE f.id::text = $1 OR f.food_code = $1`,
      [id]
    );

    if (foodRes.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Food item not found' } });
    }

    const food = foodRes.rows[0];

    // Fetch all nutrients
    const nutRes = await query(
      `SELECT n.nutrient_code as "code", n.nutrient_name as "name", n.unit, n.category, fn.amount_per_100g as "amountPer100g", fn.original_value as "originalValue"
       FROM food_nutrients fn
       JOIN nutrients n ON fn.nutrient_id = n.id
       WHERE fn.food_id = $1
       ORDER BY n.category ASC, n.nutrient_name ASC`,
      [food.id]
    );

    // Fetch multilingual names
    const namesRes = await query(
      `SELECT language, name FROM food_names WHERE food_id = $1 ORDER BY language ASC`,
      [food.id]
    );

    food.nutrients = nutRes.rows;
    food.localNames = namesRes.rows;

    return res.status(200).json({ food });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/diet/history/:id
 * Delete a specific historical diet plan for the patient
 */
const deleteDietPlanHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(
      'DELETE FROM diet_plans WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: { message: 'Diet plan not found or not authorized to delete' } });
    }

    return res.status(200).json({
      message: 'Diet plan deleted successfully',
      deletedId: id
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDietProfile,
  updateDietProfile,
  generateDietPlan,
  getCurrentDietPlan,
  getDietPlanHistory,
  deleteDietPlanHistory,
  searchFoods,
  getFoodDetails
};

