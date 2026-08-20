const { Vehicle, Order, ActivationLog, Dealer, User } = require('../models');
// NOTE: `User` was missing from this import previously even though getPendingActivations
// used it below — that would have crashed at runtime. Fixed as part of this update.

const activationSteps = ['device_check', 'sim_insert', 'power_on', 'gps_signal', 'server_connect', 'completed'];

exports.startActivation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { imeiNumber, deviceSerialNumber, simNumber, vehicleNumber, vehicleType, vehicleBrand, vehicleModel } = req.body;

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.isActivated) return res.status(400).json({ message: 'Order already activated' });

    const dealer = await Dealer.findOne({ where: { userId: req.user.id } });
    const dealerId = dealer ? dealer.id : null;

    const vehicle = await Vehicle.create({
      customerId: order.customerId,
      dealerId,
      orderId,
      imeiNumber,
      deviceSerialNumber,
      simNumber,
      vehicleNumber: vehicleNumber || order.targetVehicleNumber,
      vehicleType: vehicleType || order.targetVehicleType || 'car',
      vehicleBrand: vehicleBrand || order.targetVehicleBrand,
      vehicleModel: vehicleModel || order.targetVehicleModel,
      activationStatus: 'in_progress',
      activatedBy: req.user.id
    });

    for (const step of activationSteps) {
      await ActivationLog.create({
        vehicleId: vehicle.id,
        orderId,
        dealerId,
        technicianId: req.user.id,
        step,
        status: step === 'device_check' ? 'pending' : 'pending'
      });
    }

    order.orderStatus = 'delivered';
    await order.save();

    res.status(201).json({ success: true, message: 'Activation started', vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStep = async (req, res) => {
  try {
    const { logId } = req.params;
    const { status, notes } = req.body;

    const log = await ActivationLog.findByPk(logId);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    log.status = status;
    log.notes = notes;
    if (status === 'done') log.completedAt = new Date();
    await log.save();

    const allLogs = await ActivationLog.findAll({ where: { vehicleId: log.vehicleId } });
    const allDone = allLogs.every(l => l.status === 'done');
    const anyFailed = allLogs.some(l => l.status === 'failed');

    const vehicle = await Vehicle.findByPk(log.vehicleId);
    if (allDone) {
      vehicle.activationStatus = 'activated';
      vehicle.activatedAt = new Date();

      const order = await Order.findByPk(log.orderId);
      order.isActivated = true;
      await order.save();
    } else if (anyFailed) {
      vehicle.activationStatus = 'pending';
    }
    await vehicle.save();

    res.json({ success: true, message: 'Step updated', log, vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getActivationLogs = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const logs = await ActivationLog.findAll({
      where: { vehicleId },
      order: [['createdAt', 'ASC']]
    });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/activation/:vehicleId — admin clears a device's activation history and resets it to pending.
exports.deleteActivation = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Device not found' });

    await ActivationLog.destroy({ where: { vehicleId } });
    vehicle.activationStatus = 'pending';
    vehicle.activatedAt = null;
    await vehicle.save();

    if (vehicle.orderId) {
      const order = await Order.findByPk(vehicle.orderId);
      if (order) {
        order.isActivated = false;
        await order.save();
      }
    }

    res.json({ success: true, message: 'Activation history cleared, device reset to pending' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPendingActivations = async (req, res) => {
  try {
    const dealer = await Dealer.findOne({ where: { userId: req.user.id } });
    const where = dealer ? { dealerId: dealer.id, isActivated: false } : { isActivated: false };

    const orders = await Order.findAll({
      where,
      include: [{ model: User, as: 'customer', attributes: ['name', 'phone'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
