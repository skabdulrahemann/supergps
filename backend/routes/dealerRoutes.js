const express = require('express');
const router = express.Router();
const { getAllDealers, getDealerById, getMyDealerProfile, updateDealerProfile, deleteDealer } = require('../controllers/dealerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/all', protect, authorize('admin'), getAllDealers);
router.get('/profile', protect, authorize('dealer'), getMyDealerProfile);
router.put('/profile', protect, authorize('dealer'), updateDealerProfile);
router.get('/:id', protect, getDealerById);
router.delete('/:id', protect, authorize('admin'), deleteDealer);

module.exports = router;