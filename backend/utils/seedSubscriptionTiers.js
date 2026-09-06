const SubscriptionTier = require('../models/SubscriptionTier');

/**
 * 1.5 -- STANDARD PLAN CATALOG
 * ------------------------------
 * The "billing system" side of gatekeeping: a fixed catalog of plans a
 * tenant can be on. -1 means unlimited for that field. This is idempotent
 * (upsert by name) so it's safe to call on every server boot -- it will
 * never duplicate a tier, and re-running it after editing a limit below
 * will push that change to the existing document rather than requiring a
 * manual DB edit.
 */
const TIER_DEFINITIONS = [
  {
    name: 'Free',
    monthlyPrice: 0,
    maxUsers: 3,
    maxMaterialTypes: 50,
    maxWarehouses: 1,
    features: [],
    displayOrder: 0
  },
  {
    name: 'Starter',
    monthlyPrice: 29,
    maxUsers: 10,
    maxMaterialTypes: 200,
    maxWarehouses: 3,
    features: ['custom_roles'],
    displayOrder: 1
  },
  {
    name: 'Professional',
    monthlyPrice: 99,
    maxUsers: 50,
    maxMaterialTypes: 1000,
    maxWarehouses: 10,
    features: ['custom_roles', 'audit_trail_export'],
    displayOrder: 2
  },
  {
    name: 'Enterprise',
    monthlyPrice: 299,
    maxUsers: -1,
    maxMaterialTypes: -1,
    maxWarehouses: -1,
    features: ['custom_roles', 'audit_trail_export', 'sso', 'priority_support'],
    displayOrder: 3
  }
];

const seedSubscriptionTiers = async () => {
  for (const definition of TIER_DEFINITIONS) {
    await SubscriptionTier.findOneAndUpdate(
      { name: definition.name },
      { $set: definition },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
};

module.exports = { seedSubscriptionTiers, TIER_DEFINITIONS };
