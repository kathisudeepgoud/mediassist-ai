const path = require('path');
const fs = require('fs');
const { query } = require('../config/db');
const { createNotification } = require('../services/notification.service');

/**
 * Generate unique prescription number like RX1024
 */
const generatePrescriptionNumber = async () => {
  const result = await query(
    `SELECT prescription_number FROM prescriptions WHERE prescription_number ~ '^RX[0-9]+$'`
  );
  let maxNum = 1000;
  for (const row of result.rows) {
    const val = row.prescription_number;
    if (val) {
      const num = parseInt(val.replace('RX', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return `RX${maxNum + 1}`;
};

/**
 * POST /api/prescriptions/upload
 * Upload a new prescription file by Doctor for a Patient/Appointment
 */
const uploadPrescription = async (req, res, next) => {
  try {
    const doctorUserId = req.user.id;
    const isDoctor = (req.user.role || '').toLowerCase() === 'doctor';

    if (!isDoctor) {
      return res.status(403).json({ error: { message: 'Only registered doctors can upload prescriptions.' } });
    }

    if (!req.file) {
      return res.status(400).json({ error: { message: 'Prescription PDF file is required.' } });
    }

    const { patientId, appointmentId, diagnosis, instructions } = req.body;
    let medications = [];
    if (req.body.medications) {
      try {
        medications = typeof req.body.medications === 'string' ? JSON.parse(req.body.medications) : req.body.medications;
      } catch {
        medications = [];
      }
    }

    if (!patientId) {
      return res.status(400).json({ error: { message: 'Patient ID or User ID is required.' } });
    }

    // Resolve patient user ID
    const patRes = await query(
      `SELECT id, name, patient_id as "patientId", email FROM users WHERE (id::text = $1 OR patient_id = $1) AND role = 'patient'`,
      [patientId]
    );

    if (patRes.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Target patient not found.' } });
    }

    const targetPatient = patRes.rows[0];
    const actualPatientUserId = targetPatient.id;

    // Check relationship authorization
    const relRes = await query(
      `SELECT id FROM doctor_patients WHERE doctor_id = $1 AND patient_id = $2 AND status = 'active'`,
      [doctorUserId, actualPatientUserId]
    );

    if (relRes.rows.length === 0) {
      // Create active relationship automatically if not already present
      await query(
        `INSERT INTO doctor_patients (doctor_id, patient_id, status)
         VALUES ($1, $2, 'active')
         ON CONFLICT (doctor_id, patient_id) DO UPDATE SET status = 'active'`,
        [doctorUserId, actualPatientUserId]
      );
    }

    // Verify appointment if provided
    let verifiedAppointmentId = null;
    if (appointmentId) {
      const apptRes = await query(
        `SELECT id, appointment_number FROM appointments WHERE (id::text = $1 OR appointment_number = $1) AND doctor_id = $2`,
        [appointmentId, doctorUserId]
      );
      if (apptRes.rows.length > 0) {
        verifiedAppointmentId = apptRes.rows[0].id;
        // Automatically mark appointment as completed if not already
        await query(
          `UPDATE appointments SET appointment_status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [verifiedAppointmentId]
        );
      }
    }

    const prescriptionNumber = await generatePrescriptionNumber();
    const relativeFilePath = `/uploads/prescriptions/${req.file.filename}`;

    const insertRes = await query(
      `INSERT INTO prescriptions
       (prescription_number, doctor_id, patient_id, appointment_id, file_name, file_path, file_size, diagnosis, instructions, medications)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, prescription_number as "prescriptionNumber", doctor_id as "doctorId", patient_id as "patientId",
                 appointment_id as "appointmentId", file_name as "fileName", file_path as "filePath", file_size as "fileSize",
                 diagnosis, instructions, medications, uploaded_at as "uploadedAt"`,
      [
        prescriptionNumber,
        doctorUserId,
        actualPatientUserId,
        verifiedAppointmentId,
        req.file.originalname,
        relativeFilePath,
        req.file.size,
        diagnosis || null,
        instructions || null,
        JSON.stringify(medications)
      ]
    );

    const prescription = insertRes.rows[0];

    // Fetch doctor name for notification
    const docUserRes = await query(`SELECT name FROM users WHERE id = $1`, [doctorUserId]);
    const doctorName = docUserRes.rows[0]?.name || 'Your Doctor';

    // Send notification to patient
    await createNotification({
      userId: actualPatientUserId,
      title: 'New Prescription Uploaded',
      message: `Dr. ${doctorName} uploaded prescription #${prescriptionNumber} for your consultation.`,
      type: 'prescription',
      link: '/prescriptions'
    });

    return res.status(201).json({
      message: 'Prescription uploaded successfully',
      prescription
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/prescriptions/my
 * Get all prescriptions for the logged-in patient
 */
const getMyPrescriptions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isDoctor = (req.user.role || '').toLowerCase() === 'doctor';

    let queryText;
    if (isDoctor) {
      queryText = `
        SELECT pr.id, pr.prescription_number as "prescriptionNumber", pr.doctor_id as "doctorId", pr.patient_id as "patientId",
               pr.appointment_id as "appointmentId", pr.file_name as "fileName", pr.file_path as "filePath", pr.file_size as "fileSize",
               pr.diagnosis, pr.instructions, pr.medications, pr.uploaded_at as "uploadedAt",
               pat.name as "patientName", pat.patient_id as "patientCode", pat.age as "patientAge", pat.gender as "patientGender",
               a.appointment_number as "appointmentNumber", a.appointment_date as "appointmentDate"
        FROM prescriptions pr
        JOIN users pat ON pr.patient_id = pat.id
        LEFT JOIN appointments a ON pr.appointment_id = a.id
        WHERE pr.doctor_id = $1
        ORDER BY pr.uploaded_at DESC
      `;
    } else {
      queryText = `
        SELECT pr.id, pr.prescription_number as "prescriptionNumber", pr.doctor_id as "doctorId", pr.patient_id as "patientId",
               pr.appointment_id as "appointmentId", pr.file_name as "fileName", pr.file_path as "filePath", pr.file_size as "fileSize",
               pr.diagnosis, pr.instructions, pr.medications, pr.uploaded_at as "uploadedAt",
               doc.name as "doctorName", doc.doctor_id as "doctorCode", doc.specialization as "doctorSpecialization",
               a.appointment_number as "appointmentNumber", a.appointment_date as "appointmentDate"
        FROM prescriptions pr
        JOIN users doc ON pr.doctor_id = doc.id
        LEFT JOIN appointments a ON pr.appointment_id = a.id
        WHERE pr.patient_id = $1
        ORDER BY pr.uploaded_at DESC
      `;
    }

    const result = await query(queryText, [userId]);

    return res.status(200).json({
      prescriptions: result.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/prescriptions/patient/:patientId
 * Doctor views prescriptions for a specific patient
 */
const getPatientPrescriptions = async (req, res, next) => {
  try {
    const doctorUserId = req.user.id;
    const { patientId } = req.params;

    const result = await query(
      `SELECT pr.id, pr.prescription_number as "prescriptionNumber", pr.doctor_id as "doctorId", pr.patient_id as "patientId",
              pr.appointment_id as "appointmentId", pr.file_name as "fileName", pr.file_path as "filePath", pr.file_size as "fileSize",
              pr.diagnosis, pr.instructions, pr.medications, pr.uploaded_at as "uploadedAt",
              doc.name as "doctorName",
              a.appointment_number as "appointmentNumber", a.appointment_date as "appointmentDate"
       FROM prescriptions pr
       JOIN users pat ON pr.patient_id = pat.id
       JOIN users doc ON pr.doctor_id = doc.id
       LEFT JOIN appointments a ON pr.appointment_id = a.id
       WHERE (pat.id::text = $1 OR pat.patient_id = $1) AND (pr.doctor_id = $2 OR pat.assigned_doctor_id = (SELECT doctor_id FROM users WHERE id = $2))
       ORDER BY pr.uploaded_at DESC`,
      [patientId, doctorUserId]
    );

    return res.status(200).json({
      prescriptions: result.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/prescriptions/download/:id
 * Secure prescription download with authorization check
 */
const downloadPrescription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `SELECT pr.id, pr.file_name as "fileName", pr.file_path as "filePath", pr.doctor_id as "doctorId", pr.patient_id as "patientId"
       FROM prescriptions pr
       WHERE pr.id::text = $1 OR pr.prescription_number = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Prescription not found.' } });
    }

    const item = result.rows[0];

    // Authorization check: must be either the prescribing doctor or the patient
    if (item.doctorId !== userId && item.patientId !== userId) {
      return res.status(403).json({ error: { message: 'Access denied to this prescription file.' } });
    }

    const cleanRelPath = item.filePath.replace(/^\//, '');
    const absoluteFilePath = path.join(__dirname, '..', cleanRelPath);

    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).json({ error: { message: 'Prescription file not found on disk.' } });
    }

    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(item.fileName)}"`);
    res.setHeader('Content-Type', 'application/pdf');
    return fs.createReadStream(absoluteFilePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadPrescription,
  getMyPrescriptions,
  getPatientPrescriptions,
  downloadPrescription
};
