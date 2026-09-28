const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getSettings, updateSettings } = require('../controllers/user.controller');
const authenticateToken = require('../middleware/auth.middleware');

// All User Profile & Settings routes require Authentication
router.use(authenticateToken);

// Profile CRUD
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Settings CRUD
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
