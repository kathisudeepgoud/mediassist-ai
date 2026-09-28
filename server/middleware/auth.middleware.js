const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Authentication Middleware for protected routes
 * Verifies JWT token provided in Authorization header (Bearer <token>)
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      error: {
        message: 'Access denied. No authentication token provided.'
      }
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret_key_12345';
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // Contains id, email, etc.

    // If role is missing from token payload, fetch directly from DB
    if (!req.user.role || !req.user.patientId || !req.user.doctorId) {
      const userRes = await query(
        `SELECT role, patient_id as "patientId", doctor_id as "doctorId" FROM users WHERE id = $1`,
        [decoded.id]
      );
      if (userRes.rows.length > 0) {
        req.user.role = (userRes.rows[0].role || 'patient').toLowerCase();
        req.user.patientId = userRes.rows[0].patientId;
        req.user.doctorId = userRes.rows[0].doctorId;
      }
    } else {
      req.user.role = req.user.role.toString().toLowerCase();
    }

    next();
  } catch (err) {
    return res.status(403).json({
      error: {
        message: 'Invalid or expired authentication token.'
      }
    });
  }
};

module.exports = authenticateToken;
