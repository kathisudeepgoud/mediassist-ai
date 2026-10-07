const { query } = require('../config/db');
const { createNotification } = require('../services/notification.service');

/**
 * Generate unique appointment number like APT1024
 */
const generateAppointmentNumber = async () => {
  const result = await query(
    `SELECT appointment_number FROM appointments WHERE appointment_number ~ '^APT[0-9]+$'`
  );
  let maxNum = 1000;
  for (const row of result.rows) {
    const val = row.appointment_number;
    if (val) {
      const num = parseInt(val.replace('APT', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return `APT${maxNum + 1}`;
};

/**
 * GET /api/appointments/doctors
 * Get list of available doctors for patient discovery
 */
const getAvailableDoctors = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, doctor_id as "doctorId", specialization, 
              hospital_name as "hospitalName", qualification, medical_license as "medicalLicense",
              clinic_address as "clinicAddress", consultation_fee as "consultationFee", 
              experience_years as "experienceYears", bio, availability, photo_url as "photoUrl"
       FROM users
       WHERE role = 'doctor'
       ORDER BY name ASC`
    );

    return res.status(200).json({
      doctors: result.rows.map((d) => ({
        ...d,
        consultationFee: Number(d.consultationFee || 500),
        availability: Array.isArray(d.availability)
          ? d.availability
          : ['09:00 AM', '10:30 AM', '11:45 AM', '02:00 PM', '03:30 PM', '05:00 PM']
      }))
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/appointments/doctors/:doctorId
 * Get single doctor profile with available time slots for a given date
 */
const getDoctorDetails = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    const docRes = await query(
      `SELECT id, name, email, doctor_id as "doctorId", specialization, 
              clinic_address as "clinicAddress", consultation_fee as "consultationFee", 
              experience_years as "experienceYears", bio, availability, photo_url as "photoUrl"
       FROM users
       WHERE (id::text = $1 OR doctor_id = $1) AND role = 'doctor'`,
      [doctorId]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Doctor not found.' } });
    }

    const doctor = docRes.rows[0];
    doctor.consultationFee = Number(doctor.consultationFee || 500);
    const standardSlots = Array.isArray(doctor.availability)
      ? doctor.availability
      : ['09:00 AM', '10:30 AM', '11:45 AM', '02:00 PM', '03:30 PM', '05:00 PM'];

    // Check booked slots for this date
    let bookedSlots = [];
    if (date) {
      const bookedRes = await query(
        `SELECT appointment_time FROM appointments
         WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_status NOT IN ('cancelled')`,
        [doctor.id, date]
      );
      bookedSlots = bookedRes.rows.map((r) => r.appointment_time);
    }

    const availableSlots = standardSlots.map((slot) => ({
      time: slot,
      isAvailable: !bookedSlots.includes(slot)
    }));

    return res.status(200).json({
      doctor,
      slots: availableSlots
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/appointments/book
 * Book an appointment with dummy Razorpay payment integration
 */
const bookAppointment = async (req, res, next) => {
  try {
    const patientId = req.user.id;
    const {
      doctorId,
      appointmentDate,
      appointmentTime,
      appointmentType,
      reason,
      fee = 500,
      paymentMethod = 'card',
      paymentReference
    } = req.body;

    if (!doctorId || !appointmentDate || !appointmentTime || !appointmentType) {
      return res.status(400).json({
        error: { message: 'Doctor, appointment date, time, and consultation type are required.' }
      });
    }

    const cleanType = String(appointmentType).toLowerCase();
    if (!['online', 'offline'].includes(cleanType)) {
      return res.status(400).json({
        error: { message: 'Consultation type must be either online or offline.' }
      });
    }

    // Verify doctor exists
    const docRes = await query(
      `SELECT id, name, doctor_id as "doctorId", clinic_address as "clinicAddress", consultation_fee as "consultationFee"
       FROM users
       WHERE (id::text = $1 OR doctor_id = $1) AND role = 'doctor'`,
      [doctorId]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Selected doctor not found.' } });
    }

    const doctor = docRes.rows[0];
    const actualDoctorUserId = doctor.id;

    // Check double booking for same doctor at same date/time
    const conflictRes = await query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3 AND appointment_status NOT IN ('cancelled')`,
      [actualDoctorUserId, appointmentDate, appointmentTime]
    );

    if (conflictRes.rows.length > 0) {
      return res.status(409).json({
        error: { message: 'This time slot is already booked. Please choose another time.' }
      });
    }

    // Generate appointment number
    const apptNumber = await generateAppointmentNumber();

    // Meeting link for online consultation
    const meetingLink =
      cleanType === 'online'
        ? `/consultation/${apptNumber.toLowerCase()}`
        : null;

    const clinicAddress =
      cleanType === 'offline'
        ? doctor.clinicAddress || 'MedAssist Health Center, Suite 302, Medical City'
        : null;

    // Create Appointment
    const apptRes = await query(
      `INSERT INTO appointments 
       (appointment_number, doctor_id, patient_id, appointment_date, appointment_time, appointment_type, reason, fee, payment_status, appointment_status, meeting_link, clinic_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'successful', 'confirmed', $9, $10)
       RETURNING id, appointment_number as "appointmentNumber", doctor_id as "doctorId", patient_id as "patientId",
                 appointment_date as "appointmentDate", appointment_time as "appointmentTime", 
                 appointment_type as "appointmentType", reason, fee, payment_status as "paymentStatus", 
                 appointment_status as "appointmentStatus", meeting_link as "meetingLink", clinic_address as "clinicAddress",
                 created_at as "createdAt"`,
      [
        apptNumber,
        actualDoctorUserId,
        patientId,
        appointmentDate,
        appointmentTime,
        cleanType,
        reason || 'General Consultation',
        fee || doctor.consultationFee || 500,
        meetingLink,
        clinicAddress
      ]
    );

    const newAppointment = apptRes.rows[0];

    // Create Payment record (Dummy Razorpay flow)
    const dummyPaymentRef =
      paymentReference || `pay_test_${Math.random().toString(36).substring(2, 10)}${Date.now().toString().slice(-4)}`;

    const payRes = await query(
      `INSERT INTO payments
       (appointment_id, patient_id, amount, payment_provider, payment_reference, payment_status, payment_method)
       VALUES ($1, $2, $3, 'razorpay', $4, 'successful', $5)
       RETURNING id, appointment_id as "appointmentId", amount, payment_provider as "paymentProvider",
                 payment_reference as "paymentReference", payment_status as "paymentStatus", payment_method as "paymentMethod", created_at as "createdAt"`,
      [newAppointment.id, patientId, fee || 500, dummyPaymentRef, paymentMethod]
    );

    const payment = payRes.rows[0];

    // Ensure persistent doctor-patient relationship in doctor_patients table
    await query(
      `INSERT INTO doctor_patients (doctor_id, patient_id, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (doctor_id, patient_id) DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP`,
      [actualDoctorUserId, patientId]
    );

    // Fetch patient name
    const patientUserRes = await query(`SELECT name, patient_id as "patientId" FROM users WHERE id = $1`, [patientId]);
    const patientName = patientUserRes.rows[0]?.name || 'Patient';

    // Send notifications
    await createNotification({
      userId: patientId,
      title: 'Appointment Confirmed',
      message: `Your ${cleanType.toUpperCase()} appointment #${apptNumber} with Dr. ${doctor.name} is confirmed for ${appointmentDate} at ${appointmentTime}.`,
      type: 'appointment',
      link: '/appointments'
    });

    await createNotification({
      userId: actualDoctorUserId,
      title: 'New Appointment Booked',
      message: `${patientName} booked a new ${cleanType.toUpperCase()} appointment #${apptNumber} on ${appointmentDate} at ${appointmentTime}.`,
      type: 'appointment',
      link: '/doctor-dashboard?tab=appointments'
    });

    return res.status(201).json({
      message: 'Appointment booked and confirmed successfully',
      appointment: {
        ...newAppointment,
        doctor: {
          id: doctor.id,
          name: doctor.name,
          doctorId: doctor.doctorId
        }
      },
      payment
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/appointments/my
 * Get appointments list for logged-in patient or doctor
 */
const getMyAppointments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isDoctor = (req.user.role || '').toLowerCase() === 'doctor';

    const { status, type, date } = req.query;

    let queryText;
    let params = [userId];

    if (isDoctor) {
      queryText = `
        SELECT a.id, a.appointment_number as "appointmentNumber", a.doctor_id as "doctorId", a.patient_id as "patientId",
               a.appointment_date as "appointmentDate", a.appointment_time as "appointmentTime", 
               a.appointment_type as "appointmentType", a.reason, a.fee, a.payment_status as "paymentStatus", 
               a.appointment_status as "appointmentStatus", a.meeting_link as "meetingLink", a.clinic_address as "clinicAddress",
               a.doctor_notes as "doctorNotes", a.created_at as "createdAt",
               u.name as "patientName", u.email as "patientEmail", u.phone as "patientPhone", 
               u.patient_id as "patientCode", u.age as "patientAge", u.gender as "patientGender",
               pr.id as "prescriptionId", pr.file_name as "prescriptionFileName", pr.file_path as "prescriptionFilePath"
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        LEFT JOIN prescriptions pr ON pr.appointment_id = a.id
        WHERE a.doctor_id = $1
      `;
    } else {
      queryText = `
        SELECT a.id, a.appointment_number as "appointmentNumber", a.doctor_id as "doctorId", a.patient_id as "patientId",
               a.appointment_date as "appointmentDate", a.appointment_time as "appointmentTime", 
               a.appointment_type as "appointmentType", a.reason, a.fee, a.payment_status as "paymentStatus", 
               a.appointment_status as "appointmentStatus", a.meeting_link as "meetingLink", a.clinic_address as "clinicAddress",
               a.doctor_notes as "doctorNotes", a.created_at as "createdAt",
               d.name as "doctorName", d.email as "doctorEmail", d.phone as "doctorPhone", 
               d.doctor_id as "doctorCode", d.specialization as "doctorSpecialization",
               pr.id as "prescriptionId", pr.file_name as "prescriptionFileName", pr.file_path as "prescriptionFilePath"
        FROM appointments a
        JOIN users d ON a.doctor_id = d.id
        LEFT JOIN prescriptions pr ON pr.appointment_id = a.id
        WHERE a.patient_id = $1
      `;
    }

    if (status && status !== 'ALL') {
      params.push(status.toLowerCase());
      queryText += ` AND LOWER(a.appointment_status) = $${params.length}`;
    }

    if (type && type !== 'ALL') {
      params.push(type.toLowerCase());
      queryText += ` AND LOWER(a.appointment_type) = $${params.length}`;
    }

    if (date) {
      params.push(date);
      queryText += ` AND a.appointment_date = $${params.length}`;
    }

    queryText += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC`;

    const result = await query(queryText, params);

    return res.status(200).json({
      appointments: result.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/appointments/:id
 * Get single appointment detail
 */
const getAppointmentById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `SELECT a.id, a.appointment_number as "appointmentNumber", a.doctor_id as "doctorId", a.patient_id as "patientId",
              a.appointment_date as "appointmentDate", a.appointment_time as "appointmentTime", 
              a.appointment_type as "appointmentType", a.reason, a.fee, a.payment_status as "paymentStatus", 
              a.appointment_status as "appointmentStatus", a.meeting_link as "meetingLink", a.clinic_address as "clinicAddress",
              a.doctor_notes as "doctorNotes", a.created_at as "createdAt",
              doc.name as "doctorName", doc.doctor_id as "doctorCode", doc.specialization as "doctorSpecialization",
              pat.name as "patientName", pat.patient_id as "patientCode", pat.age as "patientAge", pat.gender as "patientGender",
              pr.id as "prescriptionId", pr.file_name as "prescriptionFileName", pr.file_path as "prescriptionFilePath", pr.diagnosis, pr.instructions
       FROM appointments a
       JOIN users doc ON a.doctor_id = doc.id
       JOIN users pat ON a.patient_id = pat.id
       LEFT JOIN prescriptions pr ON pr.appointment_id = a.id
       WHERE (a.id::text = $1 OR a.appointment_number = $1) AND (a.doctor_id = $2 OR a.patient_id = $2)`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Appointment not found or access denied.' } });
    }

    return res.status(200).json({ appointment: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/appointments/:id/status
 * Update appointment status (Doctor can complete/cancel, Patient can cancel)
 */
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isDoctor = (req.user.role || '').toLowerCase() === 'doctor';
    const { id } = req.params;
    const { status, doctorNotes } = req.body;

    const cleanStatus = (status || '').toString().toLowerCase().trim();
    if (!['confirmed', 'completed', 'cancelled'].includes(cleanStatus)) {
      return res.status(400).json({
        error: { message: 'Invalid status. Allowed values are confirmed, completed, cancelled.' }
      });
    }

    // Verify appointment ownership
    const apptCheck = await query(
      `SELECT a.*, doc.name as "doctorName", pat.name as "patientName" 
       FROM appointments a
       JOIN users doc ON a.doctor_id = doc.id
       JOIN users pat ON a.patient_id = pat.id
       WHERE a.id::text = $1 OR a.appointment_number = $1`,
      [id]
    );

    if (apptCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Appointment not found.' } });
    }

    const appt = apptCheck.rows[0];

    // Authorization: only the involved doctor or patient can update
    if (appt.doctor_id !== userId && appt.patient_id !== userId) {
      return res.status(403).json({ error: { message: 'Access denied to this appointment.' } });
    }

    // Patient can only cancel
    if (!isDoctor && cleanStatus !== 'cancelled') {
      return res.status(403).json({ error: { message: 'Patients are only permitted to cancel appointments.' } });
    }

    const updateRes = await query(
      `UPDATE appointments
       SET appointment_status = $1,
           doctor_notes = COALESCE($2, doctor_notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, appointment_number as "appointmentNumber", doctor_id as "doctorId", patient_id as "patientId",
                 appointment_date as "appointmentDate", appointment_time as "appointmentTime", 
                 appointment_type as "appointmentType", appointment_status as "appointmentStatus", 
                 doctor_notes as "doctorNotes", updated_at as "updatedAt"`,
      [cleanStatus, doctorNotes || null, appt.id]
    );

    const updated = updateRes.rows[0];

    // Notifications
    if (cleanStatus === 'completed') {
      await createNotification({
        userId: appt.patient_id,
        title: 'Appointment Completed',
        message: `Your consultation #${appt.appointment_number} with Dr. ${appt.doctorName} has been marked as completed.`,
        type: 'appointment',
        link: '/appointments'
      });
    } else if (cleanStatus === 'cancelled') {
      const notifyUserId = isDoctor ? appt.patient_id : appt.doctor_id;
      const cancelledBy = isDoctor ? `Dr. ${appt.doctorName}` : appt.patientName;
      await createNotification({
        userId: notifyUserId,
        title: 'Appointment Cancelled',
        message: `Appointment #${appt.appointment_number} has been cancelled by ${cancelledBy}.`,
        type: 'appointment',
        link: isDoctor ? '/appointments' : '/doctor-dashboard?tab=appointments'
      });
    }

    return res.status(200).json({
      message: `Appointment status updated to ${cleanStatus}`,
      appointment: updated
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAvailableDoctors,
  getDoctorDetails,
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  updateAppointmentStatus
};
