const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  companyEmail: {
    type: String,
    required: true,
    lowercase: true,
    unique: true
  },
  industry: {
    type: String,
    enum: ['Manufacturing', 'Retail', 'Wholesale', 'Logistics', 'Other'],
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  owner: {
    // Not required at the schema level: the tenant is created first, then
    // immediately updated with the owner's ID once the User document exists
    // (see authController.registerCompany). Enforced non-null by application
    // logic, not by the schema, since Mongo can't validate a circular
    // reference at creation time.
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  subscriptionTier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionTier',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'JPY', 'AUD', 'CAD']
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  logo: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Index for tenant isolation queries
TenantSchema.index({ tenantId: 1, isActive: 1 });

module.exports = mongoose.model('Tenant', TenantSchema);
