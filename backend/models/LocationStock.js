const mongoose = require('mongoose');

/**
 * 1.4 -- PER-LOCATION STOCK BALANCES
 * ------------------------------------
 * Tracks how much of a given AssetCategory (Part 1.3's custom material
 * definitions) is held at a specific Warehouse/location. The unique
 * compound index below is the entire point of this model: it's what lets
 * the SAME material ("Cotton Yarn") carry a DIFFERENT balance at the
 * "Main Warehouse" building than at its "Shelf A3" sub-location.
 *
 * Part 4's job is only to provide this structural balance-per-location
 * capability. The transaction engine that actually MOVES stock in response
 * to a purchase order or a manufacturing run is Module 2's job (2.2 PO
 * Ingestion Engine, 2.4 Real-Time Balance Adjustments) -- this model is
 * exactly what those features will read from and write to.
 */
const LocationStockSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  assetCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetCategory',
    required: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: [0, 'Stock quantity cannot be negative']
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// One balance row per (warehouse, assetCategory) pair, scoped per tenant.
LocationStockSchema.index({ tenantId: 1, warehouse: 1, assetCategory: 1 }, { unique: true });
LocationStockSchema.index({ tenantId: 1, assetCategory: 1 });

LocationStockSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('LocationStock', LocationStockSchema);
