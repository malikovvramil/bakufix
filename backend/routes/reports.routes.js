const router = require('express').Router();
const ctrl   = require('../controllers/reports.controller');
const { auth, role } = require('../middleware/auth');

router.get('/map',                                   ctrl.getMapData);           // ictimai
router.get('/',          auth,                       ctrl.getAll);
router.get('/:id',       auth,                       ctrl.getOne);
router.post('/',         auth,                       ctrl.create);
router.patch('/:id/status', auth, role('staff','admin'), ctrl.updateStatus);
router.post('/:id/rate', auth, role('citizen'),      ctrl.rate);

module.exports = router;
