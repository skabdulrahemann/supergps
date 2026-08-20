const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// One row per GPS fix received from a device. Vehicle.lastLatitude/lastLongitude/etc.
// hold only the *latest* snapshot for fast reads; this table holds full history
// for route playback / reports.
const Position = sequelize.define('Position', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  vehicleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'vehicles', key: 'id' }
  },
  imeiNumber: { type: DataTypes.STRING, allowNull: false }, // kept redundantly for fast lookup by device
  latitude: { type: DataTypes.DOUBLE, allowNull: false },
  longitude: { type: DataTypes.DOUBLE, allowNull: false },
  altitude: { type: DataTypes.FLOAT, allowNull: true },
  speedKmh: { type: DataTypes.FLOAT, allowNull: true },
  course: { type: DataTypes.FLOAT, allowNull: true },
  satellites: { type: DataTypes.INTEGER, allowNull: true },
  ignition: { type: DataTypes.BOOLEAN, allowNull: true },
  deviceTimestamp: { type: DataTypes.DATE, allowNull: false }, // time reported BY the device
  raw: { type: DataTypes.JSON, allowNull: true } // full decoded IO element map, for debugging/future use
}, {
  tableName: 'positions',
  timestamps: true,
  indexes: [
    { fields: ['vehicleId', 'deviceTimestamp'] },
    { fields: ['imeiNumber'] }
  ]
});

module.exports = Position;
