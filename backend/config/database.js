const { Sequelize } = require('sequelize');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Use your Neon Postgres connection string.');
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.DB_LOGGING === 'true',
  pool: {
    max: Number(process.env.DB_POOL_MAX || 5),
    min: Number(process.env.DB_POOL_MIN || 0),
    acquire: Number(process.env.DB_POOL_ACQUIRE_MS || 30000),
    idle: Number(process.env.DB_POOL_IDLE_MS || 10000),
  },
  dialectOptions: process.env.DB_SSL === 'false'
    ? {}
    : {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
});

module.exports = sequelize;
