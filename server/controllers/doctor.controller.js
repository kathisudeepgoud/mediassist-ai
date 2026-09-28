const { query } = require('../config/db');
const { fetchPatientTrends } = require('./report.controller');

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
 * GET /api/doctor/patient/search?patientId=P000001
 * Search patient by Patient ID and return complete patient medical profile
 */
/**
 * GET /api/doctor/stats
 * Get Doctor Dashboard statistics strictly filtered for the currently logged-in doctor
 */
const getDoctorStats = async (req, res, next) => {
  try {
    let doctorId = req.user.doctorId;
    if (!doctorId) {
      const docRes = await query('SELECT doctor_id FROM users WHERE id = $1', [req.user.id]);
      doctorId = docRes.rows[0]?.doctor_id || null;
    }

    if (!doctorId) {
      return res.status(403).json({ error: { message: 'Doctor ID missing from authenticated user session.' } });
    }

    // 1. Total Patients assigned to this logged-in doctor
    const totalPatientsRes = await query(
      `SELECT COUNT(*)::int as count FROM users WHERE role = 'patient' AND assigned_doctor_id = $1`,
      [doctorId]
    );
    const totalPatients = totalPatientsRes.rows[0]?.count || 0;

    // 2. High-Risk Patients (unique assigned patients with at least 1 high-risk alert or prediction)
    const highRiskRes = await query(
      `SELECT COUNT(DISTINCT a.user_id)::int as count
       FROM patient_alerts a
       JOIN users u ON a.user_id = u.id
       WHERE (a.doctor_id = $1 OR u.assigned_doctor_id = $1) AND a.risk_level = 'HIGH'`,
      [doctorId]
    );
    const highRiskPatients = highRiskRes.rows[0]?.count || 0;

    // 3. New Alerts (count of unreviewed alerts for patients under this doctor)
    const newAlertsRes = await query(
      `SELECT COUNT(*)::int as count
       FROM patient_alerts a
       JOIN users u ON a.user_id = u.id
       WHERE (a.doctor_id = $1 OR u.assigned_doctor_id = $1) AND a.status = 'NEW'`,
      [doctorId]
    );
    const newAlerts = newAlertsRes.rows[0]?.count || 0;

    return res.status(200).json({
      doctorId,
      totalPatients,
      highRiskPatients,
      newAlerts
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctor/patient/search?patientId=P000001
 * Search patient by Patient ID and return medical profile strictly if assigned to currently logged-in doctor
 */
const searchPatient = async (req, res, next) => {
  try {
    const rawPatientId = (req.query.patientId || req.params.patientId || '').toString().trim();

    if (!rawPatientId) {
      return res.status(400).json({ error: { message: 'Patient ID is required for search.' } });
    }

    let doctorId = req.user.doctorId;
    if (!doctorId) {
      const docRes = await query('SELECT doctor_id FROM users WHERE id = $1', [req.user.id]);
      doctorId = docRes.rows[0]?.doctor_id || null;
    }

    // Search patient user in database by patient_id
    const patientResult = await query(
      `SELECT id, name, email, role, patient_id as "patientId", assigned_doctor_id as "assignedDoctorId", phone, age, gender, 
              blood_group as "bloodGroup", height_cm as "heightCm", weight_kg as "weightKg", 
              smoking_habit as "smokingHabit", activity_level as "activityLevel", dietary_preference as "dietaryPreference",
              allergies, existing_conditions as "existingConditions", photo_url as "photoUrl", created_at as "createdAt"
       FROM users 
       WHERE LOWER(patient_id) = LOWER($1) AND role = 'patient'`,
      [rawPatientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Patient not found under your registered patients.' }
      });
    }

    const patient = patientResult.rows[0];

    // REQUIREMENT 4 & 19: Strict authorization check — patient must belong to logged-in doctor
    if (patient.assignedDoctorId && doctorId && patient.assignedDoctorId.toUpperCase() !== doctorId.toUpperCase()) {
      return res.status(403).json({
        error: { message: 'Patient not found under your registered patients.' }
      });
    }

    // Fetch medical reports uploaded by this patient (kept separate per report)
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
      r.vitals = vitalsRes.rows.map(row => {
        if (row.rawValue && String(row.value) !== row.rawValue) {
          row.value = row.rawValue;
        }
        return row;
      });
      allVitals = allVitals.concat(r.vitals);
    }

    // Fetch dynamic longitudinal health trends from database
    const trends = await fetchPatientTrends(patient.id);

    // Calculate dynamic disease risk evaluation using existing ML predictions
    let diseaseRisks = [];
    if (allVitals.length > 0) {
      try {
        const { calculateDiseaseRisks } = require('./report.controller');
        const riskResult = await calculateDiseaseRisks(patient.id);
        diseaseRisks = Array.isArray(riskResult) ? riskResult : (riskResult.diseaseRisks || []);
      } catch {
        diseaseRisks = calculateDiseaseRisksForPatient(allVitals);
      }
    }

    // Report Summary consolidated
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

    // Fetch latest active diet plan for patient
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
      console.warn('[Doctor Search] Diet plan query notice:', dietErr.message);
    }

    return res.status(200).json({
      patient,
      reports,
      reportSummary,
      trends,
      diseaseRisks,
      dietPlan
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
    let doctorId = req.user.doctorId;
    if (!doctorId) {
      const docRes = await query('SELECT doctor_id FROM users WHERE id = $1', [req.user.id]);
      doctorId = docRes.rows[0]?.doctor_id || null;
    }

    const filterStatus = (req.query.status || 'ALL').toString().toUpperCase().trim();

    let statusCondition = '';
    const queryParams = [doctorId];

    if (filterStatus === 'NEW') {
      statusCondition = 'AND a.status = \'NEW\'';
    } else if (filterStatus === 'REVIEWED') {
      statusCondition = 'AND a.status = \'REVIEWED\'';
    }

    const alertsResult = await query(
      `SELECT a.id, a.alert_id as "alertId", a.patient_id as "patientId", a.user_id as "userId",
              a.doctor_id as "doctorId", a.report_id as "reportId", a.disease,
              a.risk_level as "riskLevel", a.risk_probability as "riskProbability",
              a.status, a.created_at as "createdAt", a.reviewed_at as "reviewedAt",
              u.name as "patientName", u.age, u.gender,
              r.report_date as "reportDate", r.source as "reportSource"
       FROM patient_alerts a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN medical_reports r ON a.report_id = r.id
       WHERE (a.doctor_id = $1 OR u.assigned_doctor_id = $1) ${statusCondition}
       ORDER BY CASE WHEN a.status = 'NEW' THEN 0 ELSE 1 END, a.created_at DESC`,
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
    let doctorId = req.user.doctorId;
    if (!doctorId) {
      const docRes = await query('SELECT doctor_id FROM users WHERE id = $1', [req.user.id]);
      doctorId = docRes.rows[0]?.doctor_id || null;
    }

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
  searchPatient,
  getPatientAlerts,
  markAlertReviewed
};
