const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');

const sign = (user) => jwt.sign(
  { id: user.id, role: user.role, department_id: user.department_id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, role = 'citizen', department_id } = req.body;
    if (!name || !password || (!phone && !email)) return res.status(400).json({ error: 'Ad, şifrə və telefon/email tələb olunur' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, phone, email, password_hash, role, department_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, role, department_id`,
      [name, phone || null, email || null, hash, role, department_id || null]
    );
    res.status(201).json({ token: sign(rows[0]), user: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Bu telefon/email artıq qeydiyyatdadır' });
    res.status(500).json({ error: e.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, email, password } = req.body;
    const identifier = phone || email;
    if (!identifier || !password) return res.status(400).json({ error: 'Giriş məlumatları tələb olunur' });

    const { rows } = await pool.query(
      `SELECT * FROM users WHERE phone=$1 OR email=$1`, [identifier]
    );
    if (!rows.length) return res.status(401).json({ error: 'İstifadəçi tapılmadı' });

    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Şifrə yanlışdır' });

    const user = rows[0];
    res.json({ token: sign(user), user: { id: user.id, name: user.name, role: user.role, department_id: user.department_id } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.me = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, phone, email, role, department_id, expo_push_token, created_at FROM users WHERE id=$1`,
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
  res.json(rows[0]);
};

exports.updatePushToken = async (req, res) => {
  const { expo_push_token } = req.body;
  await pool.query('UPDATE users SET expo_push_token=$1 WHERE id=$2', [expo_push_token, req.user.id]);
  res.json({ success: true });
};
