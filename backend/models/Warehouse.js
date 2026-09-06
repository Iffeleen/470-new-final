const mongoose = require('mongoose');

/**
 * 1.4 -- MULTI-WAREHOUSE / LOCATION MAPPING
 * ------------------------------------------
 * "Structural capability for a single tenant to track separate inventories
 * across multiple physical buildings, shelves, or floor bins with
 * per-location stock balances."
 *
 * A Warehouse document represents ANY physical storage location -- a whole
 * building, a shelf inside that building, or a floor bin inside a shelf.
 * `locationType` records the granularity; `parentLocation` lets locations
 * nest (Building -> Shelf -> Bin) so a tenant can be as coarse or as
 * granular as its own operation needs, without anyone touching the schema.
 *
 * Per-location stock BALANCES (how much of a given AssetCategory sits at a
 * given Warehouse) are tracked separately in LocationStock.js -- this file
 * only describes the locations themselves.
 */
const WarehouseSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  locationType: {
    type: String,
    enum: ['building', 'shelf', 'bin', 'other'],
    default: 'building'
  },
  // A shelf's parentLocation is its building; a bin's parentLocation is its
  // shelf. Top-level physical sites (locationType: 'building') leave this
  // null. Nesting depth is not hardcoded to 3 levels -- a tenant could
  // model a building -> room -> shelf -> bin chain if it wanted to.
  parentLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    default: null
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// A location name must be unique within a tenant (mirrors AssetCategory's
// pattern), but two unrelated companies can both have a "Main Warehouse".
WarehouseSchema.index({ tenantId: 1, name: 1 }, { unique: true });
WarehouseSchema.index({ tenantId: 1, isActive: 1 });
WarehouseSchema.index({ tenantId: 1, parentLocation: 1 });

WarehouseSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Warehouse', WarehouseSchema);
