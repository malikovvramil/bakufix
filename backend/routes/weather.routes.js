const router = require('express').Router();
const { auth, role } = require('../middleware/auth');
const { checkWeatherAlerts } = require('../services/weather.service');

// Manual trigger (admin test üçün)
router.post('/check', auth, role('admin'), async (req, res) => {
  try {
    await checkWeatherAlerts(req.io);
    res.json({ success: true, message: 'Hava yoxlaması tamamlandı' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
