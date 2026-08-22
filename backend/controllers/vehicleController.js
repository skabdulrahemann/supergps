const { Op } = require('sequelize');
const { Vehicle, Order, User, Dealer, ActivationLog } = require('../models');

function formatAgo(value) {
  if (!value) return null;
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'Just now';
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec} sec ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return `${Math.floor(hr / 24)} days ago`;
}

function liveStatusFor(vehicle) {
  if (!vehicle.lastSeenAt) return 'offline';
  const ageMs = Date.now() - new Date(vehicle.lastSeenAt).getTime();
  if (ageMs > 15 * 60 * 1000) return 'offline';
  if (Number(vehicle.lastSpeedKmh || 0) > 3) return 'moving';
  if (vehicle.lastIgnition === true) return 'idle';
  return 'stopped';
}

function serializeVehicle(vehicle) {
  const data = vehicle.toJSON ? vehicle.toJSON() : vehicle;
  const hasLocation = data.lastLatitude !== null
    && data.lastLatitude !== undefined
    && data.lastLongitude !== null
    && data.lastLongitude !== undefined;

  return {
    ...data,
    liveStatus: liveStatusFor(data),
    speedKmh: data.lastSpeedKmh,
    lastSeen: formatAgo(data.lastSeenAt),
    lastLocation: hasLocation
      ? `${Number(data.lastLatitude).toFixed(6)}, ${Number(data.lastLongitude).toFixed(6)}`
      : null,
  };
}
// (ActivationLog already imported above — used by deleteVehicle for cascade cleanup)

