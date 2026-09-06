/**
 * MongoDB Database Connection Manager for IN-Track Backend.
 * Supports independent development and easy plug-in of Module 1's shared connection.
 */

const mongoose = require('mongoose');

let isConnected = false;

async function connectDatabase(customUri = null) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = customUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intrack_finance';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: process.env.NODE_ENV !== 'production'
    });

    isConnected = true;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Database] Connected to MongoDB at ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    }

    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
}

async function disconnectDatabase() {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};
