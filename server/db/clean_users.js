const { query } = require('../config/db');

async function cleanUsers() {
  const preserve = ['sudeep', 'user1', 'user2', 'user3', 'pramodh'];
  const users = await query('SELECT id, name, email, role, patient_id FROM users');
  const toDelete = users.rows.filter(u => {
    const pidNum = parseInt((u.patient_id || '').replace(/^P0*/i, ''), 10);
    const isTargetPid = !isNaN(pidNum) && pidNum >= 5 && pidNum <= 25;
    const nameOrEmail = ((u.name || '') + ' ' + (u.email || '')).toLowerCase();
    const isPreserved = preserve.some(p => nameOrEmail.includes(p));
    return isTargetPid && !isPreserved;
  });

  console.log(`Found ${toDelete.length} users to delete.`);
  for (const u of toDelete) {
    console.log(`Deleting: ${u.name} (${u.email}) [${u.patient_id}]`);
    await query('DELETE FROM vital_readings WHERE user_id = $1', [u.id]).catch(() => {});
    await query('DELETE FROM medical_reports WHERE user_id = $1', [u.id]).catch(() => {});
    await query('DELETE FROM diet_plans WHERE user_id = $1 OR patient_id = $2', [u.id, u.patient_id]).catch(() => {});
    await query('DELETE FROM doctor_patients WHERE patient_id = $1', [u.id]).catch(() => {});
    await query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [u.id]).catch(() => {});
    await query('DELETE FROM prescriptions WHERE patient_id = $1', [u.id]).catch(() => {});
    await query('DELETE FROM payments WHERE appointment_id IN (SELECT id FROM appointments WHERE patient_id = $1)', [u.id]).catch(() => {});
    await query('DELETE FROM appointments WHERE patient_id = $1', [u.id]).catch(() => {});
    await query('DELETE FROM notifications WHERE user_id = $1', [u.id]).catch(() => {});
    if (u.patient_id) {
      await query('DELETE FROM patient_alerts WHERE patient_id = $1', [u.patient_id]).catch(() => {});
    }
    const delRes = await query('DELETE FROM users WHERE id = $1 RETURNING id', [u.id]).catch((err) => console.error(err));
    if (delRes?.rowCount > 0) {
      console.log(`  -> Deleted ${u.patient_id}`);
    }
  }

  const remaining = await query('SELECT id, name, email, role, patient_id FROM users ORDER BY created_at ASC');
  console.log(`\nRemaining users (${remaining.rows.length}):`);
  remaining.rows.forEach(r => {
    console.log(`- ${r.role.toUpperCase()}: ${r.name} (${r.email}) [${r.patient_id || 'N/A'}]`);
  });
  process.exit(0);
}

cleanUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
