const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

async function testDoctorSearch() {
  console.log('=== Testing Doctor Search Route Authorization & Retrieval ===');
  try {
    // Fetch Doctor Rupesh
    const docRes = await pool.query("SELECT id, email, role, doctor_id FROM users WHERE email = 'rupesh@gmail.com'");
    if (docRes.rows.length === 0) {
      console.log('Doctor Rupesh not found in DB');
      return;
    }
    const doc = docRes.rows[0];
    console.log('Found Doctor:', doc);

    // Sign JWT token for Rupesh
    const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me_in_prod_123456789';
    const token = jwt.sign(
      { id: doc.id, email: doc.email, role: doc.role, doctorId: doc.doctor_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Fetch Patient Sudeep
    const patRes = await pool.query("SELECT id, email, role, patient_id FROM users WHERE email = 'kathisudeepgoud@gmail.com'");
    if (patRes.rows.length === 0) {
      console.log('Patient Sudeep not found in DB');
      return;
    }
    const pat = patRes.rows[0];
    console.log('Found Patient:', pat);

    const { searchPatient } = require('../controllers/doctor.controller');

    const req = {
      user: { id: doc.id, role: doc.role },
      query: { patientId: pat.patient_id }
    };

    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) {
        console.log('Controller Response Status:', this.statusCode);
        console.log('Controller Response Data:', JSON.stringify(data, null, 2));
        if (this.statusCode === 200 && data.patient && data.patient.patientId === pat.patient_id) {
          console.log('=== DOCTOR SEARCH CONTROLLER TEST SUCCESSFUL! ===');
        } else {
          console.error('=== DOCTOR SEARCH CONTROLLER TEST FAILED! ===');
        }
      }
    };

    await searchPatient(req, res, (err) => console.error('Next error:', err));
  } catch (err) {
    console.error('Error during doctor search test:', err);
  } finally {
    await pool.end();
  }
}

testDoctorSearch();
