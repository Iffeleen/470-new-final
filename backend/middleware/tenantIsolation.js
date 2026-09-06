const { AppError } = require('../utils/errorHandler');

/**
 * MULTI-TENANT DATA ISOLATION MIDDLEWARE
 * ----------------------------------------
 * This is the backend enforcement layer that guarantees Company A can never
 * see, query, or accidentally mutate Company B's data.
 *
 * Strategy: every tenant-owned Mongoose schema carries a `tenantId` field.
 * This middleware does two things:
 *   1. Guarantees req.tenantId exists (set only by the auth middleware from
 *      the verified JWT — never from user input).
 *   2. Injects a reusable `req.tenantFilter` object that every controller
 *      MUST spread into its Mongoose queries, e.g.:
 *          Model.find({ ...req.tenantFilter, ...otherFilters })
 *
 * We additionally patch a `withTenantScope` helper onto req so controllers
 * have a single, hard-to-forget entry point rather than remembering to type
 * `{ tenantId: req.tenantId }` everywhere by hand.
 */
const enforceTenantIsolation = (req, res, next) => {
  if (!req.tenantId) {
    // This should be unreachable if `protect` ran first, but we fail loudly
    // rather than silently letting an unscoped query through.
    throw new AppError(
      'Tenant context missing — request blocked to prevent cross-tenant data access',
      403
    );
  }

  req.tenantFilter = { tenantId: req.tenantId };

  // Helper: merges any query object with the mandatory tenant filter.
  // Controllers call req.scoped({ status: 'active' }) instead of building
  // the filter manually, which removes the chance of a developer forgetting it.
  req.scoped = (extraFilter = {}) => ({
    ...extraFilter,
    tenantId: req.tenantId
  });

  next();
};

/**
 * Verifies that a document fetched by ID actually belongs to the requester's
 * tenant. Use this as a second line of defense after Model.findById(id) in
 * controllers where a raw findById (not findOne with tenantId) was used,
 * e.g. when a library or population step requires findById.
 */
const assertOwnership = (doc, req, resourceName = 'Resource') => {
  if (!doc) {
    throw new AppError(`${resourceName} not found`, 404);
  }
  if (String(doc.tenantId) !== String(req.tenantId)) {
    // Deliberately return 404, not 403 — we don't want to reveal that the
    // resource exists at all inside another tenant's data.
    throw new AppError(`${resourceName} not found`, 404);
  }
  return doc;
};

module.exports = { enforceTenantIsolation, assertOwnership };
