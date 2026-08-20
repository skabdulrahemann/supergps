const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrderById, updatePaymentStatus, assignDealer, getDealerOrders, getAllOrders, deleteOrder } = require('../controllers/orderController');
const { orderRules } = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('customer', 'dealer', 'admin'), orderRules, createOrder);
router.get('/my-orders', protect, authorize('customer'), getMyOrders);
router.get('/dealer-orders', protect, authorize('dealer'), getDealerOrders);
router.get('/all', protect, authorize('admin'), getAllOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/payment', protect, authorize('admin'), updatePaymentStatus);
router.put('/:id/assign-dealer', protect, authorize('admin'), assignDealer);
router.delete('/:id', protect, authorize('admin'), deleteOrder);

module.exports = router;
