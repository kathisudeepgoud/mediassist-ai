const { query } = require('../config/db');
const { fetchPatientTrends } = require('./report.controller');
const { createNotification } = require('../services/notification.service');

/**
 * Helper to calculate deterministic Disease Risk assessment based on patient vitals
 */
const calculateDiseaseRisksForPatient = (rawVitals) => {
  if (!rawVitals || rawVitals.length === 0) {
    return [];
  }

  let fastingSugar = null;
  let cholesterol = null;
  let bpSystolic = null;
  let creatinine = null;

  for (const v of rawVitals) {
    const lbl = (v.label || '').toLowerCase();
    const val = typeof v.value === 'number' ? v.value : parseFloat(String(v.value).replace(/[^0-9\.]/g, ''));
    if (!isNaN(val) && val > 0) {
      if (/sugar|glucose|fbs/i.test(lbl) && !/hba1c|glycated/i.test(lbl) && fastingSugar === null) fastingSugar = val;
      if (/cholesterol|lipid|ldl/i.test(lbl) && cholesterol === null) cholesterol = val;
      if (/pressure|bp|systolic/i.test(lbl) && bpSystolic === null) bpSystolic = val;
      if (/creatinine|bun/i.test(lbl) && creatinine === null) creatinine = val;
    }
  }

  const results = [];

  // Diabetes Risk
  if (fastingSugar !== null) {
    let diabetesPct = 15;
    let diabetesStatus = 'Low';
    let diabetesExp = 'Fasting blood sugar and glycemic markers are within healthy reference ranges.';
    if (fastingSugar > 125) {
      diabetesPct = 78;
      diabetesStatus = 'High';
      diabetesExp = `Fasting glucose reading of ${fastingSugar} mg/dL is elevated above normal threshold.`;
    } else if (fastingSugar > 100) {
      diabetesPct = 42;
      diabetesStatus = 'Moderate';
      diabetesExp = `Fasting blood sugar of ${fastingSugar} mg/dL is in the borderline pre-diabetic range.`;
    }
    results.push({
      id: 'diabetes',
      name: 'Diabetes Risk',
      percentage: diabetesPct,
      status: diabetesStatus,
      explanation: diabetesExp,
      suggestions: [
        'Reduce refined carbohydrates and added sugars',
        'Incorporate 30 minutes of moderate aerobic exercise daily',
        'Recheck blood glucose level quarterly'
      ]
    });
  } else {
    results.push({
      id: 'diabetes',
      name: 'Diabetes Risk',
      percentage: null,
      status: 'Insufficient Data',
      explanation: 'Additional blood glucose measurements are required to calculate this risk.',
      suggestions: ['Check fasting blood sugar.']
    });
  }

  // Heart Disease Risk
  if (cholesterol !== null) {
    let heartPct = 18;
    let heartStatus = 'Low';
    let heartExp = 'Lipid profile is within recommended ranges.';
    if (cholesterol > 240) {
      heartPct = 72;
      heartStatus = 'High';
      heartExp = `Total cholesterol reading of ${cholesterol} mg/dL indicates high risk of lipid build-up.`;
    } else if (cholesterol > 200) {
      heartPct = 38;
      heartStatus = 'Moderate';
      heartExp = `Total cholesterol reading of ${cholesterol} mg/dL is moderately elevated.`;
    }
    results.push({
      id: 'heart',
      name: 'Heart Disease Risk',
      percentage: heartPct,
      status: heartStatus,
      explanation: heartExp,
      suggestions: [
        'Maintain low saturated fat and trans fat diet',
        'Increase intake of omega-3 fatty acids',
        'Schedule regular cardiovascular screening'
      ]
    });
  } else {
    results.push({
      id: 'heart',
      name: 'Heart Disease Risk',
      percentage: null,
      status: 'Insufficient Data',
      explanation: 'Additional cholesterol measurements are required to calculate this risk.',
      suggestions: ['Check lipid profile.']
    });
  }

  // Kidney Disease Risk
  if (creatinine !== null) {
    let kidneyPct = 12;
    let kidneyStatus = 'Low';
    let kidneyExp = 'Kidney filtration markers from lab panels show normal renal function.';
    if (creatinine > 1.4) {
      kidneyPct = 65;
      kidneyStatus = 'High';
      kidneyExp = `Serum creatinine reading of ${creatinine} mg/dL is above normal threshold.`;
    } else if (creatinine > 1.2) {
      kidneyPct = 32;
      kidneyStatus = 'Moderate';
      kidneyExp = `Creatinine level of ${creatinine} mg/dL is slightly elevated; monitoring recommended.`;
    }
    results.push({
      id: 'kidney',
      name: 'Kidney Disease Risk',
      percentage: kidneyPct,
      status: kidneyStatus,
      explanation: kidneyExp,
      suggestions: [
        'Maintain hydration with at least 2.5L water daily',
        'Monitor sodium and protein intake',
        'Avoid over-the-counter NSAIDs'
      ]
    });
  } else {
    results.push({
      id: 'kidney',
      name: 'Kidney Disease Risk',
      percentage: null,
      status: 'Insufficient Data',
      explanation: 'Additional renal measurements are required to calculate this risk.',
      suggestions: ['Check serum creatinine.']
    });
  }

  // Hypertension Risk
  if (bpSystolic !== null) {
    let hypPct = 14;
    let hypStatus = 'Low';
    let hypExp = 'Blood pressure readings consistently sit within healthy physiological range.';
    if (bpSystolic > 140) {
      hypPct = 80;
      hypStatus = 'High';
      hypExp = `Systolic blood pressure reading of ${bpSystolic} mmHg exceeds stage 1 hypertension threshold.`;
    } else if (bpSystolic > 120) {
      hypPct = 36;
      hypStatus = 'Moderate';
      hypExp = `Systolic blood pressure of ${bpSystolic} mmHg is in the elevated range.`;
    }
    results.push({
      id: 'hypertension',
      name: 'Hypertension Risk',
      percentage: hypPct,
      status: hypStatus,
      explanation: hypExp,
      suggestions: [
        'Limit daily sodium intake to under 2,000 mg',
        'Practice stress management and sleep hygiene',
        'Monitor resting blood pressure weekly'
      ]
    });
  } else {
    results.push({
      id: 'hypertension',
      name: 'Hypertension Risk',
      percentage: null,
      status: 'Insufficient Data',
      explanation: 'Additional blood pressure readings are required to calculate this risk.',
      suggestions: ['Record blood pressure readings.']
    });
  }

  return results;
};

