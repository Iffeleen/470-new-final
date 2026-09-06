const Tenant = require('../models/Tenant');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

const UNLIMITED = -1;

/**
 * 1.5 -- SUBSCRIPTION TIER GATEKEEPING (the dependency itself)
 * ----------------------------------------------------------------
 * "Programmatic infrastructure ... restricting app access limits based on
 * paid plan. Dependency checks before record creation."
 *
 * This is the ONE reusable checkpoint every limited resource in the app
 * runs through, mirroring the FastAPI `Depends(...)` pattern the spec
 * names: it runs as middleware BEFORE the controller, and if the tenant's
 * plan limit is already met, the request never reaches record creation.
 *
 * Before this Part existed, three different controllers (asset categories
 * - Part 3, warehouses - Part 4, team invitations - Part 1.2) each
 * hand-rolled their own near-identical "load tenant -> load tier -> count
 * existing rows -> compare -> throw 403" block. This middleware factory
 * replaces all three with one implementation, parameterised only by:
 *
 *   - limitField:   which SubscriptionTier field holds the ceiling
 *                   (e.g. 'maxMaterialTypes', 'maxWarehouses', 'maxUsers')
 *   - countUsage:   an async (req) => number|null callback that counts the
 *                   tenant's CURRENT usage of that resource. Returning
 *                   `null` tells the gate to skip the check entirely for
 *                   this particular request (used by warehouses.js: a
 *                   shelf/bin nested under an existing building doesn't
 *                   count against the site limit, so its countUsage simply
 *                   returns null when req.body.parentLocation is set).
 *   - resourceLabel: human-readable plural noun for the error message,
 *                    e.g. "material types", "warehouse location(s)".
 *
 * Usage (identical shape at every call site):
 *   router.post('/', authorize(...), enforceSubscriptionLimit(
 *     'maxMaterialTypes',
 *     (req) => AssetCategory.countDocuments(req.scoped({ isActive: true })),
 *     'material types'
 *   ), createAssetCategory);
 */
const enforceSubscriptionLimit = (limitField, countUsage, resourceLabel) =>
  asyncHandler(async (req, res, next) => {
    const tenant = await Tenant.findById(req.tenant._id).populate('subscriptionTier');
    const tier = tenant.subscriptionTier;

    // Attach so controllers/other middleware can read the tenant's current
    // plan without a second DB round trip (e.g. the usage-summary endpoint).
    req.subscriptionTier = tier;

    if (!tier) return next(); // defensive: should be unreachable post-registration

    const limit = tier[limitField];

    if (limit === UNLIMITED || limit === undefined || limit === null) {
      return next();
    }

    const currentUsage = await countUsage(req);

    // A null usage count is this gate's "not applicable to this request"
    // signal (see warehouses' child-location case above) -- not a real 0.
    if (currentUsage === null || currentUsage === undefined) {
      return next();
    }

    if (currentUsage >= limit) {
      throw new AppError(
        `Your ${tier.name} plan allows a maximum of ${limit} ${resourceLabel}. Upgrade your plan to add more.`,
        403
      );
    }

    next();
  });

module.exports = { enforceSubscriptionLimit, UNLIMITED };
