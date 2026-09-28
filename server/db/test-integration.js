const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function testIntegration() {
  console.log('=== MedAssist AI Integration Verification ===');
  try {
    // 1. Verify schema columns
    const columnsRes = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'`
    );
    const cols = columnsRes.rows.map(c => c.column_name);
    console.log('Users table columns:', cols);

    if (!cols.includes('role') || !cols.includes('patient_id') || !cols.includes('doctor_id')) {
      throw new Error('Missing required columns role/patient_id/doctor_id in users table!');
    }

    // 2. Clean up test accounts if existing
    await pool.query("DELETE FROM users WHERE email IN ('testpatient@example.com', 'testdoctor@example.com')");

    // 3. Test Patient registration ID generation
    const passHash = await bcrypt.hash('Password123!', 10);
    
    // Get next P id
    const pMaxRes = await pool.query("SELECT patient_id FROM users WHERE patient_id LIKE 'P%' ORDER BY patient_id DESC LIMIT 1");
    let nextPNum = 1;
    if (pMaxRes.rows.length > 0 && pMaxRes.rows[0].patient_id) {
      const m = pMaxRes.rows[0].patient_id.match(/P(\d+)/);
      if (m) nextPNum = parseInt(m[1], 10) + 1;
    }
    const testPId = 'P' + String(nextPNum).padStart(6, '0');

    const patientInsert = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, patient_id)
       VALUES ($1, $2, $3, 'patient', $4)
       RETURNING id, name, email, role, patient_id`,
      ['Test Patient', 'testpatient@example.com', passHash, testPId]
    );
    console.log('Created Patient:', patientInsert.rows[0]);

    // Get next D id
    const dMaxRes = await pool.query("SELECT doctor_id FROM users WHERE doctor_id LIKE 'D%' ORDER BY doctor_id DESC LIMIT 1");
    let nextDNum = 1;
    if (dMaxRes.rows.length > 0 && dMaxRes.rows[0].doctor_id) {
      const m = dMaxRes.rows[0].doctor_id.match(/D(\d+)/);
      if (m) nextDNum = parseInt(m[1], 10) + 1;
    }
    const testDId = 'D' + String(nextDNum).padStart(6, '0');

    const doctorInsert = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, doctor_id)
       VALUES ($1, $2, $3, 'doctor', $4)
       RETURNING id, name, email, role, doctor_id`,
      ['Dr. Test Doctor', 'testdoctor@example.com', passHash, testDId]
    );
    console.log('Created Doctor:', doctorInsert.rows[0]);

    // 4. Test report & vitals storage for patient
    const reportInsert = await pool.query(
      `INSERT INTO medical_reports (user_id, patient_name, age, gender, report_date, hospital, doctor, type, summary)
       VALUES ($1, 'Test Patient', 35, 'Male', CURRENT_DATE, 'City General Hospital', 'Dr. Smith', 'Blood Test Panel', 'Fasting glucose 110 mg/dL, Cholesterol 195 mg/dL')
       RETURNING id`,
      [patientInsert.rows[0].id]
    );
    const reportId = reportInsert.rows[0].id;

    await pool.query(
      `INSERT INTO vital_readings (user_id, report_id, label, value, unit, status)
       VALUES 
       ($1, $2, 'Fasting Blood Sugar', 110.0, 'mg/dL', 'borderline'),
       ($1, $2, 'Total Cholesterol', 195.0, 'mg/dL', 'normal')`,
      [patientInsert.rows[0].id, reportId]
    );

    // 5. Test Doctor Patient Search SQL
    const searchRes = await pool.query(
      `SELECT id, name, email, role, patient_id as "patientId" FROM users WHERE LOWER(patient_id) = LOWER($1) AND role = 'patient'`,
      [testPId]
    );
    console.log(`Doctor Search for ${testPId} returned:`, searchRes.rows[0]);

    // Clean up test data
    await pool.query("DELETE FROM users WHERE email IN ('testpatient@example.com', 'testdoctor@example.com')");
    console.log('=== Integration Verification PASSED CLEANLY! ===');

  } catch (err) {
    console.error('Integration verification failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testIntegration();
