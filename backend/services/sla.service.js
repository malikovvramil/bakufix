const pool = require('../config/db');
const { notifyAdmin, notifyUser } = require('./notification.service');

async function checkSLABreaches(io) {
  const { rows } = await pool.query(`
    SELECT r.id, r.title, r.description, r.sla_deadline, r.user_id, r.department_id,
           d.name AS dept_name
    FROM reports r
    JOIN departments d ON d.id = r.department_id
    WHERE r.status IN ('pending','in_progress')
      AND r.sla_deadline IS NOT NULL
      AND r.sla_deadline < NOW()
  `);

  for (const report of rows) {
    const title = `SLA Pozuntusu — #${report.id}`;
    const body  = `"${report.description?.slice(0,60)}..." müddəti keçib (${report.dept_name})`;

    await notifyAdmin(title, body, 'sla_warning', report.id, io);
    await notifyUser(report.user_id, 'Müraciətiniz gecikir', `Müraciətiniz (#${report.id}) hələ həll edilməyib. Bağışlayın, yaxında həll ediləcək.`, 'sla_warning', report.id, io);

    console.log(`⚠️  SLA pozuntusu: Report #${report.id}`);
  }
}

module.exports = { checkSLABreaches };
