const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const { query } = require('../server/config/db');
const { generateReportExplanation } = require('../server/services/gemini.service');

async function testReExplain() {
  try {
    const reportRes = await query('SELECT id, type, age, gender, hospital FROM medical_reports ORDER BY created_at DESC LIMIT 5');
    if (reportRes.rows.length === 0) {
      console.log('No reports in DB');
      return;
    }

    for (const r of reportRes.rows) {
      console.log(`\nRe-explaining Report ID: ${r.id} (${r.type || 'Lab Report'})...`);
      const vitalsRes = await query('SELECT label, value, unit, status, reference_range FROM vital_readings WHERE report_id = $1', [r.id]);
      console.log(`Found ${vitalsRes.rows.length} vitals`);

      if (vitalsRes.rows.length === 0) continue;

      const mappedVitals = vitalsRes.rows.map(v => ({
        label: v.label,
        value: v.value,
        unit: v.unit,
        status: v.status,
        referenceRange: v.reference_range
      }));

      const aiExpl = await generateReportExplanation({ age: r.age, gender: r.gender, type: r.type, hospital: r.hospital }, mappedVitals);
      console.log('AI Expl Summary:', aiExpl.summary);
      console.log('Generated Params Count:', aiExpl.parameters ? aiExpl.parameters.length : 0);

      if (aiExpl.parameters && aiExpl.parameters.length > 0) {
        console.log('Sample Explanation for', aiExpl.parameters[0].name, '=>', aiExpl.parameters[0].explanation);
        
        const updatedKeyFindings = aiExpl.parameters.map(p => ({
          parameter: p.name,
          value: p.value,
          unit: p.unit,
          status: p.status,
          referenceRange: p.referenceRange,
          explanation: p.explanation,
          isAiGenerated: aiExpl.isAiGenerated
        }));
        await query('UPDATE medical_reports SET key_findings = $1 WHERE id = $2', [JSON.stringify(updatedKeyFindings), r.id]);
        console.log(`✅ Report ${r.id} updated in database with Gemini explanations.`);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

testReExplain();
