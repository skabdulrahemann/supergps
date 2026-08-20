const sequelize = require('../config/database');
const User = require('./User');
const Dealer = require('./Dealer');
const Order = require('./Order');
const Vehicle = require('./Vehicle');
const ActivationLog = require('./ActivationLog');
const Position = require('./Position');

// Relations
User.hasOne(Dealer, { foreignKey: 'userId', as: 'dealerProfile' });
Dealer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Order, { foreignKey: 'customerId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

Dealer.hasMany(Order, { foreignKey: 'dealerId', as: 'orders' });
Order.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });

Order.hasMany(Vehicle, { foreignKey: 'orderId', as: 'vehicles' });
Vehicle.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

User.hasMany(Vehicle, { foreignKey: 'customerId', as: 'vehicles' });
Vehicle.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

Dealer.hasMany(Vehicle, { foreignKey: 'dealerId', as: 'vehicles' });
Vehicle.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });

Vehicle.hasMany(ActivationLog, { foreignKey: 'vehicleId', as: 'activationLogs' });
ActivationLog.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

Vehicle.hasMany(Position, { foreignKey: 'vehicleId', as: 'positions' });
Position.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

const db = { sequelize, User, Dealer, Order, Vehicle, ActivationLog, Position };
module.exports = db;