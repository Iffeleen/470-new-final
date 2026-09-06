require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDatabase, disconnectDatabase } = require('./src/config/database');
const { financeRoutes, errorHandler } = require('./src/modules/finance');
const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet());
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
// Fixed CORS: remove origin:true for dev, use explicit origin
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'IN‑Track Financial Tracking & Analytics Backend (Module 3)',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Register Module 3 Router under /api/finance
app.use('/api/finance', financeRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

// Server startup if executed directly
if (require.main === module) {
  connectDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[IN‑Track Finance Server] Running on http://localhost:${PORT}`);
        console.log(`[Environment] Mode: ${process.env.NODE_ENV || 'development'}`);
        console.log(`[Auth Adapter] DEV_AUTH_BYPASS = ${process.env.DEV_AUTH_BYPASS || 'false'}`);
      });
    })
    .catch((err) => {
      console.error('[Fatal Startup Error] Could not connect to database:', err);
      process.exit(1);
    });
}
module.exports = app;
