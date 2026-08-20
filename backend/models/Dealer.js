const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Dealer = sequelize.define('Dealer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  salesCode: { type: DataTypes.STRING, unique: true, allowNull: false },
  companyName: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING },
  state: { type: DataTypes.STRING },
  pincode: { type: DataTypes.STRING }
}, { tableName: 'dealers', timestamps: true });

module.exports = Dealer;