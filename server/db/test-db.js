const { query, pool } = require('../config/db');

async function testConnection() {
  try {
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('[PostgreSQL] Database tables found:');
    res.rows.forEach(r => console.log(' -', r.table_name));
    console.log('[PostgreSQL] DB Connection & Schema Check PASSED!');
  } catch (err) {
    console.error('[PostgreSQL] Test failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
