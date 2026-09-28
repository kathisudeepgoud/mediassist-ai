const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { pool } = require('../config/db');

async function runMigration() {
  console.log('[Migration] Starting database migration...');
  try {
    const schemaPath = path.join(__dirname, '../schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // Run the migration SQL script
    await pool.query(sql);
    console.log('[Migration] Database schema applied successfully!');

    // Backfill missing role & patient_id/doctor_id for existing users
    const unmigratedUsers = await pool.query(
      `SELECT id, role, patient_id, doctor_id FROM users WHERE role IS NULL OR (role = 'patient' AND patient_id IS NULL) OR (role = 'doctor' AND doctor_id IS NULL) ORDER BY created_at ASC`
    );

    let maxPatientNum = 0;
    const maxPatientRes = await pool.query(
      `SELECT patient_id FROM users WHERE patient_id LIKE 'P%' ORDER BY patient_id DESC LIMIT 1`
    );
    if (maxPatientRes.rows.length > 0 && maxPatientRes.rows[0].patient_id) {
      const match = maxPatientRes.rows[0].patient_id.match(/P(\d+)/);
      if (match) maxPatientNum = parseInt(match[1], 10);
    }

    let maxDoctorNum = 0;
    const maxDoctorRes = await pool.query(
      `SELECT doctor_id FROM users WHERE doctor_id LIKE 'D%' ORDER BY doctor_id DESC LIMIT 1`
    );
    if (maxDoctorRes.rows.length > 0 && maxDoctorRes.rows[0].doctor_id) {
      const match = maxDoctorRes.rows[0].doctor_id.match(/D(\d+)/);
      if (match) maxDoctorNum = parseInt(match[1], 10);
    }

    for (const u of unmigratedUsers.rows) {
      const userRole = u.role || 'patient';
      if (userRole === 'doctor') {
        if (!u.doctor_id) {
          maxDoctorNum++;
          const dId = 'D' + String(maxDoctorNum).padStart(6, '0');
          await pool.query('UPDATE users SET role = $1, doctor_id = $2 WHERE id = $3', ['doctor', dId, u.id]);
        }
      } else {
        if (!u.patient_id) {
          maxPatientNum++;
          const pId = 'P' + String(maxPatientNum).padStart(6, '0');
          await pool.query('UPDATE users SET role = $1, patient_id = $2 WHERE id = $3', ['patient', pId, u.id]);
        }
      }
    }

    // Backfill assigned_doctor_id for any patient users lacking assigned_doctor_id
    const firstDoctorRes = await pool.query(
      `SELECT doctor_id FROM users WHERE role = 'doctor' AND doctor_id IS NOT NULL ORDER BY created_at ASC LIMIT 1`
    );
    const defaultDoctorId = firstDoctorRes.rows.length > 0 ? firstDoctorRes.rows[0].doctor_id : 'D000001';

    await pool.query(
      `UPDATE users SET assigned_doctor_id = $1 WHERE role = 'patient' AND (assigned_doctor_id IS NULL OR assigned_doctor_id = '')`,
      [defaultDoctorId]
    );

    await pool.query(
      `UPDATE medical_reports SET source = 'Manual Entry', file_type = 'MANUAL' WHERE type LIKE '%Manual%' OR type LIKE '%Manual Health%' OR file_type = 'MANUAL'`
    );

    console.log('[Migration] User role, ID, assigned_doctor_id & manual report source backfill completed successfully!');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
