const { query } = require('../config/db');

/**
 * Create a persistent notification in PostgreSQL
 */
const createNotification = async ({ userId, title, message, type = 'info', link = null }) => {
  try {
    if (!userId || !title || !message) return null;
    const res = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id as "userId", title, message, type, link, is_read as "isRead", created_at as "createdAt"`,
      [userId, title, message, type, link]
    );
    return res.rows[0] || null;
  } catch (err) {
    console.error('[Notification] Error creating notification:', err.message);
    return null;
  }
};

module.exports = {
  createNotification
};
