/**
 * Master MILP Diet Engine Orchestrator
 * MedAssist AI — Mixed Integer Linear Programming (MILP) Personalized Clinical Diet System
 */

const { query } = require('../../config/db');
const { optimizeWithMILP } = require('./milpOptimizerBridge');

// Cached in-memory food catalog from PostgreSQL
let cachedFoods = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function loadAllIFCTFoods() {
  const now = Date.now();
  if (cachedFoods && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedFoods;
  }

  const sql = `
    SELECT 
      f.id,
      f.food_code,
      f.food_name,
      f.scientific_name,
      f.dietary_tags,
      f.local_names_raw,
      fg.group_code,
      fg.group_name,
      json_object_agg(n.nutrient_code, fn.amount_per_100g) as nutrients
    FROM foods f
    LEFT JOIN food_groups fg ON f.food_group_id = fg.id
    LEFT JOIN food_nutrients fn ON f.id = fn.food_id
    LEFT JOIN nutrients n ON fn.nutrient_id = n.id
    GROUP BY f.id, f.food_code, f.food_name, f.scientific_name, f.dietary_tags, f.local_names_raw, fg.group_code, fg.group_name
    ORDER BY f.food_code ASC
  `;

  const res = await query(sql);
  cachedFoods = res.rows.map(r => ({
    id: r.id,
    food_code: r.food_code,
    food_name: r.food_name,
    scientific_name: r.scientific_name,
    dietary_tags: r.dietary_tags || [],
    local_names_raw: r.local_names_raw || '',
    group_code: r.group_code || 'A',
    group_name: r.group_name || 'Cereals and Millets',
    nutrients: r.nutrients || {}
  }));
  lastCacheTime = now;
  return cachedFoods;
}

/**
 * Generate a complete personalized diet plan for a patient via MILP Optimization
 */
async function generatePersonalizedPlan({ patientProfile, clinicalVitals, diseaseRisks, preferences, days = 7 }) {
  // 1. Dispatch to MILP Optimization Engine (FastAPI uses pre-warmed IFCT knowledge base)
  const milpPayload = {
    patientProfile: {
      id: patientProfile.id,
      patientId: patientProfile.patientId || patientProfile.patient_id,
      name: patientProfile.name || 'Patient',
      age: patientProfile.age || 45,
      gender: patientProfile.gender || 'Male',
      heightCm: patientProfile.heightCm || patientProfile.height_cm || 168.0,
      weightKg: patientProfile.weightKg || patientProfile.weight_kg || 65.0,
      activity_level: preferences.activity_level || patientProfile.activity_level || 'Moderately Active',
      health_goal: preferences.health_goal || patientProfile.health_goal || 'Maintenance',
      calorie_target_override: preferences.calorie_target_override || patientProfile.calorie_target_override || null
    },
    clinicalVitals: clinicalVitals || {},
    diseaseRisks: (diseaseRisks || []).map(r => ({
      id: r.id,
      name: r.name,
      status: r.status || (r.percentage >= 60 ? 'High' : r.percentage >= 30 ? 'Moderate' : 'Low'),
      percentage: r.percentage || 0
    })),
    preferences: {
      diet_type: preferences.diet_type || 'Vegetarian',
      food_preference: preferences.food_preference || 'All',
      activity_level: preferences.activity_level || 'Moderately Active',
      meal_count: preferences.meal_count || 5,
      allergies: preferences.allergies || [],
      excluded_foods: preferences.excluded_foods || [],
      health_goal: preferences.health_goal || 'Maintenance',
      calorie_target_override: preferences.calorie_target_override || null
    },
    days: days,
    solver: 'pulp',
    foods: null
  };

  const milpResult = await optimizeWithMILP(milpPayload);

  return {
    weekRange: milpResult.weekRange,
    mealCount: milpResult.mealCount,
    targetCalories: milpResult.targetCalories,
    weeklyPlan: milpResult.weeklyPlan,
    meals: milpResult.meals,
    dailyNutrition: milpResult.dailyNutrition,
    clinicalContext: milpResult.clinicalContext,
    safety: milpResult.safety,
    ruleVersion: milpResult.ruleVersion || '2.0.0-MILP-IFCT2017'
  };
}

module.exports = {
  loadAllIFCTFoods,
  generatePersonalizedPlan
};
