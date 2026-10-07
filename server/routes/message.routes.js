const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const {
  getConversations,
  getMessageThread,
  sendMessage,
  markThreadRead
} = require('../controllers/message.controller');

router.use(authenticateToken);

router.get('/conversations', getConversations);
router.get('/:otherUserId', getMessageThread);
router.post('/:otherUserId', sendMessage);
router.put('/read/:otherUserId', markThreadRead);

module.exports = router;
