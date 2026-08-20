const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  dealerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'dealers', key: 'id' }
  },
  orderId: {
    // Nullable: the admin panel can add a device directly (bulk stock entry, no formal order),
    // not only through the customer order + activation flow.
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'orders', key: 'id' }
  },
  imeiNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
  deviceSerialNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
  simNumber: { type: DataTypes.STRING, allowNull: true },
  vehicleNumber: { type: DataTypes.STRING, allowNull: true },
  vehicleType: { type: DataTypes.STRING, defaultValue: 'car' },
  vehicleBrand: { type: DataTypes.STRING },
  vehicleModel: { type: DataTypes.STRING },
  activationStatus: {
    type: DataTypes.ENUM('pending', 'in_progress', 'activated', 'deactivated'),
    defaultValue: 'pending'
  },
  activatedAt: { type: DataTypes.DATE },
  activatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },

  // ── Live tracking (Step 1) ──────────────────────────────────────────────
  // Quick-access "last known" snapshot, updated every time a new GPS packet
  // arrives from the device. Kept directly on the vehicle row (instead of
  // always querying the Position history table) so list/map views stay fast.
  lastLatitude: { type: DataTypes.DOUBLE, allowNull: true },
  lastLongitude: { type: DataTypes.DOUBLE, allowNull: true },
  lastSpeedKmh: { type: DataTypes.FLOAT, allowNull: true },
  lastCourse: { type: DataTypes.FLOAT, allowNull: true }, // heading in degrees, 0-360
  lastIgnition: { type: DataTypes.BOOLEAN, allowNull: true },
  lastSatellites: { type: DataTypes.INTEGER, allowNull: true },
  lastSeenAt: { type: DataTypes.DATE, allowNull: true } // timestamp of the last GPS fix received
}, { tableName: 'vehicles', timestamps: true });

module.exports = Vehicle;