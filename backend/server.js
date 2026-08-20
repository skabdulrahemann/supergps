require('dotenv').config();
const http = require('http');
const { sequelize } = require('./models');
const app = require('./app');
const { createTrackingServer } = require('./tracking/tcpServer');
const { isImeiAuthorized, savePositionsForImei } = require('./services/trackingService');
const { initTrackingSocket } = require('./sockets/trackingSocket');

const PORT = process.env.PORT || 5000;
const TRACKING_PORT = Number(process.env.TRACKING_PORT || 7077);
const TRACKING_ENABLED = process.env.TRACKING_ENABLED !== 'false';

const startTrackingServer = () => {
  if (!TRACKING_ENABLED) {
    console.log('Tracking TCP server disabled.');
    return null;
  }

  const trackingServer = createTrackingServer({
    isImeiAuthorized,
    onPositions: savePositionsForImei,
    logger: console,
  });

  trackingServer.listen(TRACKING_PORT, () => {
    console.log(`Tracking TCP server running on port ${TRACKING_PORT}`);
  });

  trackingServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Tracking port ${TRACKING_PORT} is already in use. Stop the existing tracking server or set TRACKING_PORT in .env.`);
      process.exit(1);
    }

    console.error('Tracking TCP server error:', err);
  });

  return trackingServer;
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Postgres database connected.');

    if (process.env.DB_SYNC !== 'false') {
      await sequelize.sync();
      console.log('Models synced.');
    } else {
      console.log('Model sync skipped.');
    }

    startTrackingServer();

    const server = http.createServer(app);
    initTrackingSocket(server);

    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the existing backend or set a different PORT in .env.`);
        process.exit(1);
      }

      throw err;
    });
  } catch (err) {
    console.error('Unable to connect to database:', err);
    process.exit(1);
  }
};

startServer();
