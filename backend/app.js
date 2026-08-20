const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const dealerRoutes = require('./routes/dealerRoutes');
const activationRoutes = require('./routes/activationRoutes');
const userRoutes = require('./routes/userRoutes');
const trackingRoutes = require('./routes/trackingRoutes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Please try again later.' },
});

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/healthz', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SuperGPS Backend API is running',
    version: '1.0.0',
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/activation', activationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tracking', trackingRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && status >= 500
      ? 'Internal server error'
      : err.message || 'Internal server error',
  });
});

module.exports = app;
