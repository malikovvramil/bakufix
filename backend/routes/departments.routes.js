const router = require('express').Router();
const pool   = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM departments ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, d.name AS department_name FROM categories c JOIN departments d ON d.id=c.department_id ORDER BY c.id`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
