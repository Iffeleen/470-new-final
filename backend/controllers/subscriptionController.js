const SubscriptionTier = require('../models/SubscriptionTier');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const AssetCategory = require('../models/AssetCategory');
const Warehouse = require('../models/Warehouse');
const Invitation = require('../models/Invitation');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/subscription/tiers
 * @desc    The plan catalog every tenant can choose from -- powers an
 *          "Upgrade your plan" screen without hardcoding tier names or
 *          prices into the frontend.
 * @access  Private (any authenticated user)
 */
const getTiers = asyncHandler(async (req, res) => {
  const tiers = await SubscriptionTier.find({ isActive: true }).sort({ displayOrder: 1 });
  res.status(200).json({ success: true, count: tiers.length, data: tiers });
});

/**
 * @route   GET /api/subscription/usage
 * @desc    The tenant's current plan plus LIVE usage against every limit
 *          it enforces -- this is what a billing/account settings page
 *          reads to show "3 of 10 users used" style progress bars, and is
 *          exactly the same data enforceSubscriptionLimit checks against
 *          on every create request.
 * @access  Private (any authenticated user)
 */
const getUsage = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.tenant._id).populate('subscriptionTier');
  const tier = tenant.subscriptionTier;

  const [activeUsers, pendingInvites, materialTypes, topLevelWarehouses] = await Promise.all([
    User.countDocuments({ tenantId: req.tenantId, deletedAt: null, isActive: true }),
    Invitation.countDocuments(req.scoped({ status: 'pending' })),
    AssetCategory.countDocuments(req.scoped({ isActive: true })),
    Warehouse.countDocuments(req.scoped({ isActive: true, parentLocation: null }))
  ]);

  const summarize = (used, limit) => ({
    used,
    limit,
    unlimited: limit === -1,
    remaining: limit === -1 ? null : Math.max(limit - used, 0)
  });

  res.status(200).json({
    success: true,
    data: {
      tier: {
        name: tier.name,
        monthlyPrice: tier.monthlyPrice,
        features: tier.features
      },
      usage: {
        users: summarize(activeUsers + pendingInvites, tier.maxUsers),
        materialTypes: summarize(materialTypes, tier.maxMaterialTypes),
        warehouses: summarize(topLevelWarehouses, tier.maxWarehouses)
      }
    }
  });
});

/**
 * @route   PUT /api/subscription/upgrade
 * @desc    Simulates the billing system telling IN-Track a tenant's plan
 *          changed -- swaps which SubscriptionTier document the tenant
 *          points to. A REAL billing integration (Stripe webhook, etc.)
 *          would call this same internal transition after payment
 *          succeeds; this endpoint IS that internal transition, without a
 *          real payment processor wired in front of it.
 * @access  Private, Owner only
 */
const changeTier = asyncHandler(async (req, res) => {
  const { tierName } = req.body;

  if (!tierName) {
    throw new AppError('tierName is required', 400);
  }

  const newTier = await SubscriptionTier.findOne({ name: tierName, isActive: true });
  if (!newTier) {
    throw new AppError(`Unknown or inactive plan "${tierName}"`, 400);
  }

  const tenant = await Tenant.findById(req.tenant._id);
  tenant.subscriptionTier = newTier._id;
  await tenant.save();

  res.status(200).json({
    success: true,
    message: `Plan changed to ${newTier.name}`,
    data: { tier: newTier }
  });
});

module.exports = { getTiers, getUsage, changeTier };
