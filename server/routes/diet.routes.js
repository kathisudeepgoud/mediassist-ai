const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const {
  getDietProfile,
  updateDietProfile,
  generateDietPlan,
  getCurrentDietPlan,
  getDietPlanHistory,
  deleteDietPlanHistory,
  searchFoods,
  getFoodDetails
} = require('../controllers/diet.controller');

// All Diet Planner endpoints require authentication
router.use(authenticateToken);

// Diet Profile & Preferences
router.get('/profile', getDietProfile);
router.put('/profile', updateDietProfile);

// Meal Generation & Plans
router.post('/generate', generateDietPlan);
router.get('/current', getCurrentDietPlan);
router.get('/history', getDietPlanHistory);
router.delete('/history/:id', deleteDietPlanHistory);

// IFCT Food Database Search & Details
router.get('/foods/search', searchFoods);
router.get('/foods/:id', getFoodDetails);

module.exports = router;
