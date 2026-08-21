const { Order, Vehicle, User, Dealer } = require('../models');
const generateOrderNumber = require('../utils/generateOrderNumber');
const { Op } = require('sequelize');

function normalizeVehicleNumber(vehicleNumber) {
  return String(vehicleNumber || '').trim().toUpperCase().replace(/\s+/g, '');
}

exports.createOrder = async (req, res) => {
  try {
    const {
      quantity,
      price,
      shippingAddress,
      paymentMethod,
      salesCode,
      productName,
      targetVehicleNumber,
      targetVehicleType,
      targetVehicleBrand,
      targetVehicleModel,
    } = req.body;
    const customerId = req.user.id;
    const vehicleNumber = normalizeVehicleNumber(targetVehicleNumber);

    if (!vehicleNumber) {
      return res.status(400).json({ message: 'Vehicle number is required before placing an order' });
    }

    const existingVehicle = await Vehicle.findOne({
      where: { customerId, vehicleNumber }
    });
    if (existingVehicle) {
      return res.status(400).json({ message: 'This vehicle is already assigned to your account' });
    }

    const existingOpenOrder = await Order.findOne({
      where: {
        customerId,
        targetVehicleNumber: vehicleNumber,
        isActivated: false,
        orderStatus: { [Op.ne]: 'cancelled' }
      }
    });
    if (existingOpenOrder) {
      return res.status(400).json({
        message: `This vehicle already has an open order (${existingOpenOrder.orderNumber})`
      });
    }

    let dealerId = null;
    if (salesCode) {
      const dealer = await Dealer.findOne({ where: { salesCode } });
      if (!dealer) return res.status(400).json({ message: 'Invalid sales code' });
      dealerId = dealer.id;
    }

    const totalAmount = parseFloat(price) * parseInt(quantity);
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      customerId,
      dealerId,
      salesCode: salesCode || null,
      productName: productName || 'SuperGPS Device',
      targetVehicleNumber: vehicleNumber,
      targetVehicleType: targetVehicleType || 'car',
      targetVehicleBrand: targetVehicleBrand || null,
      targetVehicleModel: targetVehicleModel || null,
      quantity,
      price,
      totalAmount,
      paymentMethod,
      shippingAddress,
      paymentStatus: 'pending',
      orderStatus: 'placed'
    });

    res.status(201).json({ success: true, message: 'Order placed', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.assignDealer = async (req, res) => {
  try {
    const { dealerId } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const dealer = await Dealer.findByPk(dealerId);
    if (!dealer) return res.status(404).json({ message: 'Dealer not found' });

    order.dealerId = dealer.id;
    order.salesCode = dealer.salesCode;
    if (order.orderStatus === 'placed') order.orderStatus = 'confirmed';
    await order.save();

    await Vehicle.update(
      { dealerId: dealer.id },
      { where: { orderId: order.id } }
    );

    const updatedOrder = await Order.findByPk(order.id, {
      include: [
        { model: User, as: 'customer', attributes: ['name', 'email', 'phone'] },
        { model: Dealer, as: 'dealer', attributes: ['salesCode', 'companyName'] },
        { model: Vehicle, as: 'vehicles' }
      ]
    });

    res.json({ success: true, message: 'Dealer assigned', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { customerId: req.user.id },
      include: [
        { model: Dealer, as: 'dealer', attributes: ['salesCode', 'companyName'] },
        { model: Vehicle, as: 'vehicles' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, as: 'customer', attributes: ['name', 'email', 'phone'] },
        { model: Dealer, as: 'dealer', include: [{ model: User, as: 'user', attributes: ['name', 'phone'] }] },
        { model: Vehicle, as: 'vehicles' }
      ]
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.paymentStatus = paymentStatus;
    await order.save();
    res.json({ success: true, message: 'Payment status updated', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDealerOrders = async (req, res) => {
  try {
    const dealer = await Dealer.findOne({ where: { userId: req.user.id } });
    if (!dealer) return res.status(404).json({ message: 'Dealer profile not found' });

    const orders = await Order.findAll({
      where: { dealerId: dealer.id },
      include: [
        { model: User, as: 'customer', attributes: ['name', 'email', 'phone'] },
        { model: Vehicle, as: 'vehicles' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/orders/:id — admin removes an order along with any device it produced.
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { Vehicle: VehicleModel, ActivationLog } = require('../models');
    const vehicles = await VehicleModel.findAll({ where: { orderId: order.id } });
    const vehicleIds = vehicles.map((v) => v.id);
    if (vehicleIds.length) {
      await ActivationLog.destroy({ where: { vehicleId: vehicleIds } });
      await VehicleModel.destroy({ where: { orderId: order.id } });
    }
    await order.destroy();

    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: User, as: 'customer', attributes: ['name', 'email', 'phone'] },
        { model: Dealer, as: 'dealer', attributes: ['salesCode', 'companyName'] },
        { model: Vehicle, as: 'vehicles' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
