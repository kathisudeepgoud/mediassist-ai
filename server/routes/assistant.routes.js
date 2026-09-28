const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const {
  chat,
  chatStream,
  getHistory,
  clearHistory,
  getAiHealth
} = require('../controllers/assistant.controller');

// AI health check can be called without token or with token
router.get('/health', getAiHealth);

// All conversational endpoints require authenticated token
router.use(authenticateToken);

router.post('/chat', chat);
router.post('/chat/stream', chatStream);
router.get('/history', getHistory);
router.delete('/history', clearHistory);

module.exports = router;
