const mongoose = require('mongoose');

/**
 * 1.5 -- SUBSCRIPTION TIER GATEKEEPING
 * ---------------------------------------
 * "Programmatic infrastructure connected to billing system restricting app
 * access limits based on paid plan. Dependency checks before record
 * creation."
 *
 * This model is the single source of truth for what a paid plan is allowed
 * to do. Every numeric limit below uses the convention **-1 = unlimited**
 * (see `middleware/subscriptionGate.js`), so Enterprise doesn't need special
 * casing anywhere else in the codebase -- it's just a tier whose limits
 * happen to all be -1.
 *
 * Parts 3 (maxMaterialTypes) and 4 (maxWarehouses) already referenced this
 * model directly with ad-hoc inline checks before this file existed in its
 * full form; those checks have since been consolidated into the shared
 * `enforceSubscriptionLimit` middleware this Part introduces, so every
 * resource-creating route now goes through the exact same gate.
 */
const SubscriptionTierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Free', 'Starter', 'Professional', 'Enterprise'],
    unique: true
  },
  monthlyPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  maxUsers: {
    type: Number,
    default: 3
  },
  maxMaterialTypes: {
    type: Number,
    default: 50
  },
  maxWarehouses: {
    type: Number,
    default: 1
  },
  // Feature flags -- not yet enforced anywhere (no feature in Module 1
  // depends on one of these), but modeled now so Module 2+ features (e.g.
  // multi-currency, advanced audit trails) can gate on `features.includes(...)`
  // the same way limits are gated, rather than inventing a second mechanism.
  features: {
    type: [String],
    default: []
  },
  // Ordered lowest-to-highest so the frontend/API can render an upgrade
  // ladder without hardcoding tier names.
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('SubscriptionTier', SubscriptionTierSchema);

