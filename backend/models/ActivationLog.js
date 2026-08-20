const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivationLog = sequelize.define('ActivationLog', {
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
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'orders', key: 'id' }
  },
  dealerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'dealers', key: 'id' }
  },
  technicianId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  },
  step: {
    type: DataTypes.ENUM('device_check', 'sim_insert', 'power_on', 'gps_signal', 'server_connect', 'completed'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'done', 'failed'),
    defaultValue: 'pending'
  },
  notes: { type: DataTypes.TEXT },
  completedAt: { type: DataTypes.DATE }
}, { tableName: 'activation_logs', timestamps: true });

module.exports = ActivationLog;