exports.getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({
      where: { customerId: req.user.id },
      include: [
        { model: Order, as: 'order', attributes: ['orderNumber', 'orderStatus'] },
        { model: Dealer, as: 'dealer', attributes: ['salesCode', 'companyName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: vehicles.length, vehicles: vehicles.map(serializeVehicle) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id, {
      include: [
        { model: User, as: 'customer', attributes: ['name', 'phone'] },
        { model: Dealer, as: 'dealer', attributes: ['salesCode', 'companyName'] },
        { model: Order, as: 'order', attributes: ['orderNumber'] },
        { model: ActivationLog, as: 'activationLogs' }
      ]
    });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({ success: true, vehicle: serializeVehicle(vehicle) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDealerVehicles = async (req, res) => {
  try {
    const dealer = await Dealer.findOne({ where: { userId: req.user.id } });
    if (!dealer) return res.status(404).json({ message: 'Dealer profile not found' });

    const vehicles = await Vehicle.findAll({
      where: { dealerId: dealer.id },
      include: [
        { model: User, as: 'customer', attributes: ['name', 'email', 'phone'] },
        { model: Order, as: 'order', attributes: ['orderNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: vehicles.length, vehicles: vehicles.map(serializeVehicle) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({
      include: [
        { model: User, as: 'customer', attributes: ['name', 'phone'] },
        { model: Dealer, as: 'dealer', attributes: ['salesCode', 'companyName'] },
        { model: Order, as: 'order', attributes: ['orderNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: vehicles.length, vehicles: vehicles.map(serializeVehicle) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/vehicles — admin adds a device/vehicle directly (independent of the order+activation flow,
// e.g. bulk stock entry or a device sold outside a formal order).
exports.createVehicle = async (req, res) => {
  try {
    const {
      customerId, dealerId, orderId, imeiNumber, deviceSerialNumber, simNumber,
      vehicleNumber, vehicleType, vehicleBrand, vehicleModel, activationStatus, activatedBy
    } = req.body;

    if (!customerId || !imeiNumber || !deviceSerialNumber) {
      return res.status(400).json({ message: 'customerId, imeiNumber and deviceSerialNumber are required' });
    }

    const customer = await User.findByPk(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const existingImei = await Vehicle.findOne({ where: { imeiNumber } });
    if (existingImei) return res.status(400).json({ message: 'A device with this IMEI already exists' });

    const vehicle = await Vehicle.create({
      customerId,
      dealerId: dealerId || null,
      orderId: orderId || null,
      imeiNumber,
      deviceSerialNumber,
      simNumber: simNumber || null,
      vehicleNumber: vehicleNumber || null,
      vehicleType: vehicleType || 'car',
      vehicleBrand: vehicleBrand || null,
      vehicleModel: vehicleModel || null,
      activationStatus: activationStatus || 'pending',
      activatedBy: activatedBy || req.user.id
    });

    res.status(201).json({ success: true, message: 'Device added', vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/vehicles/:id — admin edits device/vehicle details
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Device not found' });

    const {
      customerId,
      dealerId,
      activatedBy,
      imeiNumber,
      deviceSerialNumber,
    } = req.body;

    if (customerId !== undefined) {
      const customer = await User.findOne({ where: { id: customerId, role: 'customer' } });
      if (!customer) return res.status(404).json({ message: 'Customer not found' });
      vehicle.customerId = customerId;
    }

    if (dealerId !== undefined) {
      if (dealerId) {
        const dealer = await Dealer.findByPk(dealerId);
        if (!dealer) return res.status(404).json({ message: 'Dealer not found' });
        vehicle.dealerId = dealerId;
      } else {
        vehicle.dealerId = null;
      }
    }

    if (activatedBy !== undefined) {
      if (activatedBy) {
        const technician = await User.findOne({ where: { id: activatedBy, role: 'technician' } });
        if (!technician) return res.status(404).json({ message: 'Technician not found' });
        vehicle.activatedBy = activatedBy;
      } else {
        vehicle.activatedBy = null;
      }
    }

    if (imeiNumber !== undefined && imeiNumber !== vehicle.imeiNumber) {
      const existingImei = await Vehicle.findOne({
        where: { imeiNumber, id: { [Op.ne]: vehicle.id } }
      });
      if (existingImei) return res.status(400).json({ message: 'A device with this IMEI already exists' });
      vehicle.imeiNumber = imeiNumber;
    }

    if (deviceSerialNumber !== undefined && deviceSerialNumber !== vehicle.deviceSerialNumber) {
      const existingSerial = await Vehicle.findOne({
        where: { deviceSerialNumber, id: { [Op.ne]: vehicle.id } }
      });
      if (existingSerial) return res.status(400).json({ message: 'A device with this serial number already exists' });
      vehicle.deviceSerialNumber = deviceSerialNumber;
    }

    const fields = ['vehicleNumber', 'vehicleType', 'vehicleBrand', 'vehicleModel', 'simNumber', 'activationStatus', 'isActive'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) vehicle[f] = req.body[f];
    });
    const activationStatusChanged = req.body.activationStatus !== undefined;
    if (req.body.activationStatus === 'activated' && !vehicle.activatedAt) vehicle.activatedAt = new Date();
    if (req.body.activationStatus && req.body.activationStatus !== 'activated') vehicle.activatedAt = null;
    await vehicle.save();

    if (activationStatusChanged && vehicle.orderId) {
      const order = await Order.findByPk(vehicle.orderId);
      if (order) {
        order.isActivated = req.body.activationStatus === 'activated';
        if (req.body.activationStatus === 'activated') order.orderStatus = 'delivered';
        await order.save();
      }

      if (req.body.activationStatus === 'activated') {
        await ActivationLog.update(
          { status: 'done', completedAt: new Date() },
          { where: { vehicleId: vehicle.id } }
        );
      } else if (req.body.activationStatus === 'pending' || req.body.activationStatus === 'deactivated') {
        await ActivationLog.update(
          { status: 'pending', completedAt: null, notes: null },
          { where: { vehicleId: vehicle.id } }
        );
      }
    }

    res.json({ success: true, message: 'Device updated', vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/vehicles/:id — admin removes a device/vehicle entirely (and its activation history)
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Device not found' });

    await ActivationLog.destroy({ where: { vehicleId: vehicle.id } });
    await vehicle.destroy();

    res.json({ success: true, message: 'Device deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
