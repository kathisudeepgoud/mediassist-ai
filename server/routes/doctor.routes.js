const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const {
  getDoctorStats,
  getDoctorPatients,
  addPatientToDoctor,
  removePatientFromDoctor,
  getDoctorPatientProfile,
  searchPatient,
  getPatientAlerts,
  markAlertReviewed
} = require('../controllers/doctor.controller');

/**
 * Middleware to require Doctor role
 */
const requireDoctorRole = (req, res, next) => {
  const userRole = (req.user && req.user.role ? req.user.role : '').toString().toLowerCase();
  if (userRole !== 'doctor') {
    return res.status(403).json({
      error: { message: 'Access denied. Doctor privileges required.' }
    });
  }
  next();
};

// All doctor endpoints require valid JWT and Doctor role
router.use(authenticateToken);
router.use(requireDoctorRole);

// GET /api/doctor/stats — Summary counts for logged-in doctor
router.get('/stats', getDoctorStats);

// GET /api/doctor/patients — My Patients list
router.get('/patients', getDoctorPatients);

// POST /api/doctor/patients — Add patient permanently
router.post('/patients', addPatientToDoctor);

// DELETE /api/doctor/patients/:patientId — Remove/deactivate patient relationship
router.delete('/patients/:patientId', removePatientFromDoctor);

// GET /api/doctor/patient/:patientId — Complete patient profile
router.get('/patient/:patientId', getDoctorPatientProfile);
router.get('/patient/search', searchPatient);

// GET /api/doctor/alerts — Patient High-Risk Alerts
router.get('/alerts', getPatientAlerts);

// PUT /api/doctor/alerts/:alertId/review — Mark Alert as Reviewed
router.put('/alerts/:alertId/review', markAlertReviewed);

module.exports = router;

