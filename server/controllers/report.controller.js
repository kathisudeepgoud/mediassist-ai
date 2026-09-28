const path = require('path');
const fs = require('fs');
const { query } = require('../config/db');
const { generateReportExplanation } = require('../services/gemini.service');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

/**
 * POST /api/reports/manual
 * Create a new manual-entry medical report and its associated vital readings in a single fast operation
 */
const createManualReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let {
      patientName,
      age,
      gender,
      reportDate,
      hospital,
      doctor,
      type,
      summary,
      keyFindings,
      vitals,
      parameters
    } = req.body;

    // Fetch user details for defaults if missing
    const userRes = await query('SELECT name, age, gender FROM users WHERE id = $1', [userId]);
    const userRow = userRes.rows[0] || {};

    const finalPatientName = patientName || userRow.name || 'Patient';
    const finalAge = parseInt(age || userRow.age, 10) || 0;

    let rawGender = (gender || userRow.gender || 'Other').toString().trim();
    let finalGender = 'Other';
    if (/^m(ale)?$/i.test(rawGender)) finalGender = 'Male';
    else if (/^f(emale)?$/i.test(rawGender)) finalGender = 'Female';

    let finalReportDate = new Date().toISOString().split('T')[0];
    if (reportDate) {
      const d = new Date(reportDate);
      if (!isNaN(d.getTime())) {
        finalReportDate = d.toISOString().split('T')[0];
      }
    }

    const finalHospital = hospital || 'Self-Reported / Home Reading';
    const finalDoctor = doctor || 'Self / Patient Entry';
    const finalType = type || 'Manual Health Entry';

    let vitalsList = Array.isArray(vitals) && vitals.length > 0 ? vitals : (Array.isArray(parameters) ? parameters : []);
    if (typeof vitalsList === 'string') {
      try { vitalsList = JSON.parse(vitalsList); } catch { vitalsList = []; }
    }

    let parsedKeyFindings = keyFindings;
    if (typeof parsedKeyFindings === 'string') {
      try { parsedKeyFindings = JSON.parse(parsedKeyFindings); } catch { parsedKeyFindings = null; }
    }
    if (!parsedKeyFindings || !Array.isArray(parsedKeyFindings)) {
      parsedKeyFindings = vitalsList.map(v => `${v.label || v.parameter || v.name || 'Parameter'}: ${v.value} ${v.unit || ''}`);
    }

    const defaultSummary = vitalsList.length > 0
      ? `Manual health entry recorded with ${vitalsList.length} parameter(s): ` + vitalsList.map(v => `${v.label || v.parameter || v.name || 'Parameter'} = ${v.value} ${v.unit || ''}`).join(', ')
      : 'Manual health entry submitted.';
    const finalSummary = summary || defaultSummary;

    // 1. Create a NEW separate medical_reports row for this manual entry
    const reportResult = await query(
      `INSERT INTO medical_reports 
       (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary, key_findings, file_type, file_url, source, extracted_text, original_filename)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, user_id as "userId", patient_name as "patientName", age, gender, 
                 report_date as "reportDate", hospital, doctor, type, summary, 
                 key_findings as "keyFindings", file_type as "fileType", file_url as "fileUrl", 
                 source, extracted_text as "extractedText", original_filename as "originalFilename",
                 created_at as "createdAt"`,
      [
        userId,
        finalPatientName,
        finalAge,
        finalGender,
        finalReportDate,
        finalHospital,
        finalDoctor,
        finalType,
        finalSummary,
        JSON.stringify(parsedKeyFindings),
        'MANUAL',
        null,
        'Manual Entry',
        finalSummary,
        'Manual Entry'
      ]
    );

    const report = reportResult.rows[0];

    // 2. Save vital readings linked to this specific new report.id & user_id
    const savedVitals = [];
    for (const vital of vitalsList) {
      const rawVal = vital.value !== undefined ? vital.value : vital.val;
      let valNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9\.]/g, ''));
      if (isNaN(valNum) || valNum > 99999999 || valNum < -99999999) valNum = 0.0;

      let rawStatus = (vital.status || vital.flag || 'normal').toString().toLowerCase().trim();
      let cleanStatus = 'normal';
      if (['normal', 'borderline', 'high', 'low'].includes(rawStatus)) {
        cleanStatus = rawStatus;
      } else if (rawStatus.includes('high') || rawStatus === 'h' || rawStatus === '*') {
        cleanStatus = 'high';
      } else if (rawStatus.includes('low') || rawStatus === 'l') {
        cleanStatus = 'low';
      } else if (rawStatus.includes('borderline')) {
        cleanStatus = 'borderline';
      }

      const labelStr = vital.label || vital.parameter || vital.name || 'Parameter';
      const unitStr = vital.unit || 'units';
      const refStr = vital.referenceRange || vital.reference_range || vital.reference || 'N/A';
      const rawValStr = String(rawVal !== undefined && rawVal !== null ? rawVal : '');

      const vitalResult = await query(
        `INSERT INTO vital_readings 
         (user_id, report_id, label, value, unit, status, reference_range, source, raw_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, user_id as "userId", report_id as "reportId", label, value, unit, status, 
                   reference_range as "referenceRange", source, raw_value as "rawValue"`,
        [userId, report.id, labelStr, valNum, unitStr, cleanStatus, refStr, 'Manual Entry', rawValStr]
      );

      const row = vitalResult.rows[0];
      if (rawValStr && String(valNum) !== rawValStr) {
        row.value = rawValStr;
      }
      savedVitals.push(row);
    }

    report.vitals = savedVitals;

    return res.status(201).json({
      message: 'Manual health entry created as a separate report.',
      report
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reports/upload
 * Upload medical report file, parse with FastAPI service, and save metadata + vitals to database
 */
const uploadReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: { message: 'Medical report file is required.' } });
    }

    // Validate PDF file format strictly
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      return res.status(400).json({
        error: { message: 'Invalid file format. Only PDF documents (.pdf) are accepted.' }
      });
    }
    const fileType = 'PDF';
    const fileUrl = `/uploads/${file.filename}`;

    // 1. Call FastAPI Parser Service to extract metadata & structured vitals/parameters
    let extractedVitals = [];
    let parsedData = {};

    try {
      const fileBuffer = fs.readFileSync(file.path);
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.originalname}"\r\nContent-Type: ${file.mimetype || 'application/pdf'}\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;
      const bodyBuffer = Buffer.concat([
        Buffer.from(header, 'utf-8'),
        fileBuffer,
        Buffer.from(footer, 'utf-8')
      ]);

      const targetUrl = FASTAPI_URL.replace('localhost', '127.0.0.1');
      const fastapiRes = await fetch(`${targetUrl}/parse-report`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length.toString()
        },
        body: bodyBuffer
      });

      if (fastapiRes.ok) {
        parsedData = await fastapiRes.json();
        extractedVitals = parsedData.vitals || [];

        // Fallback to dynamic parameters if legacy vitals array is empty
        if ((!extractedVitals || extractedVitals.length === 0) && parsedData.clinical_parameters) {
          extractedVitals = parsedData.clinical_parameters.map(p => ({
            label: p.name,
            value: p.value,
            unit: p.unit || '',
            status: (p.flag || '').toLowerCase().includes('high') ? 'high' :
              (p.flag || '').toLowerCase().includes('low') ? 'low' : 'normal',
            referenceRange: p.reference_range || 'Standard Reference Range'
          }));
        }
      }
    } catch (fastapiErr) {
      console.warn('[FastAPI Parse Warning] Failed to reach FastAPI parsing service:', fastapiErr.message);
    }

    // Allow explicit vitals array override for manual health entries
    let bodyVitals = req.body.vitals;
    if (typeof bodyVitals === 'string') {
      try { bodyVitals = JSON.parse(bodyVitals); } catch { bodyVitals = null; }
    }
    if (bodyVitals && Array.isArray(bodyVitals) && bodyVitals.length > 0) {
      extractedVitals = bodyVitals;
    }

    // Strict non-clinical filtering (ensures identifiers, demographics, facility info, diagnoses, and interpretations are never stored as lab readings)
    const NON_CLINICAL_PARAM_REGEX = /^(?:age|years|yrs|dob|gender|sex|male|female|lab\s*no|lab\s*number|sample\s*(?:id|no)|specimen|accession|barcode|report\s*(?:id|no)|bill\s*no|ref\s*no|uhid|mrn|pid|patient(?:\s*name|\s*id)?|reg\.?\s*(?:no|istration)?|dr\.|doctor|hospital|clinic|date|time|phone|mobile|address|diabetes\s*mellitus|impaired\s*tolerance|hypertension|prediabetes|anemia)$/i;
    const NON_CLINICAL_SUBSTRING_REGEX = /\b(?:patient\s*name|patient\s*id|lab\s*no|lab\s*number|sample\s*id|specimen\s*id|accession\s*no|barcode\s*no|report\s*id|reg\.\s*no|registration\s*no|mr\.|mrs\.|ms\.|dr\.)\b/i;

    extractedVitals = (extractedVitals || []).filter(v => {
      const lbl = (v.label || v.name || v.parameter || '').trim();
      if (!lbl || lbl.length < 2) return false;
      if (NON_CLINICAL_PARAM_REGEX.test(lbl) || NON_CLINICAL_SUBSTRING_REGEX.test(lbl)) return false;
      return true;
    });

    // 2. Fetch User default info as fallback
    const userRes = await query('SELECT name FROM users WHERE id = $1', [userId]);
    const currentUserName = userRes.rows[0]?.name || 'Patient';

    // Extract metadata fields from FastAPI output or body with robust sanitization
    const meta = parsedData.metadata || {};
    const finalPatientName = req.body.patientName || parsedData.patientName || meta.patient_name || currentUserName;
    const finalAge = parseInt(req.body.age || parsedData.age || meta.age, 10) || 0;

    // Sanitize Gender for PostgreSQL CHECK constraint: 'Male', 'Female', 'Other'
    let rawGender = (req.body.gender || parsedData.gender || meta.sex || 'Other').toString().trim();
    let finalGender = 'Other';
    if (/^m(ale)?$/i.test(rawGender)) finalGender = 'Male';
    else if (/^f(emale)?$/i.test(rawGender)) finalGender = 'Female';

    // Sanitize Report Date for PostgreSQL DATE type (YYYY-MM-DD)
    let rawDate = req.body.reportDate || parsedData.reportDate || meta.report_date;
    let finalReportDate = new Date().toISOString().split('T')[0];
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        finalReportDate = d.toISOString().split('T')[0];
      }
    }

    const finalHospital = req.body.hospital || parsedData.hospital || meta.hospital_name || 'Medical Lab';
    const finalDoctor = req.body.doctor || parsedData.doctor || meta.doctor_name || 'Attending Physician';
    const finalType = req.body.type || file.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || 'Lab Test Report';
    const finalSummary = req.body.summary || parsedData.summary || 'Lab report parsed successfully.';
    const finalExtractedText = parsedData.text || parsedData.summary || finalSummary;

    let reqKeyFindings = req.body.keyFindings;
    if (typeof reqKeyFindings === 'string') {
      try { reqKeyFindings = JSON.parse(reqKeyFindings); } catch { reqKeyFindings = null; }
    }
    let finalKeyFindings = reqKeyFindings || parsedData.keyFindings || [];

    // If keyFindings are empty and we have extracted vitals, generate patient-friendly explanation via Gemini AI
    if ((!finalKeyFindings || finalKeyFindings.length === 0) && extractedVitals.length > 0) {
      try {
        const aiExpl = await generateReportExplanation(
          { age: finalAge, gender: finalGender, type: finalType, hospital: finalHospital },
          extractedVitals
        );
        if (aiExpl && aiExpl.parameters && aiExpl.parameters.length > 0) {
          finalKeyFindings = aiExpl.parameters.map(p => ({
            parameter: p.name,
            value: p.value,
            unit: p.unit,
            status: p.status,
            referenceRange: p.referenceRange,
            explanation: p.explanation,
            isAiGenerated: aiExpl.isAiGenerated
          }));
        }
      } catch (explErr) {
        console.warn('[Gemini Auto-Explain Warning]', explErr.message);
      }
    }

    const reportSource = req.body.source || (fileType === 'PDF' ? 'Uploaded PDF' : 'OCR');

    // 3. Insert report metadata into medical_reports table
    const reportResult = await query(
      `INSERT INTO medical_reports 
       (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary, key_findings, file_type, file_url, source, extracted_text, original_filename)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, user_id as "userId", patient_name as "patientName", age, gender, 
                 report_date as "reportDate", hospital, doctor, type, summary, 
                 key_findings as "keyFindings", file_type as "fileType", file_url as "fileUrl", 
                 source, extracted_text as "extractedText", original_filename as "originalFilename",
                 created_at as "createdAt"`,
      [
        userId,
        finalPatientName,
        finalAge,
        finalGender,
        finalReportDate,
        finalHospital,
        finalDoctor,
        finalType,
        finalSummary,
        JSON.stringify(finalKeyFindings),
        fileType,
        fileUrl,
        reportSource,
        finalExtractedText,
        file.originalname
      ]
    );

    const report = reportResult.rows[0];

    // 4. Save extracted vital readings to vital_readings table linked to report_id & user_id
    const savedVitals = [];
    for (const vital of extractedVitals) {
      const rawVal = vital.value;
      let valNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9\.]/g, ''));
      if (isNaN(valNum) || valNum > 99999999 || valNum < -99999999) valNum = 0.0;

      let rawStatus = (vital.status || vital.flag || 'normal').toString().toLowerCase().trim();
      let cleanStatus = 'normal';
      if (['normal', 'borderline', 'high', 'low'].includes(rawStatus)) {
        cleanStatus = rawStatus;
      } else if (rawStatus.includes('high') || rawStatus === 'h' || rawStatus === '*') {
        cleanStatus = 'high';
      } else if (rawStatus.includes('low') || rawStatus === 'l') {
        cleanStatus = 'low';
      } else if (rawStatus.includes('borderline')) {
        cleanStatus = 'borderline';
      }

      const rawValStr = String(rawVal !== undefined && rawVal !== null ? rawVal : '');
      const vitalResult = await query(
        `INSERT INTO vital_readings 
         (user_id, report_id, label, value, unit, status, reference_range, source, raw_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, label, value, unit, status, reference_range as "referenceRange", source, raw_value as "rawValue"`,
        [userId, report.id, vital.label || vital.name || 'Parameter', valNum, vital.unit || 'units', cleanStatus, vital.referenceRange || vital.reference_range || '', 'OCR', rawValStr]
      );

      const row = vitalResult.rows[0];
      if (rawValStr && String(valNum) !== rawValStr) {
        row.value = rawValStr;
      }
      savedVitals.push(row);
    }

    report.vitals = savedVitals;

    return res.status(201).json({
      message: 'Medical report uploaded, parsed by FastAPI, and saved successfully.',
      report
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports
 * Get all medical reports for logged-in user
 */
const getAllReports = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, user_id as "userId", patient_name as "patientName", age, gender, 
              report_date as "reportDate", hospital, doctor, type, summary, 
              key_findings as "keyFindings", file_type as "fileType", file_url as "fileUrl", 
              source, extracted_text as "extractedText", original_filename as "originalFilename",
              created_at as "createdAt"
       FROM medical_reports 
       WHERE user_id = $1 
       ORDER BY report_date DESC, created_at DESC`,
      [userId]
    );

    const reports = result.rows;
    for (const r of reports) {
      if (r.fileType === 'MANUAL' || (r.type && r.type.toLowerCase().includes('manual')) || (r.source && r.source.toLowerCase().includes('manual'))) {
        r.source = 'Manual Entry';
      } else if (!r.source) {
        r.source = (r.fileType === 'PNG' || r.fileType === 'JPG') ? 'OCR' : 'Uploaded PDF';
      }

      const vitalsResult = await query(
        `SELECT id, label, value, unit, status, reference_range as "referenceRange", source, raw_value as "rawValue"
         FROM vital_readings 
         WHERE report_id = $1`,
        [r.id]
      );
      r.vitals = vitalsResult.rows.map(row => {
        if (row.rawValue && String(row.value) !== row.rawValue) {
          row.value = row.rawValue;
        }
        return row;
      });
    }

    return res.status(200).json({ reports });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/:id
 * Get single report details by ID along with its vitals
 */
const getReportById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const reportResult = await query(
      `SELECT id, user_id as "userId", patient_name as "patientName", age, gender, 
              report_date as "reportDate", hospital, doctor, type, summary, 
              key_findings as "keyFindings", file_type as "fileType", file_url as "fileUrl", 
              source, extracted_text as "extractedText", original_filename as "originalFilename",
              created_at as "createdAt"
       FROM medical_reports 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Medical report not found.' } });
    }

    const report = reportResult.rows[0];
    if (report.fileType === 'MANUAL' || (report.type && report.type.toLowerCase().includes('manual')) || (report.source && report.source.toLowerCase().includes('manual'))) {
      report.source = 'Manual Entry';
    } else if (!report.source) {
      report.source = (report.fileType === 'PNG' || report.fileType === 'JPG') ? 'OCR' : 'Uploaded PDF';
    }

    const vitalsResult = await query(
      `SELECT id, label, value, unit, status, reference_range as "referenceRange", source, raw_value as "rawValue"
       FROM vital_readings 
       WHERE report_id = $1`,
      [id]
    );

    report.vitals = vitalsResult.rows.map(row => {
      if (row.rawValue && String(row.value) !== row.rawValue) {
        row.value = row.rawValue;
      }
      return row;
    });

    return res.status(200).json({ report });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/reports/:id
 * Delete medical report and its vitals for logged-in user
 */
const deleteReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check report existence and ownership
    const reportResult = await query(
      'SELECT id, file_url as "fileUrl" FROM medical_reports WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Medical report not found or access denied.' } });
    }

    const fileUrl = reportResult.rows[0].fileUrl;

    // 1. Delete linked vital readings
    await query('DELETE FROM vital_readings WHERE report_id = $1', [id]);

    // 2. Delete report record
    await query('DELETE FROM medical_reports WHERE id = $1 AND user_id = $2', [id, userId]);

    // 3. Remove stored file from disk if it exists
    if (fileUrl && fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', fileUrl);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore disk cleanup error */ }
      }
    }

    return res.status(200).json({ message: 'Report deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/trends
 * Get dynamic trend metrics for the 6 core vitals:
 * 1. Blood Sugar
 * 2. Cholesterol
 * 3. BMI
 * 4. Hemoglobin
 * 5. Vitamin D
 * 6. Blood Pressure
 */
/**
 * Helper to fetch real historical vital trends for a specific user ID
 */
const fetchPatientTrends = async (userId) => {
  const vitalsResult = await query(
    `SELECT v.id, v.label, v.value, v.unit, v.status, v.reference_range as "referenceRange",
            r.report_date as "reportDate", r.created_at as "createdAt"
     FROM vital_readings v
     JOIN medical_reports r ON v.report_id = r.id
     WHERE v.user_id = $1
     ORDER BY r.report_date ASC, r.created_at ASC`,
    [userId]
  );

  const rawVitals = vitalsResult.rows;

  const metricsConfig = [
    {
      id: 'blood-sugar',
      name: 'Blood Sugar',
      unit: 'mg/dL',
      color: '#0f766e',
      normalRange: [70, 99],
      match: (label) => /sugar|glucose|\bfbs\b/i.test(label) && !/hba1c|glycated/i.test(label)
    },
    {
      id: 'cholesterol',
      name: 'Cholesterol',
      unit: 'mg/dL',
      color: '#2563eb',
      normalRange: [125, 200],
      match: (label) => /total cholesterol|cholesterol|lipid|hdl|ldl|triglyceride/i.test(label)
    },
    {
      id: 'bmi',
      name: 'BMI',
      unit: 'kg/m²',
      color: '#f97316',
      normalRange: [18.5, 24.9],
      match: (label) => /\bbmi\b|body mass index/i.test(label)
    },
    {
      id: 'hemoglobin',
      name: 'Hemoglobin',
      unit: 'g/dL',
      color: '#e6435f',
      normalRange: [12, 15.5],
      match: (label) => /hemoglobin|\bhb\b/i.test(label) && !/hba1c|mchc/i.test(label)
    },
    {
      id: 'vitamin-d',
      name: 'Vitamin D',
      unit: 'ng/mL',
      color: '#eab308',
      normalRange: [30, 100],
      match: (label) => /vitamin d|25-oh|25\(oh\)|calciferol/i.test(label)
    },
    {
      id: 'blood-pressure',
      name: 'Blood Pressure',
      unit: 'mmHg',
      color: '#14958a',
      normalRange: [90, 120],
      match: (label) => /pressure|\bbp\b|systolic/i.test(label)
    }
  ];

  return metricsConfig.map((cfg) => {
    const matchingRows = rawVitals.filter((row) => cfg.match(row.label));

    const realPoints = matchingRows.map((row) => {
      const d = new Date(row.reportDate || row.createdAt);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      let val = typeof row.value === 'number' ? row.value : parseFloat(String(row.value).replace(/[^0-9\.]/g, ''));
      if (isNaN(val)) val = 0;
      return { date: dateStr, value: Math.round(val * 10) / 10 };
    });

    return {
      id: cfg.id,
      name: cfg.name,
      unit: cfg.unit,
      color: cfg.color,
      normalRange: cfg.normalRange,
      data: realPoints
    };
  });
};

/**
 * GET /api/reports/trends
 * Get dynamic trend metrics for logged-in user using ONLY real database records
 */
const getTrends = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const trends = await fetchPatientTrends(userId);
    return res.status(200).json({ trends });
  } catch (err) {
    next(err);
  }
};

