const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') console.log('🗄️  PostgreSQL bağlantısı quruldu');
});

pool.on('error', (err) => {
  console.error('PostgreSQL xətası:', err.message);
});

module.exports = pool;
