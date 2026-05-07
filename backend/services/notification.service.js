const { Expo } = require('expo-server-sdk');
const pool = require('../config/db');

const expo = new Expo();

async function sendPush(tokens, title, body, data = {}) {
  const valid = tokens.filter(t => t && Expo.isExpoPushToken(t));
  if (!valid.length) return;

  const messages = valid.map(token => ({ to: token, title, body, data, sound: 'default' }));
  const chunks   = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try { await expo.sendPushNotificationsAsync(chunk); } catch (e) { console.error('Push xətası:', e.message); }
  }
}

async function notifyUser(userId, title, body, type, reportId, io) {
  await pool.query(
    `INSERT INTO notifications (user_id, report_id, title, body, type) VALUES ($1,$2,$3,$4,$5)`,
    [userId, reportId, title, body, type]
  );

  if (io) io.to(`user_${userId}`).emit('notification', { title, body, type, reportId });

  const { rows } = await pool.query('SELECT expo_push_token FROM users WHERE id=$1', [userId]);
  if (rows[0]?.expo_push_token) await sendPush([rows[0].expo_push_token], title, body);
}

async function notifyAdmin(title, body, type, reportId, io) {
  const { rows } = await pool.query(`SELECT id FROM users WHERE role IN ('admin','staff')`);
  for (const r of rows) await notifyUser(r.id, title, body, type, reportId, io);
  if (io) io.to('admin').emit('notification', { title, body, type, reportId });
}

async function sendPushToStaff(departmentIds, title, body) {
  const { rows } = await pool.query(
    `SELECT expo_push_token FROM users WHERE department_id = ANY($1) AND expo_push_token IS NOT NULL`,
    [departmentIds]
  );
  await sendPush(rows.map(r => r.expo_push_token), title, body);
}

module.exports = { notifyUser, notifyAdmin, sendPushToStaff };