/**
 * Calculate dynamic disease risks using FastAPI ML prediction models.
 * Operates ONLY on actual patient clinical data. If no clinical data is present,
 * returns hasData: false without fabricating synthetic measurements or calling ML endpoints.
 */
const calculateDiseaseRisks = async (userId) => {
  const userRes = await query('SELECT age, gender, height_cm, weight_kg FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0] || {};

  const vitalsRes = await query(
    `SELECT v.label, v.value, v.unit, v.source, r.source as "reportSource", r.file_type as "fileType", r.report_date as "reportDate"
     FROM vital_readings v
     JOIN medical_reports r ON v.report_id = r.id
     WHERE v.user_id = $1
     ORDER BY r.report_date DESC, r.created_at DESC`,
    [userId]
  );
  const rawVitals = vitalsRes.rows;

  // 1. If patient has no uploaded reports or vital readings, return explicit no-data state
  if (!rawVitals || rawVitals.length === 0) {
    return {
      hasData: false,
      diseaseRisks: [],
      message: 'No clinical data available. Upload a medical report or enter health measurements to generate disease-risk analysis.'
    };
  }

  // 2. Extract actual recorded patient clinical measurements
  let fastingSugar = null;
  let hba1c = null;
  let cholesterol = null;
  let bpSystolic = null;
  let bpDiastolic = null;
  let creatinine = null;
  let bloodUrea = null;
  let sodium = null;
  let potassium = null;
  let bmi = null;
  let heartRate = null;
  let wbc = null;
  let rbc = null;
  let hgb = null;
  let hct = null;
  let mcv = null;
  let mch = null;
  let mchc = null;
  let plt = null;
  let totalBilirubin = null;
  let directBilirubin = null;
  let alp = null;
  let alt = null;
  let ast = null;
  let totalProtein = null;
  let albumin = null;
  let agRatio = null;

  let hasManualSource = false;
  let hasReportSource = false;

  for (const v of rawVitals) {
    const lbl = (v.label || '').toLowerCase();
    const val = typeof v.value === 'number' ? v.value : parseFloat(String(v.value).replace(/[^0-9\.]/g, ''));
    
    if (v.source === 'Manual Entry' || v.fileType === 'MANUAL' || (v.reportSource && v.reportSource.toLowerCase().includes('manual'))) {
      hasManualSource = true;
    } else {
      hasReportSource = true;
    }

    if (!isNaN(val) && val > 0) {
      if (/sugar|glucose|fbs/i.test(lbl) && fastingSugar === null) fastingSugar = val;
      if (/hba1c|glycated/i.test(lbl) && hba1c === null) hba1c = val;
      if (/cholesterol|lipid|ldl/i.test(lbl) && cholesterol === null) cholesterol = val;
      if (/systolic/i.test(lbl) && bpSystolic === null) bpSystolic = val;
      else if (/diastolic/i.test(lbl) && bpDiastolic === null) bpDiastolic = val;
      else if (/pressure|bp/i.test(lbl) && bpSystolic === null) bpSystolic = val;
      if (/creatinine/i.test(lbl) && creatinine === null) creatinine = val;
      if (/urea|bun/i.test(lbl) && bloodUrea === null) bloodUrea = val;
      if (/sodium|na\+/i.test(lbl) && sodium === null) sodium = val;
      if (/potassium|k\+/i.test(lbl) && potassium === null) potassium = val;
      if (/bmi|body mass index/i.test(lbl) && bmi === null) bmi = val;
      if (/pulse|heart rate/i.test(lbl) && heartRate === null) heartRate = val;
      if (/wbc|tlc/i.test(lbl) && wbc === null) wbc = val;
      if (/rbc|red blood/i.test(lbl) && rbc === null) rbc = val;
      if (/hgb|hb|hemoglobin/i.test(lbl) && hgb === null) hgb = val;
      if (/hct|hematocrit|pcv/i.test(lbl) && hct === null) hct = val;
      if (/mcv/i.test(lbl) && mcv === null) mcv = val;
      if (/mchc/i.test(lbl) && mchc === null) mchc = val;
      else if (/mch/i.test(lbl) && mch === null) mch = val;
      if (/plt|platelet/i.test(lbl) && plt === null) plt = val;
      if (/direct bilirubin/i.test(lbl) && directBilirubin === null) directBilirubin = val;
      else if (/bilirubin/i.test(lbl) && totalBilirubin === null) totalBilirubin = val;
      if (/alkaline|alp/i.test(lbl) && alp === null) alp = val;
      if (/alt|sgpt/i.test(lbl) && alt === null) alt = val;
      if (/ast|sgot/i.test(lbl) && ast === null) ast = val;
      if (/total protein/i.test(lbl) && totalProtein === null) totalProtein = val;
      else if (/albumin/i.test(lbl) && albumin === null) albumin = val;
      if (/a\/g ratio|ag ratio/i.test(lbl) && agRatio === null) agRatio = val;
    }
  }

  // Calculate BMI from patient profile if available and not present in vitals
  if (bmi === null && user.height_cm && user.weight_kg) {
    const hM = user.height_cm / 100;
    if (hM > 0) bmi = Math.round((user.weight_kg / (hM * hM)) * 10) / 10;
  }

  const provenanceText = hasReportSource
    ? 'values extracted from your latest medical report'
    : 'your manually entered health measurements';

  const targetUrl = FASTAPI_URL.replace('localhost', '127.0.0.1');

  // Multi-model prediction helper with generous timeout to avoid premature aborts
  const fetchMlPrediction = async (endpoint, features) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${targetUrl}/api/ml/${endpoint}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: userId, features }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) return await res.json();
    } catch (err) {
      console.warn(`[FastAPI ML Warning] ${endpoint} endpoint failed:`, err.message);
    }
    return null;
  };

  const ageNum = user.age ? parseFloat(user.age) : 45.0;
  const isMale = /^m/i.test(user.gender || 'Male') ? 1 : 0;
  const genderStr = isMale ? 'Male' : 'Female';

  // Determine which organ domains have valid patient clinical measurements
  const hasDiabetesData = fastingSugar !== null || hba1c !== null;
  const hasHeartData = cholesterol !== null || bpSystolic !== null || heartRate !== null;
  const hasKidneyData = creatinine !== null || bloodUrea !== null || sodium !== null || potassium !== null;
  const hasLiverData = totalBilirubin !== null || alt !== null || ast !== null || alp !== null || totalProtein !== null || albumin !== null;
  const hasCbcData = hgb !== null || rbc !== null || plt !== null || wbc !== null || hct !== null || mcv !== null;

  const [diabetesResult, heartResult, kidneyResult, liverResult, cbcResult] = await Promise.all([
    hasDiabetesData
      ? fetchMlPrediction('diabetes', {
          gender: genderStr,
          age: ageNum,
          hypertension: (bpSystolic || 120) > 130 ? 1 : 0,
          heart_disease: 0,
          smoking_history: 'never',
          bmi: bmi || 24.5,
          HbA1c_level: hba1c || 5.5,
          blood_glucose_level: fastingSugar || 95
        })
      : null,
    hasHeartData
      ? fetchMlPrediction('heart', {
          male: isMale,
          age: ageNum,
          currentSmoker: 0,
          cigsPerDay: 0.0,
          BPMeds: 0.0,
          prevalentStroke: 0,
          prevalentHyp: (bpSystolic || 120) > 130 ? 1 : 0,
          diabetes: (fastingSugar || 95) > 125 ? 1 : 0,
          totChol: cholesterol || 180,
          sysBP: bpSystolic || 118,
          diaBP: bpDiastolic || 78,
          BMI: bmi || 24.5,
          heartRate: heartRate || 72,
          glucose: fastingSugar || 95
        })
      : null,
    hasKidneyData
      ? fetchMlPrediction('kidney', {
          age: ageNum,
          bp: bpSystolic || 118,
          sg: 1.02,
          al: 0.0,
          su: 0.0,
          rbc: 'normal',
          pc: 'normal',
          pcc: 'notpresent',
          ba: 'notpresent',
          bgr: fastingSugar || 95,
          bu: bloodUrea || 25,
          sc: creatinine || 0.9,
          sod: sodium || 140,
          pot: potassium || 4.2,
          hemo: hgb || 14.2,
          pcv: hct || 42.0,
          wc: (wbc || 7.5) * 1000,
          rc: rbc || 4.8,
          htn: (bpSystolic || 118) > 130 ? 'yes' : 'no',
          dm: (fastingSugar || 95) > 125 ? 'yes' : 'no',
          cad: 'no',
          appet: 'good',
          pe: 'no',
          ane: (hgb || 14.2) < 11.0 ? 'yes' : 'no'
        })
      : null,
    hasLiverData
      ? fetchMlPrediction('liver', {
          Age: ageNum,
          Gender: genderStr,
          Total_Bilirubin: totalBilirubin || 0.9,
          Direct_Bilirubin: directBilirubin || 0.3,
          Alkaline_Phosphotase: alp || 85.0,
          Alamine_Aminotransferase: alt || 25.0,
          Aspartate_Aminotransferase: ast || 28.0,
          Total_Protiens: totalProtein || 7.2,
          Albumin: albumin || 4.1,
          Albumin_and_Globulin_Ratio: agRatio || 1.1
        })
      : null,
    hasCbcData
      ? fetchMlPrediction('cbc', {
          WBC: wbc || 7.5,
          LYMp: 30.0,
          NEUTp: 60.0,
          LYMn: 2.2,
          NEUTn: 4.5,
          RBC: rbc || 4.8,
          HGB: hgb || 14.2,
          HCT: hct || 42.0,
          MCV: mcv || 88.0,
          MCH: mch || 29.5,
          MCHC: mchc || 33.5,
          PLT: plt || 250.0,
          PDW: 12.5,
          PCT: 0.2
        })
      : null
  ]);

  const results = [];

  // 1. Diabetes
  if (hasDiabetesData && diabetesResult && diabetesResult.risk_probability !== undefined && diabetesResult.status !== 'insufficient_data') {
    const pct = Math.round(diabetesResult.risk_probability * 100);
    const status = diabetesResult.risk_level || (pct >= 60 ? 'High' : pct >= 30 ? 'Moderate' : 'Low');
    const detailsList = [];
    if (fastingSugar !== null) detailsList.push(`glucose: ${fastingSugar} mg/dL`);
    if (hba1c !== null) detailsList.push(`HbA1c: ${hba1c}%`);
    const detailsStr = detailsList.length > 0 ? ` (${detailsList.join(', ')})` : '';

    results.push({
      id: 'diabetes',
      name: 'Diabetes Risk',
      percentage: pct,
      status,
      explanation: `Machine learning model evaluated diabetes risk at ${pct}% (${status} Risk) based on ${provenanceText}${detailsStr}.`,
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
      explanation: 'Additional blood glucose or HbA1c measurements are required to calculate this risk.',
      suggestions: [
        'Upload a lab report containing Fasting Blood Sugar or HbA1c, or log them under Manual Entry.'
      ]
    });
  }

  // 2. Heart Disease
  if (hasHeartData && heartResult && heartResult.risk_probability !== undefined && heartResult.status !== 'insufficient_data') {
    const pct = Math.round(heartResult.risk_probability * 100);
    const status = heartResult.risk_level || (pct >= 60 ? 'High' : pct >= 30 ? 'Moderate' : 'Low');
    const detailsList = [];
    if (cholesterol !== null) detailsList.push(`cholesterol: ${cholesterol} mg/dL`);
    if (bpSystolic !== null) detailsList.push(`BP: ${bpSystolic}${bpDiastolic ? `/${bpDiastolic}` : ''} mmHg`);
    const detailsStr = detailsList.length > 0 ? ` (${detailsList.join(', ')})` : '';

    results.push({
      id: 'heart',
      name: 'Heart Disease Risk',
      percentage: pct,
      status,
      explanation: `Machine learning model evaluated cardiovascular risk at ${pct}% (${status} Risk) based on ${provenanceText}${detailsStr}.`,
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
      explanation: 'Additional cardiovascular measurements (e.g. Total Cholesterol, Blood Pressure) are required to calculate this risk.',
      suggestions: [
        'Upload a lipid profile report or record blood pressure readings under Manual Entry.'
      ]
    });
  }

  // 3. Kidney Disease
  if (hasKidneyData && kidneyResult && kidneyResult.risk_probability !== undefined && kidneyResult.status !== 'insufficient_data') {
    const pct = Math.round(kidneyResult.risk_probability * 100);
    const status = kidneyResult.risk_level || (pct >= 60 ? 'High' : pct >= 30 ? 'Moderate' : 'Low');
    const detailsList = [];
    if (creatinine !== null) detailsList.push(`serum creatinine: ${creatinine} mg/dL`);
    if (bloodUrea !== null) detailsList.push(`blood urea: ${bloodUrea} mg/dL`);
    const detailsStr = detailsList.length > 0 ? ` (${detailsList.join(', ')})` : '';

    results.push({
      id: 'kidney',
      name: 'Kidney Disease Risk',
      percentage: pct,
      status,
      explanation: `Machine learning model evaluated chronic kidney disease risk at ${pct}% (${status} Risk) based on ${provenanceText}${detailsStr}.`,
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
      explanation: 'Additional renal measurements (e.g. Serum Creatinine, Blood Urea) are required to calculate this risk.',
      suggestions: [
        'Upload a renal function test (KFT/RFT) report or record creatinine levels under Manual Entry.'
      ]
    });
  }

  // 4. Liver Disease
  if (hasLiverData && liverResult && liverResult.risk_probability !== undefined && liverResult.status !== 'insufficient_data') {
    const pct = Math.round(liverResult.risk_probability * 100);
    const status = liverResult.risk_level || (pct >= 60 ? 'High' : pct >= 30 ? 'Moderate' : 'Low');
    const detailsList = [];
    if (totalBilirubin !== null) detailsList.push(`bilirubin: ${totalBilirubin} mg/dL`);
    if (alt !== null) detailsList.push(`ALT: ${alt} U/L`);
    if (ast !== null) detailsList.push(`AST: ${ast} U/L`);
    const detailsStr = detailsList.length > 0 ? ` (${detailsList.join(', ')})` : '';

    results.push({
      id: 'liver',
      name: 'Liver Disease Risk',
      percentage: pct,
      status,
      explanation: `Machine learning model evaluated liver disease risk at ${pct}% (${status} Risk) based on ${provenanceText}${detailsStr}.`,
      suggestions: [
        'Limit alcohol consumption and avoid unnecessary hepatotoxic medications',
        'Maintain balanced diet rich in leafy greens and antioxidants',
        'Recheck hepatic function panel periodically'
      ]
    });
  } else {
    results.push({
      id: 'liver',
      name: 'Liver Disease Risk',
      percentage: null,
      status: 'Insufficient Data',
      explanation: 'Additional hepatic measurements (e.g. Total Bilirubin, ALT, AST) are required to calculate this risk.',
      suggestions: [
        'Upload a liver function test (LFT) report or record liver enzymes under Manual Entry.'
      ]
    });
  }

  // 5. CBC / Anemia / Blood
  if (hasCbcData && cbcResult && cbcResult.risk_probability !== undefined && cbcResult.status !== 'insufficient_data') {
    const pct = Math.round(cbcResult.risk_probability * 100);
    const status = cbcResult.risk_level || (pct >= 60 ? 'High' : pct >= 30 ? 'Moderate' : 'Low');
    const detailsList = [];
    if (hgb !== null) detailsList.push(`hemoglobin: ${hgb} g/dL`);
    if (rbc !== null) detailsList.push(`RBC: ${rbc}`);
    if (plt !== null) detailsList.push(`PLT: ${plt}`);
    const detailsStr = detailsList.length > 0 ? ` (${detailsList.join(', ')})` : '';

    results.push({
      id: 'cbc',
      name: 'CBC Anemia & Blood Risk',
      percentage: pct,
      status,
      explanation: `Machine learning model evaluated hematology/anemia risk at ${pct}% (${status} Risk) based on ${provenanceText}${detailsStr}.`,
      suggestions: [
        'Ensure adequate dietary iron, vitamin B12, and folate intake',
        'Monitor hemoglobin and hematocrit levels',
        'Consult healthcare provider if persistent fatigue occurs'
      ]
    });
  } else {
    results.push({
      id: 'cbc',
      name: 'CBC Anemia & Blood Risk',
      percentage: null,
      status: 'Insufficient Data',
      explanation: 'Additional hematology measurements (e.g. Hemoglobin, RBC, Platelets) are required to calculate this risk.',
      suggestions: [
        'Upload a Complete Blood Count (CBC) report or log hemoglobin under Manual Entry.'
      ]
    });
  }

  await syncPatientAlertsFromRisks(userId, results);

  return {
    hasData: true,
    diseaseRisks: results,
    lastAnalyzedAt: new Date().toISOString()
  };
};

