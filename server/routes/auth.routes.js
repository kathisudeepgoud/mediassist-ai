const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const authenticateToken = require('../middleware/auth.middleware');

// Public Auth Endpoints
router.post('/register', register);
router.post('/login', login);

// Protected Auth Endpoint
router.get('/me', authenticateToken, getMe);

module.exports = router;
