const express = require('express');
const router = express.Router();
const { startActivation, updateStep, getActivationLogs, getPendingActivations, deleteActivation } = require('../controllers/activationController');
const { activationRules } = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');

router.get('/pending', protect, authorize('dealer', 'technician', 'admin'), getPendingActivations);
router.post('/start/:orderId', protect, authorize('dealer', 'technician', 'admin'), activationRules, startActivation);
router.put('/step/:logId', protect, authorize('dealer', 'technician', 'admin'), updateStep);
router.get('/logs/:vehicleId', protect, getActivationLogs);
router.delete('/:vehicleId', protect, authorize('admin'), deleteActivation);

module.exports = router;