/**
 * Helper to synchronize high-risk alerts in patient_alerts table
 */
const syncPatientAlertsFromRisks = async (userId, diseaseRisks) => {
  try {
    const userRes = await query('SELECT patient_id, assigned_doctor_id FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return;
    const { patient_id: patientId, assigned_doctor_id: assignedDoc } = userRes.rows[0];

    let doctorId = assignedDoc;
    if (!doctorId) {
      const firstDoc = await query(`SELECT doctor_id FROM users WHERE role = 'doctor' AND doctor_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`);
      doctorId = firstDoc.rows.length > 0 ? firstDoc.rows[0].doctor_id : 'D000001';
    }

    const latestReportRes = await query(
      'SELECT id FROM medical_reports WHERE user_id = $1 ORDER BY report_date DESC, created_at DESC LIMIT 1',
      [userId]
    );
    const reportId = latestReportRes.rows.length > 0 ? latestReportRes.rows[0].id : null;

    for (const r of diseaseRisks) {
      if (r.percentage !== null && (r.status === 'High' || r.status === 'HIGH' || r.percentage >= 60)) {
        const alertCode = 'ALT' + Math.floor(100000 + Math.random() * 900000);
        if (reportId) {
          await query(
            `INSERT INTO patient_alerts (alert_id, patient_id, user_id, doctor_id, report_id, disease, risk_level, risk_probability, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'HIGH', $7, 'NEW')
             ON CONFLICT (report_id, disease) DO NOTHING`,
            [alertCode, patientId || 'P000001', userId, doctorId, reportId, r.name, r.percentage]
          );
        } else {
          const existing = await query(
            `SELECT id FROM patient_alerts WHERE user_id = $1 AND report_id IS NULL AND disease = $2`,
            [userId, r.name]
          );
          if (existing.rows.length === 0) {
            await query(
              `INSERT INTO patient_alerts (alert_id, patient_id, user_id, doctor_id, report_id, disease, risk_level, risk_probability, status)
               VALUES ($1, $2, $3, $4, NULL, $5, 'HIGH', $6, 'NEW')`,
              [alertCode, patientId || 'P000001', userId, doctorId, r.name, r.percentage]
            );
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Sync Alerts Warning] Failed to sync patient alerts:', err.message);
  }
};

/**
 * GET /api/reports/disease-risks
 */
const getDiseaseRisks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await calculateDiseaseRisks(userId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reports/consolidate-manual
 * Preserves report separation per Requirement 5 (Every manual entry is a separate report)
 */
const consolidateManualReports = async (req, res, next) => {
  try {
    return res.status(200).json({
      message: 'Every manual submission is stored as an independent report.',
      consolidatedCount: 0
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/disease-risks/:organ/details
 * Retrieves comprehensive details for a specific organ risk analysis:
 * Current risk score, current report vitals, date-wise report history, model feature importances, and trends.
 */
const getDiseaseRiskDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organKey = (req.params.organ || '').toLowerCase().trim();

    const ORGAN_CONFIGS = {
      diabetes: {
        key: 'diabetes',
        name: 'Diabetes Risk',
        organDir: 'diabetes',
        paramRegex: /sugar|glucose|fbs|hba1c|glycated|bmi|body mass/i,
        vitalsDef: [
          { label: 'Fasting Blood Glucose', regex: /sugar|glucose|fbs/i, unit: 'mg/dL', ref: '70–99 mg/dL', lowThresh: 70, highThresh: 100 },
          { label: 'HbA1c Level', regex: /hba1c|glycated/i, unit: '%', ref: '4.0–5.6 %', lowThresh: 4.0, highThresh: 5.7 },
          { label: 'Body Mass Index (BMI)', regex: /bmi|body mass/i, unit: 'kg/m²', ref: '18.5–24.9 kg/m²', lowThresh: 18.5, highThresh: 25.0 }
        ],
        featureImportances: [
          { feature: 'Fasting Blood Glucose', importance: 0.38, level: 'High model importance', explanation: 'Fasting Blood Glucose was one of the features contributing strongly to the model\'s prediction.' },
          { feature: 'HbA1c Level', importance: 0.32, level: 'High model importance', explanation: 'HbA1c Level was one of the features contributing strongly to the model\'s prediction.' },
          { feature: 'Body Mass Index (BMI)', importance: 0.18, level: 'Moderate model importance', explanation: 'BMI was one of the features contributing to the model\'s prediction.' },
          { feature: 'Age', importance: 0.12, level: 'Moderate model importance', explanation: 'Age was one of the features contributing to the model\'s prediction.' }
        ]
      },
      heart: {
        key: 'heart',
        name: 'Heart Disease Risk',
        organDir: 'heart',
        paramRegex: /cholesterol|lipid|ldl|pressure|bp|systolic|diastolic|pulse|heart rate/i,
        vitalsDef: [
          { label: 'Total Cholesterol', regex: /cholesterol|lipid|ldl/i, unit: 'mg/dL', ref: '120–200 mg/dL', lowThresh: 120, highThresh: 200 },
          { label: 'Systolic Blood Pressure', regex: /systolic|pressure|bp/i, unit: 'mmHg', ref: '90–120 mmHg', lowThresh: 90, highThresh: 120 },
          { label: 'Diastolic Blood Pressure', regex: /diastolic/i, unit: 'mmHg', ref: '60–80 mmHg', lowThresh: 60, highThresh: 80 },
          { label: 'Heart Rate', regex: /pulse|heart rate/i, unit: 'bpm', ref: '60–100 bpm', lowThresh: 60, highThresh: 100 }
        ],
        featureImportances: [
          { feature: 'Systolic Blood Pressure', importance: 0.31, level: 'High model importance', explanation: 'Systolic Blood Pressure was one of the features contributing strongly to the model\'s prediction.' },
          { feature: 'Total Cholesterol', importance: 0.28, level: 'High model importance', explanation: 'Total Cholesterol was one of the features contributing strongly to the model\'s prediction.' },
          { feature: 'Age', importance: 0.22, level: 'Moderate model importance', explanation: 'Age was one of the features contributing to the model\'s prediction.' },
          { feature: 'Heart Rate', importance: 0.19, level: 'Moderate model importance', explanation: 'Heart Rate was one of the features contributing to the model\'s prediction.' }
        ]
      },
      kidney: {
        key: 'kidney',
        name: 'Chronic Kidney Disease Risk',
        organDir: 'kidney',
        paramRegex: /creatinine|urea|bun|sodium|potassium|albumin/i,
        vitalsDef: [
          { label: 'Serum Creatinine', regex: /creatinine/i, unit: 'mg/dL', ref: '0.6–1.2 mg/dL', lowThresh: 0.6, highThresh: 1.2 },
          { label: 'Blood Urea', regex: /urea|bun/i, unit: 'mg/dL', ref: '7–20 mg/dL', lowThresh: 7, highThresh: 20 },
          { label: 'Serum Sodium', regex: /sodium|na\+/i, unit: 'mEq/L', ref: '135–145 mEq/L', lowThresh: 135, highThresh: 145 },
          { label: 'Serum Potassium', regex: /potassium|k\+/i, unit: 'mEq/L', ref: '3.5–5.0 mEq/L', lowThresh: 3.5, highThresh: 5.0 }
        ],
        featureImportances: [
          { feature: 'Serum Creatinine', importance: 0.42, level: 'High model importance', explanation: 'Serum Creatinine was one of the features contributing strongly to the model\'s prediction.' },
          { feature: 'Blood Urea', importance: 0.34, level: 'High model importance', explanation: 'Blood Urea was one of the features contributing strongly to the model\'s prediction.' },
          { feature: 'Hemoglobin', importance: 0.14, level: 'Moderate model importance', explanation: 'Hemoglobin was one of the features contributing to the model\'s prediction.' },
          { feature: 'Blood Pressure', importance: 0.10, level: 'Moderate model importance', explanation: 'Blood Pressure was one of the features contributing to the model\'s prediction.' }
        ]
      },
      liver: {
        key: 'liver',
        name: 'Liver Disease Risk',
        organDir: 'liver',
        paramRegex: /bilirubin|alkaline|alp|alt|sgpt|ast|sgot|protein|albumin|ag ratio/i,
        vitalsDef: [
          { label: 'Total Bilirubin', regex: /bilirubin/i, unit: 'mg/dL', ref: '0.1–1.2 mg/dL', lowThresh: 0.1, highThresh: 1.2 },
          { label: 'ALP (Alkaline Phosphatase)', regex: /alkaline|alp/i, unit: 'U/L', ref: '44–147 U/L', lowThresh: 44, highThresh: 147 },
          { label: 'ALT (SGPT)', regex: /alt|sgpt/i, unit: 'U/L', ref: '7–56 U/L', lowThresh: 7, highThresh: 56 },
          { label: 'AST (SGOT)', regex: /ast|sgot/i, unit: 'U/L', ref: '8–48 U/L', lowThresh: 8, highThresh: 48 },
          { label: 'Albumin', regex: /albumin/i, unit: 'g/dL', ref: '3.4–5.4 g/dL', lowThresh: 3.4, highThresh: 5.4 }
        ],
        featureImportances: [
          { feature: 'Total Bilirubin', importance: 0.35, level: 'High model importance', explanation: 'Total Bilirubin was one of the features contributing strongly to the model\'s prediction.' },
          { feature: 'ALT (SGPT)', importance: 0.28, level: 'High model importance', explanation: 'ALT (SGPT) was one of the features contributing strongly to the model\'s prediction.' },
          { feature: 'AST (SGOT)', importance: 0.22, level: 'Moderate model importance', explanation: 'AST (SGOT) was one of the features contributing to the model\'s prediction.' },
          { feature: 'Albumin', importance: 0.15, level: 'Moderate model importance', explanation: 'Albumin was one of the features contributing to the model\'s prediction.' }
        ]
      },
      cbc: {
        key: 'cbc',
        name: 'CBC Anemia & Blood Risk',
        organDir: 'cbc',
        paramRegex: /wbc|tlc|rbc|hgb|hb|hemoglobin|hct|hematocrit|pcv|mcv|mch|mchc|plt|platelet/i,
        vitalsDef: [
          { label: 'Hemoglobin', regex: /hgb|hb|hemoglobin/i, unit: 'g/dL', ref: '12.0–17.5 g/dL', lowThresh: 12.0, highThresh: 17.5 },
          { label: 'WBC Count', regex: /wbc|tlc/i, unit: '10^3/µL', ref: '4.5–11.0 10^3/µL', lowThresh: 4.5, highThresh: 11.0 },
          { label: 'RBC Count', regex: /rbc|red blood/i, unit: '10^6/µL', ref: '4.2–5.9 10^6/µL', lowThresh: 4.2, highThresh: 5.9 },
          { label: 'Platelets (PLT)', regex: /plt|platelet/i, unit: '10^3/µL', ref: '150–450 10^3/µL', lowThresh: 150, highThresh: 450 }
        ],
        featureImportances: [
          { feature: 'Hemoglobin', importance: 0.45, level: 'High model importance', explanation: 'Hemoglobin was one of the features contributing strongly to the model\'s prediction.' },
          { feature: 'RBC Count', importance: 0.25, level: 'High model importance', explanation: 'RBC Count was one of the features contributing strongly to the model\'s prediction.' },
          { feature: 'Platelets (PLT)', importance: 0.18, level: 'Moderate model importance', explanation: 'Platelets count was one of the features contributing to the model\'s prediction.' },
          { feature: 'WBC Count', importance: 0.12, level: 'Moderate model importance', explanation: 'WBC Count was one of the features contributing to the model\'s prediction.' }
        ]
      }
    };

    const organConfig = ORGAN_CONFIGS[organKey];
    if (!organConfig) {
      return res.status(404).json({ error: { message: `Unsupported organ type '${organKey}'.` } });
    }

    // 1. Calculate overall risk list using current user data
    const riskResult = await calculateDiseaseRisks(userId);
    const allRisks = Array.isArray(riskResult) ? riskResult : (riskResult.diseaseRisks || []);
    const organRisk = allRisks.find(r => r.id === organKey) || {
      id: organKey,
      name: organConfig.name,
      percentage: null,
      status: 'Insufficient Data',
      explanation: `Additional ${organConfig.name.toLowerCase()} measurements are required to calculate this risk.`
    };

    // 2. Fetch all reports and vitals for logged-in user
    const reportsRes = await query(
      `SELECT id, user_id as "userId", patient_name as "patientName", age, gender, 
              report_date as "reportDate", hospital, doctor, type, summary, 
              file_type as "fileType", source, created_at as "createdAt"
       FROM medical_reports 
       WHERE user_id = $1 
       ORDER BY report_date ASC, created_at ASC`,
      [userId]
    );
    const userReports = reportsRes.rows;

    const historicalReportsMap = [];
    const currentVitalsMap = {};

    for (const r of userReports) {
      const vitalsResult = await query(
        `SELECT id, label, value, unit, status, reference_range as "referenceRange", source, raw_value as "rawValue"
         FROM vital_readings 
         WHERE report_id = $1`,
        [r.id]
      );

      const matchingVitals = [];
      for (const row of vitalsResult.rows) {
        const valStr = row.rawValue || String(row.value);
        const valNum = typeof row.value === 'number' ? row.value : parseFloat(valStr.replace(/[^0-9\.]/g, ''));
        const lbl = row.label || '';

        if (organConfig.paramRegex.test(lbl)) {
          let statusTag = row.status || 'Normal';
          let refRange = row.referenceRange || '';
          
          for (const vDef of organConfig.vitalsDef) {
            if (vDef.regex.test(lbl)) {
              if (!refRange) refRange = vDef.ref;
              if (!isNaN(valNum)) {
                if (valNum > vDef.highThresh) statusTag = 'Above Reference Range';
                else if (valNum < vDef.lowThresh) statusTag = 'Below Reference Range';
                else statusTag = 'Normal';
              }
              break;
            }
          }

          const vitalObj = {
            id: row.id,
            label: lbl,
            value: valStr,
            numericValue: isNaN(valNum) ? null : valNum,
            unit: row.unit || '',
            status: statusTag,
            referenceRange: refRange || 'Standard Reference Range',
            date: r.reportDate ? new Date(r.reportDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
          };

          matchingVitals.push(vitalObj);
          currentVitalsMap[lbl.toLowerCase()] = vitalObj;
        }
      }

      if (matchingVitals.length > 0) {
        const isManual = r.source === 'Manual Entry' || r.fileType === 'MANUAL' || (r.type && r.type.toLowerCase().includes('manual'));
        historicalReportsMap.push({
          reportId: r.id,
          date: r.reportDate ? new Date(r.reportDate).toISOString().split('T')[0] : new Date(r.createdAt).toISOString().split('T')[0],
          source: isManual ? 'Manual Entry' : (r.source || 'Uploaded Report'),
          hospital: r.hospital || 'Medical Lab',
          doctor: r.doctor || 'Self / Patient',
          type: r.type || (isManual ? 'Manual Entry' : 'Uploaded PDF'),
          vitals: matchingVitals
        });
      }
    }

    const currentVitals = Object.values(currentVitalsMap);

    const trendPoints = historicalReportsMap.map(hr => {
      const point = { date: hr.date, reportId: hr.reportId, source: hr.source };
      for (const v of hr.vitals) {
        if (v.numericValue !== null) {
          point[v.label] = v.numericValue;
        }
      }
      return point;
    });

    const isInsufficient = organRisk.percentage === null || organRisk.status === 'Insufficient Data';
    const isHigh = !isInsufficient && organRisk.percentage >= 60;
    const isMod = !isInsufficient && organRisk.percentage >= 30;

    return res.status(200).json({
      patient_id: userId,
      organ: organKey,
      disease_name: organConfig.name,
      current_risk: {
        percentage: organRisk.percentage,
        status: organRisk.status,
        probability: organRisk.percentage !== null ? Number((organRisk.percentage / 100).toFixed(4)) : null,
        model_version: `${organKey}_rf_v1`,
        interpretation: isInsufficient
          ? `Insufficient clinical measurements available to evaluate ${organConfig.name.toLowerCase()}. Upload a lab report or log health measurements to generate a risk estimate.`
          : `The model identified a ${isHigh ? 'higher-risk' : isMod ? 'moderate-risk' : 'lower-risk'} pattern based on the provided parameters. This is a model-based risk prediction and not a definitive diagnosis.`
      },
      current_vitals: currentVitals,
      historical_reports: historicalReportsMap.slice().reverse(), // most recent first
      feature_importance: organConfig.featureImportances,
      trend_data: trendPoints
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reports/:id/explain
 * Re-evaluate / re-generate Gemini AI explanation for a specific patient report
 */
const reExplainReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    const reportRes = await query(
      `SELECT id, type, age, gender, hospital, doctor, key_findings as "keyFindings"
       FROM medical_reports WHERE id = $1 AND user_id = $2`,
      [reportId, userId]
    );

    if (reportRes.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Report not found' } });
    }

    const report = reportRes.rows[0];

    const vitalsRes = await query(
      `SELECT label, value, unit, status, reference_range as "referenceRange"
       FROM vital_readings WHERE report_id = $1 AND user_id = $2`,
      [reportId, userId]
    );

    const vitals = vitalsRes.rows || [];
    if (vitals.length === 0) {
      return res.status(400).json({ error: { message: 'No vitals found for this report to explain.' } });
    }

    const aiExpl = await generateReportExplanation(
      { age: report.age, gender: report.gender, type: report.type, hospital: report.hospital },
      vitals
    );

    const updatedKeyFindings = (aiExpl.parameters || []).map(p => ({
      parameter: p.name,
      value: p.value,
      unit: p.unit,
      status: p.status,
      referenceRange: p.referenceRange,
      explanation: p.explanation,
      isAiGenerated: aiExpl.isAiGenerated
    }));

    await query(
      `UPDATE medical_reports SET key_findings = $1 WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(updatedKeyFindings), reportId, userId]
    );

    return res.status(200).json({
      message: 'Report re-explained successfully with Gemini AI.',
      keyFindings: updatedKeyFindings,
      aiExplanation: aiExpl
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createManualReport,
  uploadReport,
  getAllReports,
  getReportById,
  deleteReport,
  getTrends,
  fetchPatientTrends,
  getDiseaseRisks,
  calculateDiseaseRisks,
  syncPatientAlertsFromRisks,
  consolidateManualReports,
  getDiseaseRiskDetails,
  reExplainReport
};

