require('dotenv').config();
const { DataTypes } = require('sequelize');
const { sequelize } = require('../models');

const columns = {
  targetVehicleNumber: { type: DataTypes.STRING, allowNull: true },
  targetVehicleType: { type: DataTypes.STRING, allowNull: true },
  targetVehicleBrand: { type: DataTypes.STRING, allowNull: true },
  targetVehicleModel: { type: DataTypes.STRING, allowNull: true },
};

async function migrate() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('orders');

    for (const [name, definition] of Object.entries(columns)) {
      if (table[name]) {
        console.log(`orders.${name} already exists`);
        continue;
      }

      await queryInterface.addColumn('orders', name, definition);
      console.log(`orders.${name} added`);
    }

    console.log('Order vehicle fields migration complete.');
  } catch (err) {
    console.error('Order vehicle fields migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

migrate();
