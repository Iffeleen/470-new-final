require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler } = require('./utils/errorHandler');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const roleRoutes = require('./routes/roleRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const teamRoutes = require('./routes/teamRoutes');
const assetCategoryRoutes = require('./routes/assetCategoryRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

/**
 * This file builds and exports the Express `app` only — no DB connection,
 * no app.listen(). That split is what lets tests (see tests/) require this
 * file directly and drive it with supertest against an in-memory MongoDB,
 * without ever opening a real network port or needing a live database.
 *
 * server.js is the thin production entrypoint: it requires this file,
 * connects to the real database, then starts listening.
 */
const app = express();

// Security headers
app.use(helmet());

// CORS - restrict to the frontend origin
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging (dev only)
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Basic rate limiting to slow down brute-force attempts on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: 'Too many attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register-company', authLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'IN-Track API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/asset-categories', assetCategoryRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/subscription', subscriptionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
