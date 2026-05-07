const pool = require('../config/db');

exports.getStats = async (_req, res) => {
  try {
    const [total, byStatus, byDept, slaBreached, avgResolve, recent] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM reports'),
      pool.query(`SELECT status, COUNT(*) AS count FROM reports GROUP BY status`),
      pool.query(`
        SELECT d.name, d.id,
               COUNT(r.id)                                        AS total,
               COUNT(r.id) FILTER (WHERE r.status='resolved')    AS resolved,
               COUNT(r.id) FILTER (WHERE r.status='pending')     AS pending,
               COUNT(r.id) FILTER (WHERE r.status='in_progress') AS in_progress,
               ROUND(AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at))/3600)
                 FILTER (WHERE r.resolved_at IS NOT NULL))        AS avg_hours
        FROM departments d LEFT JOIN reports r ON r.department_id=d.id
        GROUP BY d.id, d.name ORDER BY total DESC`),
      pool.query(`SELECT COUNT(*) FROM reports WHERE status IN ('pending','in_progress') AND sla_deadline < NOW()`),
      pool.query(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at-created_at))/3600)) AS hours FROM reports WHERE resolved_at IS NOT NULL`),
      pool.query(`
        SELECT r.id, r.description, r.status, r.priority, r.created_at,
               c.name AS category, d.name AS department
        FROM reports r
        LEFT JOIN categories c ON c.id=r.category_id
        LEFT JOIN departments d ON d.id=r.department_id
        ORDER BY r.created_at DESC LIMIT 10`),
    ]);

    res.json({
      total:        parseInt(total.rows[0].count),
      by_status:    byStatus.rows,
      by_department: byDept.rows,
      sla_breached: parseInt(slaBreached.rows[0].count),
      avg_resolve_hours: avgResolve.rows[0].hours,
      recent:       recent.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getHeatmap = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT latitude, longitude, priority, COUNT(*) AS count
      FROM reports WHERE status != 'rejected'
      GROUP BY latitude, longitude, priority`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getWeatherAlerts = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM weather_alerts WHERE valid_until > NOW() ORDER BY created_at DESC LIMIT 5`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );
    await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
