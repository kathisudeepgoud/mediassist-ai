const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const { uploadPrescription: uploadMulter } = require('../middleware/upload.middleware');
const {
  uploadPrescription,
  getMyPrescriptions,
  getPatientPrescriptions,
  downloadPrescription
} = require('../controllers/prescription.controller');

router.use(authenticateToken);

router.post('/upload', uploadMulter.single('file'), uploadPrescription);
router.get('/my', getMyPrescriptions);
router.get('/patient/:patientId', getPatientPrescriptions);
router.get('/download/:id', downloadPrescription);

module.exports = router;
