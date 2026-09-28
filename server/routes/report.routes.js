const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const authenticateToken = require('../middleware/auth.middleware');
const { createManualReport, uploadReport, getAllReports, getReportById, deleteReport, getTrends, getDiseaseRisks, consolidateManualReports, getDiseaseRiskDetails, reExplainReport } = require('../controllers/report.controller');

// All Report endpoints require authentication
router.use(authenticateToken);

// Upload & Manual Entry Endpoints
router.post('/manual', createManualReport);
router.post('/upload', upload.single('reportFile'), uploadReport);
router.post('/consolidate-manual', consolidateManualReports);

// Retrieval, Trends & Disease Risks Endpoints
router.get('/', getAllReports);
router.get('/trends', getTrends);
router.get('/disease-risks', getDiseaseRisks);
router.get('/disease-risks/:organ/details', getDiseaseRiskDetails);
router.post('/disease-risks/analyze', getDiseaseRisks);
router.get('/:id', getReportById);
router.post('/:id/explain', reExplainReport);
router.delete('/:id', deleteReport);

module.exports = router;

