const pool   = require('../config/db');
const { uploadToCloudinary } = require('../middleware/upload');
const { analyzeReport, checkDuplicate } = require('../services/ai.service');
const { notifyUser, notifyAdmin }       = require('../services/notification.service');

// Bütün müraciətlər (admin/staff: hamısı; citizen: öz müraciətləri)
exports.getAll = async (req, res) => {
  try {
    const { status, priority, department_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const where  = [];

    if (req.user.role === 'citizen') { params.push(req.user.id); where.push(`r.user_id=$${params.length}`); }
    if (req.user.role === 'staff')   { params.push(req.user.department_id); where.push(`r.department_id=$${params.length}`); }
    if (status)      { params.push(status);      where.push(`r.status=$${params.length}`); }
    if (priority)    { params.push(priority);    where.push(`r.priority=$${params.length}`); }
    if (department_id) { params.push(department_id); where.push(`r.department_id=$${params.length}`); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    params.push(limit, offset);

    const sql = `
      SELECT r.*, c.name AS category_name, d.name AS department_name,
             u.name AS citizen_name, u.phone AS citizen_phone
      FROM reports r
      LEFT JOIN categories c ON c.id = r.category_id
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN users u ON u.id = r.user_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await pool.query(sql, params);
    const total    = await pool.query(`SELECT COUNT(*) FROM reports r ${whereClause}`, params.slice(0, -2));
    res.json({ data: rows, total: parseInt(total.rows[0].count), page: +page, limit: +limit });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Tək müraciət
exports.getOne = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, c.name AS category_name, d.name AS department_name,
             u.name AS citizen_name, u.phone AS citizen_phone,
             (SELECT json_agg(sh ORDER BY sh.created_at) FROM status_history sh WHERE sh.report_id=r.id) AS history
      FROM reports r
      LEFT JOIN categories c ON c.id=r.category_id
      LEFT JOIN departments d ON d.id=r.department_id
      LEFT JOIN users u ON u.id=r.user_id
      WHERE r.id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Müraciət tapılmadı' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Yeni müraciət yarat
exports.create = async (req, res) => {
  try {
    const { description, latitude, longitude, address } = req.body;
    if (!description || !latitude || !longitude) return res.status(400).json({ error: 'Məlumatlar natamamdır' });

    // Foto yüklə
    let photoUrl = null;
    if (req.files?.photo) photoUrl = await uploadToCloudinary(req.files.photo);

    // AI analizi
    const ai = await analyzeReport(description, photoUrl);

    // SLA deadline hesabla
    const { rows: deptRows } = await pool.query('SELECT sla_hours FROM departments WHERE id=$1', [ai.departmentId]);
    const slaHours   = deptRows[0]?.sla_hours || 72;
    const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000);

    // Duplikat yoxla
    const { rows: nearby } = await pool.query(
      `SELECT id, latitude, longitude, category_id FROM reports
       WHERE status IN ('pending','in_progress')
         AND created_at > NOW() - INTERVAL '48 hours'
         AND ABS(latitude-$1)<0.01 AND ABS(longitude-$2)<0.01`,
      [latitude, longitude]
    );
    const duplicateOf = await checkDuplicate({ latitude: +latitude, longitude: +longitude, category_id: ai.categoryId }, nearby);

    const { rows } = await pool.query(
      `INSERT INTO reports (description, photo_url, latitude, longitude, address, priority, category_id, department_id, user_id, sla_deadline, ai_suggestion, duplicate_of)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [description, photoUrl, latitude, longitude, address, ai.priority, ai.categoryId, ai.departmentId, req.user.id, slaDeadline, JSON.stringify(ai), duplicateOf]
    );

    if (duplicateOf) {
      await pool.query('UPDATE reports SET supporter_count=supporter_count+1 WHERE id=$1', [duplicateOf]);
    }

    // Admin-ə bildiriş
    await notifyAdmin('Yeni Müraciət', `${ai.category}: ${description.slice(0,60)}`, 'new_report', rows[0].id, req.io);

    // Real-time
    req.io?.to('admin').emit('new_report', rows[0]);

    res.status(201).json({ ...rows[0], ai_result: ai, duplicate_of: duplicateOf });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Status yenilə (staff/admin)
exports.updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const { id } = req.params;
    const allowed = ['pending','in_progress','resolved','rejected'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Yanlış status' });

    const { rows: old } = await pool.query('SELECT * FROM reports WHERE id=$1', [id]);
    if (!old.length) return res.status(404).json({ error: 'Müraciət tapılmadı' });

    const resolvedAt = status === 'resolved' ? new Date() : null;
    const { rows } = await pool.query(
      `UPDATE reports SET status=$1, resolved_at=$2, assigned_to=$3 WHERE id=$4 RETURNING *`,
      [status, resolvedAt, req.user.id, id]
    );

    await pool.query(
      `INSERT INTO status_history (report_id, old_status, new_status, changed_by, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, old[0].status, status, req.user.id, note]
    );

    const statusText = { pending:'Gözləyir', in_progress:'İcrada', resolved:'Həll edildi', rejected:'Rədd edildi' };
    await notifyUser(old[0].user_id, `Müraciət #${id} — ${statusText[status]}`,
      note || `Müraciətinizin statusu dəyişdi: ${statusText[status]}`, 'status_update', +id, req.io);

    req.io?.to('admin').emit('report_updated', rows[0]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Qiymətləndirmə (citizen)
exports.rate = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Reytinq 1-5 arasında olmalıdır' });
    const { rows } = await pool.query(
      'UPDATE reports SET rating=$1 WHERE id=$2 AND user_id=$3 AND status=$4 RETURNING id',
      [rating, req.params.id, req.user.id, 'resolved']
    );
    if (!rows.length) return res.status(403).json({ error: 'Qiymətləndirmə mümkün deyil' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Xəritə üçün bütün açıq müraciətlər (ictimai)
exports.getMapData = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.latitude, r.longitude, r.status, r.priority,
             c.name AS category, c.icon, d.name AS department
      FROM reports r
      LEFT JOIN categories c ON c.id=r.category_id
      LEFT JOIN departments d ON d.id=r.department_id
      WHERE r.status != 'rejected' ORDER BY r.created_at DESC LIMIT 500`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
