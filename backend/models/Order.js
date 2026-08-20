const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: { type: DataTypes.STRING, unique: true, allowNull: false },
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
  salesCode: { type: DataTypes.STRING, allowNull: true },
  productName: { type: DataTypes.STRING, defaultValue: 'SuperGPS Device' },
  targetVehicleNumber: { type: DataTypes.STRING, allowNull: true },
  targetVehicleType: { type: DataTypes.STRING, allowNull: true },
  targetVehicleBrand: { type: DataTypes.STRING, allowNull: true },
  targetVehicleModel: { type: DataTypes.STRING, allowNull: true },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  totalAmount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  paymentMethod: { type: DataTypes.STRING },
  orderStatus: {
    type: DataTypes.ENUM('placed', 'confirmed', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'placed'
  },
  shippingAddress: { type: DataTypes.TEXT },
  trackingNumber: { type: DataTypes.STRING },
  isActivated: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'orders', timestamps: true });

module.exports = Order;
