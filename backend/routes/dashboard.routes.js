const router = require('express').Router();
const ctrl   = require('../controllers/dashboard.controller');
const { auth, role } = require('../middleware/auth');

router.get('/stats',          auth, role('admin','staff'), ctrl.getStats);
router.get('/heatmap',                                     ctrl.getHeatmap);        // ictimai
router.get('/weather-alerts',                              ctrl.getWeatherAlerts);  // ictimai
router.get('/notifications',  auth,                        ctrl.getNotifications);

module.exports = router;
