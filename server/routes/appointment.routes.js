const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const {
  getAvailableDoctors,
  getDoctorDetails,
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  updateAppointmentStatus
} = require('../controllers/appointment.controller');

// Public/Auth endpoints for doctor discovery
router.get('/doctors', authenticateToken, getAvailableDoctors);
router.get('/doctors/:doctorId', authenticateToken, getDoctorDetails);

// Protected appointment actions
router.use(authenticateToken);

router.post('/book', bookAppointment);
router.get('/my', getMyAppointments);
router.get('/:id', getAppointmentById);
router.put('/:id/status', updateAppointmentStatus);

module.exports = router;
