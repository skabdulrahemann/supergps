const express = require('express');
const router = express.Router();
const { getLatestPosition } = require('../controllers/trackingController');
const { protect } = require('../middleware/auth');

router.get('/:vehicleId/latest', protect, getLatestPosition);

module.exports = router;