/**
 * GET /api/doctor/stats
 * Get Doctor Dashboard statistics strictly filtered for the currently logged-in doctor
 */
const getDoctorStats = async (req, res, next) => {
  try {
    const doctorUserId = req.user.id;
    let doctorId = req.user.doctorId;
    if (!doctorId) {
      const docRes = await query('SELECT doctor_id FROM users WHERE id = $1', [doctorUserId]);
      doctorId = docRes.rows[0]?.doctor_id || null;
    }

    if (!doctorId) {
      return res.status(403).json({ error: { message: 'Doctor ID missing from authenticated user session.' } });
    }

    // 1. Total Patients in doctor_patients or assigned
    const totalPatientsRes = await query(
      `SELECT COUNT(DISTINCT p.id)::int as count 
       FROM users p
       LEFT JOIN doctor_patients dp ON dp.patient_id = p.id AND dp.doctor_id = $1 AND dp.status = 'active'
       WHERE (dp.id IS NOT NULL OR UPPER(p.assigned_doctor_id) = UPPER($2)) AND p.role = 'patient'`,
      [doctorUserId, doctorId]
    );
    const totalPatients = totalPatientsRes.rows[0]?.count || 0;

    // 2. High-Risk Patients
    const highRiskRes = await query(
      `SELECT COUNT(DISTINCT a.user_id)::int as count
       FROM patient_alerts a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN doctor_patients dp ON dp.patient_id = u.id AND dp.doctor_id = $1 AND dp.status = 'active'
       WHERE (a.doctor_id = $2 OR u.assigned_doctor_id = $2 OR dp.id IS NOT NULL) AND a.risk_level = 'HIGH'`,
      [doctorUserId, doctorId]
    );
    const highRiskPatients = highRiskRes.rows[0]?.count || 0;

    // 3. New Alerts
    const newAlertsRes = await query(
      `SELECT COUNT(*)::int as count
       FROM patient_alerts a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN doctor_patients dp ON dp.patient_id = u.id AND dp.doctor_id = $1 AND dp.status = 'active'
       WHERE (a.doctor_id = $2 OR u.assigned_doctor_id = $2 OR dp.id IS NOT NULL) AND a.status = 'NEW'`,
      [doctorUserId, doctorId]
    );
    const newAlerts = newAlertsRes.rows[0]?.count || 0;

    // 4. Upcoming Appointments Count
    const upcomingApptsRes = await query(
      `SELECT COUNT(*)::int as count 
       FROM appointments 
       WHERE doctor_id = $1 AND appointment_status IN ('confirmed', 'pending') AND appointment_date >= CURRENT_DATE`,
      [doctorUserId]
    );
    const upcomingAppointments = upcomingApptsRes.rows[0]?.count || 0;

    return res.status(200).json({
      doctorId,
      totalPatients,
      highRiskPatients,
      newAlerts,
      upcomingAppointments
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctor/patients
 * Fetch persistent list of patients associated with the logged-in doctor
 */
const getDoctorPatients = async (req, res, next) => {
  try {
    const doctorUserId = req.user.id;
    const doctorId = req.user.doctorId;
    const search = (req.query.search || '').trim().toLowerCase();

    let queryText = `
      SELECT DISTINCT p.id, p.name, p.email, p.patient_id as "patientId", p.phone, p.age, p.gender, 
                      p.blood_group as "bloodGroup", p.photo_url as "photoUrl",
                      COALESCE(dp.status, 'active') as "relationshipStatus",
                      COALESCE(dp.added_at, p.created_at) as "addedAt",
                      COALESCE(dp.reason, 'Assigned Patient') as "relationshipReason",
                      (
                        SELECT a.appointment_date 
                        FROM appointments a 
                        WHERE a.patient_id = p.id AND a.doctor_id = $1 
                        ORDER BY a.appointment_date DESC 
                        LIMIT 1
                      ) as "lastAppointmentDate",
                      (
                        SELECT r.report_date 
                        FROM medical_reports r 
                        WHERE r.user_id = p.id 
                        ORDER BY r.report_date DESC 
                        LIMIT 1
                      ) as "lastReportDate"
      FROM users p
      LEFT JOIN doctor_patients dp ON dp.patient_id = p.id AND dp.doctor_id = $1
      WHERE (dp.doctor_id = $1 OR UPPER(p.assigned_doctor_id) = UPPER($2))
        AND p.role = 'patient'
        AND (dp.status IS NULL OR dp.status = 'active')
    `;

    const params = [doctorUserId, doctorId || 'D000001'];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (LOWER(p.name) LIKE $${params.length} OR LOWER(p.patient_id) LIKE $${params.length} OR LOWER(p.email) LIKE $${params.length})`;
    }

    queryText += ` ORDER BY p.name ASC`;

    const result = await query(queryText, params);

    return res.status(200).json({
      patients: result.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/doctor/patients
 * Permanently add a patient to the doctor's My Patients list
 */
const addPatientToDoctor = async (req, res, next) => {
  try {
    const doctorUserId = req.user.id;
    const { patientId, reason } = req.body;

    if (!patientId || !patientId.trim()) {
      return res.status(400).json({ error: { message: 'Patient ID or email is required.' } });
    }

    const cleanInput = patientId.trim();

    // 1. Verify that the patient account exists and has role 'patient'
    const patRes = await query(
      `SELECT id, name, email, patient_id as "patientId", age, gender, phone, blood_group as "bloodGroup"
       FROM users
       WHERE (LOWER(patient_id) = LOWER($1) OR LOWER(email) = LOWER($1) OR id::text = $1)
         AND role = 'patient'`,
      [cleanInput]
    );

    if (patRes.rows.length === 0) {
      return res.status(404).json({
        error: { message: `No verified patient account found matching "${cleanInput}".` }
      });
    }

    const patient = patRes.rows[0];

    // 2. Check if relationship already exists
    const existingRel = await query(
      `SELECT id, status FROM doctor_patients WHERE doctor_id = $1 AND patient_id = $2`,
      [doctorUserId, patient.id]
    );

    if (existingRel.rows.length > 0 && existingRel.rows[0].status === 'active') {
      return res.status(409).json({
        error: { message: `Patient ${patient.name} (${patient.patientId}) is already in your My Patients list.` }
      });
    }

    // 3. Insert or reactivate relationship
    const insertRes = await query(
      `INSERT INTO doctor_patients (doctor_id, patient_id, status, reason)
       VALUES ($1, $2, 'active', $3)
       ON CONFLICT (doctor_id, patient_id) 
       DO UPDATE SET status = 'active', reason = COALESCE($3, doctor_patients.reason), updated_at = CURRENT_TIMESTAMP
       RETURNING id, doctor_id as "doctorId", patient_id as "patientId", status, reason, added_at as "addedAt", updated_at as "updatedAt"`,
      [doctorUserId, patient.id, reason || 'Added by Doctor']
    );

    // 4. Send notification to patient
    const docRes = await query(`SELECT name FROM users WHERE id = $1`, [doctorUserId]);
    const doctorName = docRes.rows[0]?.name || 'Doctor';

    await createNotification({
      userId: patient.id,
      title: 'Doctor Associated',
      message: `Dr. ${doctorName} has added you to their clinical patient care list.`,
      type: 'doctor',
      link: '/dashboard'
    });

    return res.status(201).json({
      message: `Patient ${patient.name} (${patient.patientId}) successfully added to your patients.`,
      relationship: insertRes.rows[0],
      patient
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/doctor/patients/:patientId
 * Deactivate patient relationship
 */
const removePatientFromDoctor = async (req, res, next) => {
  try {
    const doctorUserId = req.user.id;
    const { patientId } = req.params;

    const patRes = await query(
      `SELECT id FROM users WHERE (id::text = $1 OR patient_id = $1) AND role = 'patient'`,
      [patientId]
    );

    if (patRes.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Patient not found.' } });
    }

    const patientActualId = patRes.rows[0].id;

    await query(
      `UPDATE doctor_patients SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE doctor_id = $1 AND patient_id = $2`,
      [doctorUserId, patientActualId]
    );

    return res.status(200).json({ message: 'Patient relationship removed successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctor/patient/:patientId
 * Complete Patient Profile for Doctor (Strictly authorized)
 */
const getDoctorPatientProfile = async (req, res, next) => {
  try {
    const doctorUserId = req.user.id;
    let doctorId = req.user.doctorId;
    if (!doctorId) {
      const docRes = await query('SELECT doctor_id FROM users WHERE id = $1', [doctorUserId]);
      doctorId = docRes.rows[0]?.doctor_id || null;
    }

    const rawPatientId = (req.params.patientId || req.query.patientId || '').toString().trim();

    if (!rawPatientId) {
      return res.status(400).json({ error: { message: 'Patient ID is required.' } });
    }

    // 1. Search patient in database
    const patientResult = await query(
      `SELECT id, name, email, role, patient_id as "patientId", assigned_doctor_id as "assignedDoctorId", phone, age, gender, 
              blood_group as "bloodGroup", height_cm as "heightCm", weight_kg as "weightKg", 
              smoking_habit as "smokingHabit", activity_level as "activityLevel", dietary_preference as "dietaryPreference",
              allergies, existing_conditions as "existingConditions", photo_url as "photoUrl", created_at as "createdAt"
       FROM users 
       WHERE (LOWER(patient_id) = LOWER($1) OR id::text = $1) AND role = 'patient'`,
      [rawPatientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Patient record not found.' }
      });
    }

    const patient = patientResult.rows[0];

    // 2. Strict Authorization Check: Must be in doctor_patients, assigned_doctor_id, or have appointment
    const relCheck = await query(
      `SELECT id FROM doctor_patients WHERE doctor_id = $1 AND patient_id = $2 AND status = 'active'
       UNION
       SELECT id FROM appointments WHERE doctor_id = $1 AND patient_id = $2
       LIMIT 1`,
      [doctorUserId, patient.id]
    );

    const isAssigned = patient.assignedDoctorId && doctorId && patient.assignedDoctorId.toUpperCase() === doctorId.toUpperCase();

    if (relCheck.rows.length === 0 && !isAssigned) {
      return res.status(403).json({
        error: { message: 'Access denied. You are not authorized to view this patient profile.' }
      });
    }

    // Ensure relationship exists in doctor_patients
    if (relCheck.rows.length === 0 && isAssigned) {
      await query(
        `INSERT INTO doctor_patients (doctor_id, patient_id, status)
         VALUES ($1, $2, 'active')
         ON CONFLICT (doctor_id, patient_id) DO NOTHING`,
        [doctorUserId, patient.id]
      ).catch(() => {});
    }

    // 3. Fetch medical reports uploaded by this patient
    const reportsResult = await query(
      `SELECT id, user_id as "userId", patient_name as "patientName", age, gender, 
              report_date as "reportDate", hospital, doctor, type, summary, 
              key_findings as "keyFindings", file_type as "fileType", file_url as "fileUrl", 
              source, extracted_text as "extractedText", original_filename as "originalFilename",
              created_at as "createdAt"
       FROM medical_reports 
       WHERE user_id = $1 
       ORDER BY report_date DESC, created_at DESC`,
      [patient.id]
    );

    const reports = reportsResult.rows;

    // Attach vitals to each report separately
    let allVitals = [];
    for (const r of reports) {
      const vitalsRes = await query(
        `SELECT id, label, value, unit, status, reference_range as "referenceRange", source, raw_value as "rawValue"
         FROM vital_readings 
         WHERE report_id = $1`,
        [r.id]
      );
      r.vitals = vitalsRes.rows.map((row) => {
        if (row.rawValue && String(row.value) !== row.rawValue) {
          row.value = row.rawValue;
        }
        return row;
      });
      allVitals = allVitals.concat(r.vitals);
    }

    // 4. Fetch dynamic longitudinal health trends from database
    const trends = await fetchPatientTrends(patient.id);

    // 5. Calculate dynamic disease risk evaluation using existing ML predictions
    let diseaseRisks = [];
    try {
      const { calculateDiseaseRisks } = require('./report.controller');
      const riskResult = await calculateDiseaseRisks(patient.id);
      const rawRisks = Array.isArray(riskResult) ? riskResult : (riskResult?.diseaseRisks || []);
      diseaseRisks = rawRisks.map((dr) => {
        const pct = dr.percentage ?? (dr.probability !== undefined && dr.probability !== null ? Math.round(dr.probability * 100) : null);
        const prob = dr.probability !== undefined && dr.probability !== null ? dr.probability : (pct !== null ? pct / 100 : 0.15);
        return {
          id: dr.id || (dr.disease || dr.name || '').toLowerCase().replace(/\s+/g, '-'),
          disease: dr.name || dr.disease || 'Risk Assessment',
          name: dr.name || dr.disease || 'Risk Assessment',
          percentage: pct,
          probability: prob,
          status: dr.status || dr.risk_level || (pct && pct >= 60 ? 'High' : pct && pct >= 30 ? 'Moderate' : 'Low'),
          risk_level: dr.status || dr.risk_level || (pct && pct >= 60 ? 'High' : pct && pct >= 30 ? 'Moderate' : 'Low'),
          explanation: dr.explanation || dr.details || 'Evaluated based on clinical biomarker measurements.',
          suggestions: dr.suggestions || dr.recommendations || ['Maintain regular health checkups and balanced nutrition.']
        };
      });
    } catch (riskErr) {
      console.warn('[Doctor Patient Profile] Risk calculation notice:', riskErr.message);
      diseaseRisks = calculateDiseaseRisksForPatient(allVitals);
    }

    if (diseaseRisks.length === 0 && allVitals.length > 0) {
      diseaseRisks = calculateDiseaseRisksForPatient(allVitals);
    }

    // Extract latest vitals dictionary for quick clinical overview
    const latestVitals = {
      glucose: null,
      hba1c: null,
      bp: null,
      cholesterol: null,
      hemoglobin: null,
      creatinine: null,
      bmi: null
    };

    for (const v of allVitals) {
      const lbl = (v.label || '').toLowerCase();
      const val = v.value;
      if (/sugar|glucose|fbs/i.test(lbl) && !/hba1c/i.test(lbl) && !latestVitals.glucose) latestVitals.glucose = val;
      if (/hba1c|glycated/i.test(lbl) && !latestVitals.hba1c) latestVitals.hba1c = val;
      if (/cholesterol|lipid|ldl/i.test(lbl) && !latestVitals.cholesterol) latestVitals.cholesterol = val;
      if (/pressure|bp|systolic/i.test(lbl) && !latestVitals.bp) latestVitals.bp = val;
      if (/hemoglobin|hb|hgb/i.test(lbl) && !latestVitals.hemoglobin) latestVitals.hemoglobin = val;
      if (/creatinine/i.test(lbl) && !latestVitals.creatinine) latestVitals.creatinine = val;
      if (/bmi/i.test(lbl) && !latestVitals.bmi) latestVitals.bmi = val;
    }

    // 6. Report Summary consolidated
    const latestReport = reports[0] || null;
    const reportSummary = latestReport
      ? {
          latestReportDate: latestReport.reportDate,
          hospital: latestReport.hospital,
          doctor: latestReport.doctor,
          summaryText: latestReport.summary,
          keyFindings: latestReport.keyFindings || []
        }
      : {
          latestReportDate: null,
          summaryText: 'No medical reports uploaded by this patient yet.',
          keyFindings: []
        };

    // 7. Fetch latest active diet plan for patient
    let dietPlan = null;
    try {
      const planRes = await query(
        `SELECT id, user_id as "userId", patient_id as "patientId", generated_at as "generatedAt",
                risk_snapshot as "riskSnapshot", plan_json as "planJson", nutrition_summary as "nutritionSummary",
                reasons_json as "reasonsJson", safety_status as "safetyStatus", warnings, rule_version as "ruleVersion"
         FROM diet_plans 
         WHERE user_id = $1 OR patient_id = $2
         ORDER BY generated_at DESC, created_at DESC 
         LIMIT 1`,
        [patient.id, patient.patientId]
      );
      if (planRes.rows.length > 0) {
        const row = planRes.rows[0];
        const planObj = typeof row.planJson === 'string' ? JSON.parse(row.planJson) : (row.planJson || {});
        dietPlan = {
          planId: row.id,
          generatedAt: row.generatedAt,
          weeklyPlan: planObj.weeklyPlan || [],
          meals: planObj.meals || {},
          weekRange: planObj.weekRange || '',
          dailyNutrition: typeof row.nutritionSummary === 'string' ? JSON.parse(row.nutritionSummary) : (row.nutritionSummary || {}),
          clinicalContext: typeof row.reasonsJson === 'string' ? JSON.parse(row.reasonsJson) : (row.reasonsJson || {}),
          safety: {
            safetyStatus: row.safetyStatus,
            warnings: typeof row.warnings === 'string' ? JSON.parse(row.warnings) : (row.warnings || [])
          },
          ruleVersion: row.ruleVersion
        };
      }
    } catch (dietErr) {
      console.warn('[Doctor Patient Profile] Diet plan query notice:', dietErr.message);
    }

    // 8. Fetch appointments between this doctor and patient
    const apptsRes = await query(
      `SELECT id, appointment_number as "appointmentNumber", appointment_date as "appointmentDate",
              appointment_time as "appointmentTime", appointment_type as "appointmentType", reason, fee,
              payment_status as "paymentStatus", appointment_status as "appointmentStatus", meeting_link as "meetingLink",
              clinic_address as "clinicAddress", doctor_notes as "doctorNotes", created_at as "createdAt"
       FROM appointments
       WHERE doctor_id = $1 AND patient_id = $2
       ORDER BY appointment_date DESC, appointment_time DESC`,
      [doctorUserId, patient.id]
    );

    // 9. Fetch prescriptions uploaded for this patient
    const presRes = await query(
      `SELECT pr.id, pr.prescription_number as "prescriptionNumber", pr.appointment_id as "appointmentId",
              pr.file_name as "fileName", pr.file_path as "filePath", pr.file_size as "fileSize",
              pr.diagnosis, pr.instructions, pr.medications, pr.uploaded_at as "uploadedAt",
              a.appointment_number as "appointmentNumber", a.appointment_date as "appointmentDate"
       FROM prescriptions pr
       LEFT JOIN appointments a ON pr.appointment_id = a.id
       WHERE pr.patient_id = $1 AND pr.doctor_id = $2
       ORDER BY pr.uploaded_at DESC`,
      [patient.id, doctorUserId]
    );

    // 10. Messages summary
    const msgCountRes = await query(
      `SELECT COUNT(*)::int as count FROM messages WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
      [doctorUserId, patient.id]
    );

    return res.status(200).json({
      patient,
      reports,
      latestVitals,
      reportSummary,
      trends,
      diseaseRisks,
      dietPlan,
      appointments: apptsRes.rows,
      prescriptions: presRes.rows,
      messagesCount: msgCountRes.rows[0]?.count || 0
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctor/alerts
 * Fetch High-Risk Patient Alerts for the currently logged-in doctor
 */
const getPatientAlerts = async (req, res, next) => {
  try {
    const doctorUserId = req.user.id;
    let doctorId = req.user.doctorId;
    if (!doctorId) {
      const docRes = await query('SELECT doctor_id FROM users WHERE id = $1', [doctorUserId]);
      doctorId = docRes.rows[0]?.doctor_id || null;
    }

    const filterStatus = (req.query.status || 'ALL').toString().toUpperCase().trim();

    let statusCondition = '';
    const queryParams = [doctorUserId, doctorId || 'D000001'];

    if (filterStatus === 'NEW') {
      statusCondition = 'AND a.status = \'NEW\'';
    } else if (filterStatus === 'REVIEWED') {
      statusCondition = 'AND a.status = \'REVIEWED\'';
    }

    const alertsResult = await query(
      `SELECT DISTINCT a.id, a.alert_id as "alertId", a.patient_id as "patientId", a.user_id as "userId",
              a.doctor_id as "doctorId", a.report_id as "reportId", a.disease,
              a.risk_level as "riskLevel", a.risk_probability as "riskProbability",
              a.status, a.created_at as "createdAt", a.reviewed_at as "reviewedAt",
              u.name as "patientName", u.age, u.gender,
              r.report_date as "reportDate", r.source as "reportSource",
              (CASE WHEN a.status = 'NEW' THEN 0 ELSE 1 END) as "sortPriority"
       FROM patient_alerts a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN doctor_patients dp ON dp.patient_id = u.id AND dp.doctor_id = $1 AND dp.status = 'active'
       LEFT JOIN medical_reports r ON a.report_id = r.id
       WHERE (a.doctor_id = $2 OR u.assigned_doctor_id = $2 OR dp.id IS NOT NULL) ${statusCondition}
       ORDER BY (CASE WHEN a.status = 'NEW' THEN 0 ELSE 1 END), a.created_at DESC`,
      queryParams
    );

    return res.status(200).json({
      alerts: alertsResult.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/doctor/alerts/:alertId/review
 * Mark a Patient Alert as REVIEWED by the logged-in doctor
 */
const markAlertReviewed = async (req, res, next) => {
  try {
    const { alertId } = req.params;

    const updateResult = await query(
      `UPDATE patient_alerts
       SET status = 'REVIEWED',
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by = $1
       WHERE (id::text = $2 OR alert_id = $2)
       RETURNING id, alert_id as "alertId", patient_id as "patientId", disease, risk_level as "riskLevel", status, reviewed_at as "reviewedAt"`,
      [req.user.id, alertId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Patient alert not found or access denied.' } });
    }

    return res.status(200).json({
      message: 'Alert status updated to REVIEWED.',
      alert: updateResult.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDoctorStats,
  getDoctorPatients,
  addPatientToDoctor,
  removePatientFromDoctor,
  getDoctorPatientProfile,
  searchPatient: getDoctorPatientProfile, // Backward compatibility
  getPatientAlerts,
  markAlertReviewed
};
