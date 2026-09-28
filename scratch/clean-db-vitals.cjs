const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const { query } = require('../server/config/db');

async function cleanDirtyDbVitals() {
  try {
    console.log('Cleaning non-clinical records from vital_readings...');
    const delRes = await query(`
      DELETE FROM vital_readings 
      WHERE label ~* '^(age|years|yrs|dob|gender|sex|male|female|lab\\s*no|lab\\s*number|sample\\s*id|sample\\s*no|specimen|accession|barcode|patient|uhid|mrn|pid|reg\\.?\\s*no|registration|doctor|hospital|clinic|date|time)$'
         OR label ~* 'sample\\s*id|accession|barcode|mr\\.|mrs\\.|ms\\.|dr\\.|diabetes\\s*mellitus|impaired\\s*tolerance'
    `);
    console.log(`Deleted ${delRes.rowCount} non-clinical rows from vital_readings.`);

    // Clean key_findings in medical_reports
    const reportsRes = await query(`SELECT id, key_findings as "keyFindings" FROM medical_reports`);
    for (const r of reportsRes.rows) {
      if (Array.isArray(r.keyFindings) && r.keyFindings.length > 0) {
        const cleaned = r.keyFindings.filter(k => {
          const pName = (k.parameter || k.label || k.name || '').trim();
          return !/^(age|years|yrs|dob|gender|sex|male|female|lab\s*no|lab\s*number|sample\s*id|sample\s*no|specimen|accession|barcode|patient|uhid|mrn|pid|reg\.?\s*no|registration|doctor|hospital|clinic|date|time)$/i.test(pName)
              && !/sample\s*id|accession|barcode|mr\.|mrs\.|ms\.|dr\.|diabetes\s*mellitus|impaired\s*tolerance/i.test(pName);
        });
        if (cleaned.length !== r.keyFindings.length) {
          await query(`UPDATE medical_reports SET key_findings = $1 WHERE id = $2`, [JSON.stringify(cleaned), r.id]);
          console.log(`Cleaned key_findings for report ${r.id} (${r.keyFindings.length} -> ${cleaned.length} params)`);
        }
      }
    }
    console.log('✅ Database cleanup completed.');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

cleanDirtyDbVitals();
