const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let schemaInitialized = false;
let initPromise = null;

const initSchema = async () => {
  if (schemaInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'patient';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS patient_id VARCHAR(50) UNIQUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(50) UNIQUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_doctor_id VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS smoking_habit VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_level VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS dietary_preference VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS existing_conditions JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gender_check;
      `);
      schemaInitialized = true;
      console.log('[PostgreSQL] Database migrations verified');
    } catch (err) {
      console.error('[PostgreSQL] Migration check note:', err.message);
    }
  })();
  return initPromise;
};

// Execute schema check once safely on startup
initSchema();

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initSchema
};

