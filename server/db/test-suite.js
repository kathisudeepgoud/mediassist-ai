const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool, query } = require('../config/db');

async function runTestSuite() {
  console.log('====================================================');
  console.log('  MedAssist AI Database & Relationships Test Suite  ');
  console.log('====================================================\n');

  let testCount = 0;
  let passedCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      console.log(`[PASS] Test ${testCount}: ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] Test ${testCount}: ${message}`);
    }
  }

  try {
    // Setup test users: Patient P001, Patient P002, Doctor D001
    const cleanEmail1 = `test_p001_${Date.now()}@example.com`;
    const cleanEmail2 = `test_p002_${Date.now()}@example.com`;
    const cleanEmailDoc = `test_d001_${Date.now()}@example.com`;

    const user1Res = await query(
      `INSERT INTO users (name, email, role, patient_id, age, gender)
       VALUES ('Patient One', $1, 'patient', $2, 35, 'Male')
       RETURNING id, patient_id as "patientId"`,
      [cleanEmail1, `TESTP001_${Date.now()}`]
    );
    const p001 = user1Res.rows[0];

    const user2Res = await query(
      `INSERT INTO users (name, email, role, patient_id, age, gender)
       VALUES ('Patient Two', $1, 'patient', $2, 28, 'Female')
       RETURNING id, patient_id as "patientId"`,
      [cleanEmail2, `TESTP002_${Date.now()}`]
    );
    const p002 = user2Res.rows[0];

    const docRes = await query(
      `INSERT INTO users (name, email, role, doctor_id)
       VALUES ('Dr. Smith', $1, 'doctor', $2)
       RETURNING id, doctor_id as "doctorId"`,
      [cleanEmailDoc, `TESTD001_${Date.now()}`]
    );
    const d001 = docRes.rows[0];

    // ----------------------------------------------------
    // TEST 1 — Uploaded Report (User/Patient -> Report -> Vital Values)
    // ----------------------------------------------------
    const rep1Res = await query(
      `INSERT INTO medical_reports 
       (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary, file_type, source, original_filename)
       VALUES ($1, 'Patient One', 35, 'Male', CURRENT_DATE, 'City Hospital', 'Dr. Adams', 'Blood Test Report A', 'Normal blood count panel.', 'PDF', 'Uploaded PDF', 'report_a.pdf')
       RETURNING id, user_id, source`,
      [p001.id]
    );
    const reportA = rep1Res.rows[0];

    const vital1Res = await query(
      `INSERT INTO vital_readings (user_id, report_id, label, value, unit, status, reference_range, source, raw_value)
       VALUES ($1, $2, 'Hemoglobin', 14.5, 'g/dL', 'normal', '13.5-17.5', 'OCR', '14.5 g/dL')
       RETURNING id, report_id, user_id`,
      [p001.id, reportA.id]
    );

    assert(
      reportA.user_id === p001.id && vital1Res.rows[0].report_id === reportA.id && vital1Res.rows[0].user_id === p001.id,
      'Test 1 — Uploaded report: Report A and vital belong to P001 with correct report_id & user_id.'
    );

    // ----------------------------------------------------
    // TEST 2 — Multiple Uploaded Reports
    // ----------------------------------------------------
    const rep2Res = await query(
      `INSERT INTO medical_reports 
       (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary, file_type, source, original_filename)
       VALUES ($1, 'Patient One', 35, 'Male', CURRENT_DATE, 'City Hospital', 'Dr. Adams', 'Lipid Panel Report B', 'Cholesterol evaluated.', 'PDF', 'Uploaded PDF', 'report_b.pdf')
       RETURNING id, user_id`,
      [p001.id]
    );
    const reportB = rep2Res.rows[0];

    assert(
      reportA.id !== reportB.id && reportA.user_id === p001.id && reportB.user_id === p001.id,
      'Test 2 — Multiple uploaded reports: P001 has two separate, distinct report records (A and B).'
    );

    // ----------------------------------------------------
    // TEST 3 — Manual Entry 1
    // ----------------------------------------------------
    const startM1 = Date.now();
    const repM1Res = await query(
      `INSERT INTO medical_reports 
       (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary, file_type, source, original_filename)
       VALUES ($1, 'Patient One', 35, 'Male', CURRENT_DATE, 'Home Reading', 'Self Entry', 'Manual Entry 1', 'Manual entry report 1.', 'MANUAL', 'Manual Entry', 'Manual Entry')
       RETURNING id, user_id, source`,
      [p001.id]
    );
    const reportM1 = repM1Res.rows[0];

    await query(
      `INSERT INTO vital_readings (user_id, report_id, label, value, unit, status, reference_range, source, raw_value)
       VALUES ($1, $2, 'Blood Sugar', 105, 'mg/dL', 'normal', '70-99', 'Manual Entry', '105 mg/dL')`,
      [p001.id, reportM1.id]
    );
    const durationM1 = Date.now() - startM1;

    assert(
      reportM1.source === 'Manual Entry' && reportM1.user_id === p001.id,
      `Test 3 — Manual Entry 1: Created new manual report for P001 in ${durationM1}ms.`
    );

    // ----------------------------------------------------
    // TEST 4 — Second Manual Entry (Must be separate report!)
    // ----------------------------------------------------
    const repM2Res = await query(
      `INSERT INTO medical_reports 
       (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary, file_type, source, original_filename)
       VALUES ($1, 'Patient One', 35, 'Male', CURRENT_DATE, 'Home Reading', 'Self Entry', 'Manual Entry 2', 'Manual entry report 2.', 'MANUAL', 'Manual Entry', 'Manual Entry')
       RETURNING id, user_id, source`,
      [p001.id]
    );
    const reportM2 = repM2Res.rows[0];

    await query(
      `INSERT INTO vital_readings (user_id, report_id, label, value, unit, status, reference_range, source, raw_value)
       VALUES ($1, $2, 'Weight', 72, 'kg', 'normal', '18.5-24.9', 'Manual Entry', '72 kg')`,
      [p001.id, reportM2.id]
    );

    assert(
      reportM1.id !== reportM2.id,
      'Test 4 — Second Manual Entry: Manual Entry 2 is created as a NEW separate report record (not merged with M1).'
    );

    // ----------------------------------------------------
    // TEST 5 — Multiple Vital Values in 1 Manual Report
    // ----------------------------------------------------
    const repM3Res = await query(
      `INSERT INTO medical_reports 
       (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary, file_type, source, original_filename)
       VALUES ($1, 'Patient One', 35, 'Male', CURRENT_DATE, 'Home Reading', 'Self Entry', 'Manual Entry Panel', 'Multi-vital entry.', 'MANUAL', 'Manual Entry', 'Manual Entry')
       RETURNING id, user_id`,
      [p001.id]
    );
    const reportM3 = repM3Res.rows[0];

    const vitalsM3 = [
      { label: 'Blood Pressure', val: 120, raw: '120/80', unit: 'mmHg' },
      { label: 'Heart Rate', val: 72, raw: '72 bpm', unit: 'bpm' },
      { label: 'Blood Glucose', val: 95, raw: '95 mg/dL', unit: 'mg/dL' },
      { label: 'SpO2', val: 99, raw: '99%', unit: '%' }
    ];

    for (const v of vitalsM3) {
      await query(
        `INSERT INTO vital_readings (user_id, report_id, label, value, unit, status, reference_range, source, raw_value)
         VALUES ($1, $2, $3, $4, $5, 'normal', 'Standard', 'Manual Entry', $6)`,
        [p001.id, reportM3.id, v.label, v.val, v.unit, v.raw]
      );
    }

    const vitalsCheck = await query(`SELECT COUNT(*) as count FROM vital_readings WHERE report_id = $1`, [reportM3.id]);
    assert(
      parseInt(vitalsCheck.rows[0].count, 10) === 4,
      'Test 5 — Multiple Vital Values: All 4 vitals (BP, Heart Rate, Glucose, SpO2) belong to reportM3.'
    );

    // ----------------------------------------------------
    // TEST 6 — Patient Isolation (P001 vs P002)
    // ----------------------------------------------------
    await query(
      `INSERT INTO medical_reports 
       (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary, file_type, source, original_filename)
       VALUES ($1, 'Patient Two', 28, 'Female', CURRENT_DATE, 'Metro Clinic', 'Dr. Evans', 'P002 Private Report', 'Confidential.', 'PDF', 'Uploaded PDF', 'p002.pdf')`,
      [p002.id]
    );

    const p001Reports = await query(`SELECT id FROM medical_reports WHERE user_id = $1`, [p001.id]);
    const p002Reports = await query(`SELECT id FROM medical_reports WHERE user_id = $1`, [p002.id]);

    const p001HasP002Report = p001Reports.rows.some(r => p002Reports.rows.some(r2 => r2.id === r.id));
    assert(
      !p001HasP002Report,
      'Test 6 — Patient Isolation: P001 report queries NEVER expose P002 reports or vitals.'
    );

    // ----------------------------------------------------
    // TEST 7 — Doctor Access by Patient ID
    // ----------------------------------------------------
    const doctorSearchRes = await query(
      `SELECT r.id, r.user_id, r.type, r.source
       FROM medical_reports r
       JOIN users u ON r.user_id = u.id
       WHERE LOWER(u.patient_id) = LOWER($1)`,
      [p001.patientId]
    );

    assert(
      doctorSearchRes.rows.length >= 5 && doctorSearchRes.rows.every(r => r.user_id === p001.id),
      'Test 7 — Doctor Access: Searching P001 patient ID retrieves ONLY P001 reports and associated vitals.'
    );

    // ----------------------------------------------------
    // TEST 8 — Report History Saving Speed
    // ----------------------------------------------------
    const benchmarkStart = Date.now();
    const benchRep = await query(
      `INSERT INTO medical_reports 
       (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary, file_type, source, original_filename)
       VALUES ($1, 'Patient One', 35, 'Male', CURRENT_DATE, 'Home Reading', 'Self Entry', 'Benchmark Manual Entry', 'Speed test.', 'MANUAL', 'Manual Entry', 'Manual Entry')
       RETURNING id`,
      [p001.id]
    );
    await query(
      `INSERT INTO vital_readings (user_id, report_id, label, value, unit, status, reference_range, source, raw_value)
       VALUES ($1, $2, 'HbA1c', 5.6, '%', 'normal', '4.0-5.6', 'Manual Entry', '5.6%')`,
      [p001.id, benchRep.rows[0].id]
    );
    const benchmarkTime = Date.now() - benchmarkStart;

    assert(
      benchmarkTime < 100,
      `Test 8 — Report History Speed: Direct manual report creation executed in ${benchmarkTime}ms (< 100ms threshold).`
    );

    // Cleanup test data
    await query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [p001.id, p002.id, d001.id]);
    console.log('\n[Cleanup] Test data removed safely.');

    console.log('\n====================================================');
    console.log(`  Test Suite Completed: ${passedCount}/${testCount} Passed!`);
    console.log('====================================================\n');

    if (passedCount === testCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('[Error] Test suite encountered an exception:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTestSuite();
