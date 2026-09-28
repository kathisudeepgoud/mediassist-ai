const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool, query } = require('../config/db');
const { getDoctorStats, searchPatient, getPatientAlerts, markAlertReviewed } = require('../controllers/doctor.controller');
const { syncPatientAlertsFromRisks } = require('../controllers/report.controller');

async function runDoctorFeaturesTestSuite() {
  console.log('===========================================================');
  console.log('  MedAssist AI Doctor Section Comprehensive Test Suite     ');
  console.log('===========================================================\n');

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
    const timestamp = Date.now();
    const testDoc1Id = `DTEST1_${timestamp}`;
    const testDoc2Id = `DTEST2_${timestamp}`;
    const testPat1Id = `PTEST1_${timestamp}`;
    const testPat2Id = `PTEST2_${timestamp}`;

    // Create Doctor D001
    const doc1Res = await query(
      `INSERT INTO users (name, email, role, doctor_id)
       VALUES ('Dr. Alpha', $1, 'doctor', $2)
       RETURNING id, doctor_id as "doctorId"`,
      [`doc_alpha_${timestamp}@example.com`, testDoc1Id]
    );
    const doc1 = doc1Res.rows[0];

    // Create Doctor D002
    const doc2Res = await query(
      `INSERT INTO users (name, email, role, doctor_id)
       VALUES ('Dr. Beta', $1, 'doctor', $2)
       RETURNING id, doctor_id as "doctorId"`,
      [`doc_beta_${timestamp}@example.com`, testDoc2Id]
    );
    const doc2 = doc2Res.rows[0];

    // Create Patient P001 assigned to D001
    const pat1Res = await query(
      `INSERT INTO users (name, email, role, patient_id, assigned_doctor_id, age, gender)
       VALUES ('Patient Alpha', $1, 'patient', $2, $3, 42, 'Male')
       RETURNING id, patient_id as "patientId", assigned_doctor_id as "assignedDoctorId"`,
      [`pat_alpha_${timestamp}@example.com`, testPat1Id, testDoc1Id]
    );
    const pat1 = pat1Res.rows[0];

    // Create Patient P002 assigned to D002
    const pat2Res = await query(
      `INSERT INTO users (name, email, role, patient_id, assigned_doctor_id, age, gender)
       VALUES ('Patient Beta', $1, 'patient', $2, $3, 38, 'Female')
       RETURNING id, patient_id as "patientId", assigned_doctor_id as "assignedDoctorId"`,
      [`pat_beta_${timestamp}@example.com`, testPat2Id, testDoc2Id]
    );
    const pat2 = pat2Res.rows[0];

    // -------------------------------------------------------------------
    // TEST 1 — Doctor D001 Dashboard Stats (Filtered to D001)
    // -------------------------------------------------------------------
    const reqStats1 = { user: { id: doc1.id, role: 'doctor', doctorId: testDoc1Id } };
    let stats1Data = null;
    const resStats1 = {
      status(code) { return this; },
      json(data) { stats1Data = data; }
    };
    await getDoctorStats(reqStats1, resStats1, (err) => console.error(err));
    assert(
      stats1Data && stats1Data.totalPatients === 1,
      `TEST 1: Doctor D001 Total Patients = 1 (Counted strictly D001's assigned patients).`
    );

    // -------------------------------------------------------------------
    // TEST 2 — Doctor D002 Dashboard Stats (Filtered to D002)
    // -------------------------------------------------------------------
    const reqStats2 = { user: { id: doc2.id, role: 'doctor', doctorId: testDoc2Id } };
    let stats2Data = null;
    const resStats2 = {
      status(code) { return this; },
      json(data) { stats2Data = data; }
    };
    await getDoctorStats(reqStats2, resStats2, (err) => console.error(err));
    assert(
      stats2Data && stats2Data.totalPatients === 1,
      `TEST 2: Doctor D002 Total Patients = 1 (Counted strictly D002's assigned patients).`
    );

    // -------------------------------------------------------------------
    // TEST 3 — Doctor D001 searches assigned Patient P001 (Allowed)
    // -------------------------------------------------------------------
    const reqSearch1 = { user: { id: doc1.id, role: 'doctor', doctorId: testDoc1Id }, query: { patientId: testPat1Id } };
    let search1Status = 0;
    let search1Data = null;
    const resSearch1 = {
      status(code) { search1Status = code; return this; },
      json(data) { search1Data = data; }
    };
    await searchPatient(reqSearch1, resSearch1, (err) => console.error(err));
    assert(
      search1Status === 200 && search1Data && search1Data.patient.patientId === testPat1Id,
      `TEST 3: Doctor D001 searching assigned patient P001 returned full patient profile.`
    );

    // -------------------------------------------------------------------
    // TEST 4 — Doctor D001 searches Patient P002 (belonging to D002) -> Access Denied!
    // -------------------------------------------------------------------
    const reqSearch2 = { user: { id: doc1.id, role: 'doctor', doctorId: testDoc1Id }, query: { patientId: testPat2Id } };
    let search2Status = 0;
    let search2Data = null;
    const resSearch2 = {
      status(code) { search2Status = code; return this; },
      json(data) { search2Data = data; }
    };
    await searchPatient(reqSearch2, resSearch2, (err) => console.error(err));
    assert(
      (search2Status === 403 || search2Status === 404) && search2Data?.error?.message === 'Patient not found under your registered patients.',
      `TEST 4: Doctor D001 searching D002's patient P002 correctly denied access ("Patient not found under your registered patients.").`
    );

    // Create a report for Patient P001
    const repRes = await query(
      `INSERT INTO medical_reports (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary)
       VALUES ($1, 'Patient Alpha', 42, 'Male', CURRENT_DATE, 'General Lab', 'Dr. Adams', 'Blood Test', 'Test summary')
       RETURNING id`,
      [pat1.id]
    );
    const report1Id = repRes.rows[0].id;

    // -------------------------------------------------------------------
    // TEST 5 & TEST 8 — High-Risk Alert Creation & Low-Risk Filtering
    // -------------------------------------------------------------------
    // P001 gets Diabetes HIGH, Heart LOW
    await syncPatientAlertsFromRisks(pat1.id, [
      { name: 'Diabetes Risk', status: 'High', percentage: 78 },
      { name: 'Heart Disease Risk', status: 'Low', percentage: 18 }
    ]);

    const reqAlerts1 = { user: { id: doc1.id, role: 'doctor', doctorId: testDoc1Id }, query: { status: 'ALL' } };
    let alerts1Data = null;
    const resAlerts1 = {
      status(code) { return this; },
      json(data) { alerts1Data = data; }
    };
    await getPatientAlerts(reqAlerts1, resAlerts1, (err) => console.error(err));

    assert(
      alerts1Data && alerts1Data.alerts.length === 1 && alerts1Data.alerts[0].disease === 'Diabetes Risk',
      `TEST 5 & 8: High risk created 1 Diabetes alert for D001; Low risk Heart created 0 alerts.`
    );

    // -------------------------------------------------------------------
    // TEST 6 — Duplicate Alert Prevention (Page Refresh / Multi-runs)
    // -------------------------------------------------------------------
    // Re-trigger risk synchronization 5 times for P001
    for (let i = 0; i < 5; i++) {
      await syncPatientAlertsFromRisks(pat1.id, [
        { name: 'Diabetes Risk', status: 'High', percentage: 78 }
      ]);
    }

    let alertsDupData = null;
    const resAlertsDup = {
      status(code) { return this; },
      json(data) { alertsDupData = data; }
    };
    await getPatientAlerts(reqAlerts1, resAlertsDup, (err) => console.error(err));

    assert(
      alertsDupData && alertsDupData.alerts.length === 1,
      `TEST 6: Re-triggering risk analysis 5 times created ZERO duplicate alerts (Strictly 1 alert exists).`
    );

    // -------------------------------------------------------------------
    // TEST 7 — Multiple Disease Alerts for Same Patient
    // -------------------------------------------------------------------
    // P001 gets HIGH for Diabetes, Kidney, and CBC
    await syncPatientAlertsFromRisks(pat1.id, [
      { name: 'Diabetes Risk', status: 'High', percentage: 78 },
      { name: 'Kidney Disease Risk', status: 'High', percentage: 72 },
      { name: 'CBC Anemia & Blood Risk', status: 'High', percentage: 65 }
    ]);

    let alertsMultiData = null;
    const resAlertsMulti = {
      status(code) { return this; },
      json(data) { alertsMultiData = data; }
    };
    await getPatientAlerts(reqAlerts1, resAlertsMulti, (err) => console.error(err));

    assert(
      alertsMultiData && alertsMultiData.alerts.length === 3,
      `TEST 7: P001 with 3 HIGH-risk diseases created 3 distinct disease alerts (Diabetes, Kidney, CBC).`
    );

    // -------------------------------------------------------------------
    // TEST 9 — Alert Status Transition (NEW -> REVIEWED)
    // -------------------------------------------------------------------
    const targetAlert = alertsMultiData.alerts[0];
    const reqReview = { user: { id: doc1.id, role: 'doctor', doctorId: testDoc1Id }, params: { alertId: targetAlert.id } };
    let reviewStatus = 0;
    let reviewData = null;
    const resReview = {
      status(code) { reviewStatus = code; return this; },
      json(data) { reviewData = data; }
    };
    await markAlertReviewed(reqReview, resReview, (err) => console.error(err));

    assert(
      reviewStatus === 200 && reviewData && reviewData.alert.status === 'REVIEWED',
      `TEST 9: Doctor marking alert reviewed transitioned status from NEW -> REVIEWED.`
    );

    // -------------------------------------------------------------------
    // TEST 10 — High-Risk Patients Count (Unique Patient Count)
    // -------------------------------------------------------------------
    let statsAfterData = null;
    const resStatsAfter = {
      status(code) { return this; },
      json(data) { statsAfterData = data; }
    };
    await getDoctorStats(reqStats1, resStatsAfter, (err) => console.error(err));

    assert(
      statsAfterData && statsAfterData.highRiskPatients === 1,
      `TEST 10: High-Risk Patients count = 1 (P001 has 3 alerts, but counts as 1 unique high-risk patient).`
    );

    // -------------------------------------------------------------------
    // TEST 11 — New Patient Alert Count (Unreviewed Alerts)
    // -------------------------------------------------------------------
    assert(
      statsAfterData && statsAfterData.newAlerts === 2,
      `TEST 11: New Patient Alerts count = 2 (Out of 3 alerts, 1 was reviewed and 2 remain NEW).`
    );

    // Clean up test records
    await query('DELETE FROM patient_alerts WHERE user_id IN ($1, $2) OR doctor_id IN ($3, $4)', [pat1.id, pat2.id, testDoc1Id, testDoc2Id]);
    await query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [doc1.id, doc2.id, pat1.id, pat2.id]);
    console.log('\n===========================================================');
    console.log(`  RESULT: ${passedCount} / ${testCount} TESTS PASSED CLEANLY!  `);
    console.log('===========================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await pool.end();
  }
}

runDoctorFeaturesTestSuite();
