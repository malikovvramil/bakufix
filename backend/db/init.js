require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function initDB() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Verilənlər bazası uğurla quruldu');
  } catch (err) {
    console.error('❌ DB xətası:', err.message);
  } finally {
    await pool.end();
  }
}

initDB();
