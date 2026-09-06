const mongoose = require('mongoose');

// Any collection that stores tenant-owned data follows this exact pattern:
// a required, indexed `tenantId` field stamped on every document.
const SampleItemSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index: every list/search query filters by tenantId first,
// so this keeps those queries fast as data grows across many tenants.
SampleItemSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('SampleItem', SampleItemSchema);
