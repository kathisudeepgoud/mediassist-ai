const { query } = require('../config/db');

/**
 * GET /api/notifications
 * Fetch notifications for authenticated user
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT id, user_id as "userId", title, message, type, link, is_read as "isRead", created_at as "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const unreadCountRes = await query(
      `SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    const unreadCount = unreadCountRes.rows[0]?.count || 0;

    return res.status(200).json({
      notifications: result.rows,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark single notification as read
 */
const markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read as "isRead"`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Notification not found.' } });
    }

    return res.status(200).json({ message: 'Notification marked as read', notification: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all user notifications as read
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
