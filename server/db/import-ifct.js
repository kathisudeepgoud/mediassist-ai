/**
 * IFCT 2017 Dataset Importer & Normalization Script
 * Ingests official Indian Food Composition Tables (IFCT 2017) data into PostgreSQL.
 * Source: https://github.com/nodef/ifct2017 (NIN / ICMR 2017)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { pool } = require('../config/db');

// Helper to robustly parse standard CSV text (handling quotes, escaped quotes, and newlines)
function parseCSV(text) {
  const lines = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(cell.trim());
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        lines.push(row);
      }
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    lines.push(row);
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? r[idx].replace(/^"|"$/g, '').trim() : '';
    });
    return obj;
  });

  return { headers, rows };
}

async function importIFCT() {
  console.log('================================================================');
  console.log('         IFCT 2017 DATASET IMPORT & NORMALIZATION PIPELINE       ');
  console.log('================================================================');

  const ifctDir = path.join(__dirname, '../../data_source/ifct2017');
  if (!fs.existsSync(ifctDir)) {
    throw new Error(`IFCT repository folder not found at ${ifctDir}. Please ensure data_source/ifct2017 exists.`);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. IMPORT FOOD GROUPS (groups/index.csv)
    console.log('\n[1/5] Loading and Normalizing Food Groups...');
    const groupsPath = path.join(ifctDir, 'groups/index.csv');
    const groupsRaw = fs.readFileSync(groupsPath, 'utf8');
    const { rows: groupRows } = parseCSV(groupsRaw);

    let groupsImported = 0;
    const groupMap = new Map(); // group_code -> uuid

    for (const g of groupRows) {
      const code = g.code || g.grup;
      const name = g.group || g.name;
      const tagsStr = g.tags || '';
      const tags = tagsStr.split(/\s+/).filter(Boolean);

      if (!code || !name) continue;

      const res = await client.query(
        `INSERT INTO food_groups (group_code, group_name, dietary_tags, source, source_version)
         VALUES ($1, $2, $3, 'IFCT 2017', '2017')
         ON CONFLICT (group_code) DO UPDATE
         SET group_name = EXCLUDED.group_name,
             dietary_tags = EXCLUDED.dietary_tags
         RETURNING id, group_code`,
        [code, name, tags]
      );
      groupMap.set(code, res.rows[0].id);
      groupMap.set(name.toLowerCase(), res.rows[0].id);
      groupsImported++;
    }
    console.log(`✓ Food groups imported: ${groupsImported}`);

    // 2. IMPORT NUTRIENTS DEFINITION & REPRESENTATIONS
    console.log('\n[2/5] Loading and Normalizing Nutrient Definitions...');
    const columnsPath = path.join(ifctDir, 'columns/index.csv');
    const repPath = path.join(ifctDir, 'representations/index.csv');

    const colRaw = fs.readFileSync(columnsPath, 'utf8');
    const repRaw = fs.readFileSync(repPath, 'utf8');

    const { rows: colRows } = parseCSV(colRaw);
    const { rows: repRows } = parseCSV(repRaw);

    const repMap = new Map();
    for (const r of repRows) {
      repMap.set(r.code, {
        type: r.type,
        factor: parseFloat(r.factor) || 1.0,
        unit: r.unit || ''
      });
    }

    let nutrientsImported = 0;
    const nutrientIdMap = new Map(); // nutrient_code -> { id, unit, factor }

    for (const c of colRows) {
      const code = c.code;
      const name = c.name;
      const tags = (c.tags || '').split(/\s+/).filter(Boolean);
      if (!code || ['code', 'name', 'scie', 'lang', 'grup', 'regn', 'tags'].includes(code)) continue;

      const rep = repMap.get(code) || { factor: 1.0, unit: '' };
      let category = 'Proximate';
      if (/vit|retol|fol|thia|ribf|nia|biot|pantac/i.test(code)) category = 'Vitamins';
      else if (/ca|fe|mg|p|k|na|zn|cu|mn|se|cr|mo/i.test(code)) category = 'Minerals';
      else if (/fa|fat|chol/i.test(code)) category = 'Fatty Acids & Lipids';
      else if (/amiac|his|ile|leu|lys|met|cys|phe|thr|trp|val|ala|arg|asp|glu|gly|pro|ser|tyr/i.test(code)) category = 'Amino Acids';
      else if (/fib|starch|sugar|cho/i.test(code)) category = 'Carbohydrates & Fiber';

      const res = await client.query(
        `INSERT INTO nutrients (nutrient_code, nutrient_name, unit, category, scale_factor, tags, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'IFCT 2017')
         ON CONFLICT (nutrient_code) DO UPDATE
         SET nutrient_name = EXCLUDED.nutrient_name,
             unit = EXCLUDED.unit,
             category = EXCLUDED.category,
             scale_factor = EXCLUDED.scale_factor,
             tags = EXCLUDED.tags
         RETURNING id, nutrient_code, unit, scale_factor`,
        [code, name, rep.unit || 'g', category, rep.factor, tags]
      );

      nutrientIdMap.set(code, {
        id: res.rows[0].id,
        unit: res.rows[0].unit,
        factor: parseFloat(res.rows[0].scale_factor) || 1.0
      });
      nutrientsImported++;
    }
    console.log(`✓ Nutrients defined: ${nutrientsImported}`);

    // 3. IMPORT FOOD DESCRIPTIONS & METADATA (descriptions/index.csv)
    console.log('\n[3/5] Loading Food Items...');
    const descPath = path.join(ifctDir, 'descriptions/index.csv');
    const descRaw = fs.readFileSync(descPath, 'utf8');
    const { rows: descRows } = parseCSV(descRaw);

    let foodsImported = 0;
    const foodIdMap = new Map(); // food_code -> uuid

    for (const f of descRows) {
      const code = f.code;
      const name = f.name;
      const scie = f.scie || null;
      const groupName = f.grup || '';
      const localRaw = f.desc || '';

      if (!code || !name) continue;

      const groupCodeLetter = code.charAt(0);
      const groupId = groupMap.get(groupCodeLetter) || groupMap.get(groupName.toLowerCase()) || null;

      // Determine dietary tags based on food group
      let dietaryTags = ['vegetarian', 'veg'];
      if (['M'].includes(groupCodeLetter)) dietaryTags = ['eggetarian', 'nonveg'];
      else if (['N', 'O'].includes(groupCodeLetter)) dietaryTags = ['nonveg'];
      else if (['P', 'Q', 'R', 'S'].includes(groupCodeLetter)) dietaryTags = ['fishetarian', 'nonveg'];

      const res = await client.query(
        `INSERT INTO foods (food_code, food_name, scientific_name, food_group_id, dietary_tags, local_names_raw, source, source_version)
         VALUES ($1, $2, $3, $4, $5, $6, 'IFCT 2017', '2017')
         ON CONFLICT (food_code) DO UPDATE
         SET food_name = EXCLUDED.food_name,
             scientific_name = EXCLUDED.scientific_name,
             food_group_id = EXCLUDED.food_group_id,
             dietary_tags = EXCLUDED.dietary_tags,
             local_names_raw = EXCLUDED.local_names_raw
         RETURNING id, food_code`,
        [code, name, scie, groupId, dietaryTags, localRaw]
      );

      foodIdMap.set(code, res.rows[0].id);
      foodsImported++;
    }
    console.log(`✓ Foods imported: ${foodsImported}`);

    // 4. IMPORT MULTILINGUAL REGIONAL NAMES (codes/index.csv)
    console.log('\n[4/5] Loading Multilingual Local Names...');
    const codesPath = path.join(ifctDir, 'codes/index.csv');
    const codesRaw = fs.readFileSync(codesPath, 'utf8');
    const { rows: codeNameRows } = parseCSV(codesRaw);

    await client.query('DELETE FROM food_names');

    const langAbbrMap = {
      'A.': 'Assamese', 'B.': 'Bengali', 'E.': 'English', 'G.': 'Gujarati',
      'H.': 'Hindi', 'Kan.': 'Kannada', 'Kash.': 'Kashmiri', 'Kh.': 'Khasi',
      'Kon.': 'Konkani', 'Mal.': 'Malayalam', 'M.': 'Manipuri', 'Mar.': 'Marathi',
      'N.': 'Nepali', 'O.': 'Oriya', 'P.': 'Punjabi', 'S.': 'Sanskrit',
      'Tam.': 'Tamil', 'Tel.': 'Telugu', 'U.': 'Urdu', 'Sci.': 'Scientific'
    };

    const nameBatch = [];

    for (const c of codeNameRows) {
      const rawEntry = c.name;
      const targetCodes = (c.code || '').split(/,\s*/);

      if (!rawEntry) continue;

      const match = rawEntry.match(/^(.*?)\s*\((.*?)\)$/);
      let localizedName = rawEntry;
      let language = 'Local';

      if (match) {
        localizedName = match[1].trim();
        const abbr = match[2].trim() + (match[2].trim().endsWith('.') ? '' : '.');
        language = langAbbrMap[abbr] || match[2].trim();
      }

      for (const tCode of targetCodes) {
        const cleanCode = tCode.trim();
        if (cleanCode.includes('-')) {
          const [start, end] = cleanCode.split('-');
          const prefix = start.charAt(0);
          const startNum = parseInt(start.slice(1), 10);
          const endNum = parseInt(end.slice(1), 10);
          if (!isNaN(startNum) && !isNaN(endNum)) {
            for (let num = startNum; num <= endNum; num++) {
              const codeStr = prefix + String(num).padStart(3, '0');
              const foodId = foodIdMap.get(codeStr);
              if (foodId) {
                nameBatch.push([foodId, language, localizedName]);
              }
            }
          }
        } else {
          const foodId = foodIdMap.get(cleanCode);
          if (foodId) {
            nameBatch.push([foodId, language, localizedName]);
          }
        }
      }
    }

    // Batch insert food_names in chunks of 500
    const CHUNK_SIZE = 500;
    for (let i = 0; i < nameBatch.length; i += CHUNK_SIZE) {
      const chunk = nameBatch.slice(i, i + CHUNK_SIZE);
      const valuePlaceholders = chunk.map((_, idx) => `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3}, 'IFCT 2017')`).join(',');
      const flatParams = chunk.flat();
      await client.query(`INSERT INTO food_names (food_id, language, name, source) VALUES ${valuePlaceholders}`, flatParams);
    }
    console.log(`✓ Multilingual local names recorded: ${nameBatch.length}`);

    // 5. IMPORT COMPOSITIONS & DETAILED FOOD NUTRIENTS (compositions/index.csv)
    console.log('\n[5/5] Loading and Normalizing Food Compositions...');
    const compPath = path.join(ifctDir, 'compositions/index.csv');
    const compRaw = fs.readFileSync(compPath, 'utf8');
    const { headers: compHeaders, rows: compRows } = parseCSV(compRaw);

    await client.query('DELETE FROM food_nutrients');

    const nutrientCols = compHeaders.filter(
      h => !h.endsWith('_e') && !['code', 'name', 'scie', 'lang', 'grup', 'regn', 'tags'].includes(h)
    );

    const fnBatch = [];

    for (const row of compRows) {
      const foodCode = row.code;
      const foodId = foodIdMap.get(foodCode);
      if (!foodId) continue;

      for (const col of nutrientCols) {
        const rawValStr = row[col];
        if (rawValStr === '' || rawValStr === undefined || rawValStr === null) continue;

        const rawVal = parseFloat(rawValStr);
        if (isNaN(rawVal)) continue;

        const nutrientDef = nutrientIdMap.get(col);
        if (!nutrientDef) continue;

        const normalizedAmount = rawVal * nutrientDef.factor;
        const origUnit = col === 'enerc' ? 'kJ' : (nutrientDef.factor === 1 ? nutrientDef.unit : 'base');

        fnBatch.push([foodId, nutrientDef.id, normalizedAmount, nutrientDef.unit, rawVal, origUnit]);
      }
    }

    // Fast batch insert in chunks of 1000
    const FN_CHUNK = 800;
    for (let i = 0; i < fnBatch.length; i += FN_CHUNK) {
      const chunk = fnBatch.slice(i, i + FN_CHUNK);
      const valuePlaceholders = chunk.map(
        (_, idx) => `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6}, 'IFCT 2017')`
      ).join(',');
      const flatParams = chunk.flat();
      await client.query(
        `INSERT INTO food_nutrients (food_id, nutrient_id, amount_per_100g, unit, original_value, original_unit, source)
         VALUES ${valuePlaceholders}`,
        flatParams
      );
    }
    console.log(`✓ Food-Nutrient composition records imported: ${fnBatch.length}`);

    await client.query('COMMIT');

    // DATA QUALITY SUMMARY REPORT
    console.log('\n================================================================');
    console.log('                 IFCT 2017 IMPORT SUMMARY REPORT                ');
    console.log('================================================================');
    const groupCountRes = await client.query('SELECT count(*) FROM food_groups');
    const foodCountRes = await client.query('SELECT count(*) FROM foods');
    const nutrientCountRes = await client.query('SELECT count(*) FROM nutrients');
    const fnCountRes = await client.query('SELECT count(*) FROM food_nutrients');
    const namesCountRes = await client.query('SELECT count(*) FROM food_names');

    console.log(`Foods imported:               ${foodCountRes.rows[0].count}`);
    console.log(`Food groups:                  ${groupCountRes.rows[0].count}`);
    console.log(`Nutrients defined:            ${nutrientCountRes.rows[0].count}`);
    console.log(`Food-Nutrient values stored:  ${fnCountRes.rows[0].count}`);
    console.log(`Multilingual names indexed:   ${namesCountRes.rows[0].count}`);
    console.log('Status:                       SUCCESS (Database normalized & ready)');
    console.log('================================================================\n');

    return {
      foods: parseInt(foodCountRes.rows[0].count, 10),
      groups: parseInt(groupCountRes.rows[0].count, 10),
      nutrients: parseInt(nutrientCountRes.rows[0].count, 10),
      foodNutrients: parseInt(fnCountRes.rows[0].count, 10),
      multilingualNames: parseInt(namesCountRes.rows[0].count, 10)
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[IFCT Import Error] Transaction rolled back due to error:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  importIFCT()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { importIFCT };
