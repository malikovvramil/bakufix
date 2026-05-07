require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const fileUpload = require('express-fileupload');
const cron       = require('node-cron');

const authRoutes       = require('./routes/auth.routes');
const reportRoutes     = require('./routes/reports.routes');
const departmentRoutes = require('./routes/departments.routes');
const dashboardRoutes  = require('./routes/dashboard.routes');
const weatherRoutes    = require('./routes/weather.routes');
const { checkWeatherAlerts } = require('./services/weather.service');
const { checkSLABreaches }   = require('./services/sla.service');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: process.env.DASHBOARD_URL || '*' }));
app.use(express.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/' }));

// Socket.io — req-ə əlavə et ki controller-lər istifadə edə bilsin
app.use((req, _res, next) => { req.io = io; next(); });

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/reports',     reportRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/weather',     weatherRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Socket.io ───────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join_admin', () => socket.join('admin'));
  socket.on('join_user',  (userId) => socket.join(`user_${userId}`));
  socket.on('disconnect', () => {});
});

// ── Cron işləri ─────────────────────────────────────────────
// Hər 3 saatda hava yoxlaması
cron.schedule('0 */3 * * *', async () => {
  try { await checkWeatherAlerts(io); } catch (e) { console.error('Hava xətası:', e.message); }
});

// Hər 30 dəqiqədə SLA yoxlaması
cron.schedule('*/30 * * * *', async () => {
  try { await checkSLABreaches(io); } catch (e) { console.error('SLA xətası:', e.message); }
});

// ── Server başlat ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 BakıFix API: http://localhost:${PORT}`);
});
