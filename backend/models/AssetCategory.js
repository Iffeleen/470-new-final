const mongoose = require('mongoose');

/**
 * 1.3 -- CUSTOM ASSET DEFINITIONS
 * --------------------------------
 * "A dynamic database layer allowing businesses to create completely
 * custom inventory categories with sector-specific metrics (e.g., kg,
 * liters, meters, yards, pieces) instead of hardcoded items."
 *
 * `unitOfMeasure` is a free-text field, not an enum -- a textile company
 * can use "yards", a steelworks can use "tonnes", neither is baked into
 * the schema. `customFields` lets each tenant attach whatever extra
 * metadata its sector needs (e.g. batch_color, thread_count) without
 * anyone touching the database schema.
 */
const CustomFieldSchema = new mongoose.Schema({
  fieldName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  fieldType: {
    type: String,
    enum: ['text', 'number', 'date', 'boolean'],
    required: true
  },
  required: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const AssetCategorySchema = new mongoose.Schema({
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
  unitOfMeasure: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30
  },
  customFields: {
    type: [CustomFieldSchema],
    default: []
  },
  // Used later by Module 2's low-stock alert feature; optional here.
  lowStockThreshold: {
    type: Number,
    default: null,
    min: 0
  },
  description: {
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

// A category name must be unique within a tenant, but two unrelated
// companies can both have a category called "Steel Rod" without conflict.
AssetCategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });
AssetCategorySchema.index({ tenantId: 1, isActive: 1 });

AssetCategorySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AssetCategory', AssetCategorySchema);
