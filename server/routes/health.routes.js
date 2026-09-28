const express = require('express');
const router = express.Router();
const { getHealthStatus, getModelStatus } = require('../controllers/health.controller');

// GET /api/health
router.get('/', getHealthStatus);

// GET /api/health/model-status
router.get('/model-status', getModelStatus);

module.exports = router;

