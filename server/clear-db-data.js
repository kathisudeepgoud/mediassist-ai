const { query, pool } = require('./config/db');

async function clearData() {
  try {
    console.log('[PostgreSQL] Clearing all table data (users, medical_reports, vital_readings, etc.)...');
    
    // Truncate all data tables cleanly without removing table definitions or constraints
    await query(`
      TRUNCATE TABLE 
        users, 
        medical_reports, 
        vital_readings, 
        user_settings, 
        disease_risks, 
        trend_metrics, 
        trend_points, 
        meal_plans, 
        chat_messages 
      RESTART IDENTITY CASCADE;
    `);

    // Clear legacy capitalized tables if present
    try { await query('TRUNCATE TABLE "User", "Report" RESTART IDENTITY CASCADE;'); } catch { /* ignore if not present */ }

    console.log('\n[PostgreSQL] All table data successfully truncated.');

    const usersRes = await query('SELECT count(*) FROM users');
    const reportsRes = await query('SELECT count(*) FROM medical_reports');
    const vitalsRes = await query('SELECT count(*) FROM vital_readings');

    console.log('\n--- Post-Cleanup Database Stats ---');
    console.log('users table count:', usersRes.rows[0].count);
    console.log('medical_reports table count:', reportsRes.rows[0].count);
    console.log('vital_readings table count:', vitalsRes.rows[0].count);
  } catch (err) {
    console.error('Database clearing error:', err);
  } finally {
    await pool.end();
  }
}

clearData();
