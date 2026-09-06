const { AppError } = require('../utils/errorHandler');
const { WILDCARD } = require('../config/permissions');

/**
 * GRANULAR ROLE-BASED ACCESS CONTROL
 * -----------------------------------
 * Usage: router.post('/items', protect, enforceTenantIsolation, authorize(PERMISSIONS.INVENTORY_CREATE), createItem)
 *
 * This runs AFTER `protect` (which loads req.user.role with permissions
 * already populated via .populate('role') in the auth middleware). It never
 * trusts anything from the request body — the only source of truth for a
 * user's permissions is the Role document tied to them in the database.
 */
const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      throw new AppError('No role assigned to this account. Contact your company admin.', 403);
    }

    const userPermissions = req.user.role.permissions || [];

    // Owner wildcard bypasses all checks within their own tenant
    if (userPermissions.includes(WILDCARD)) {
      return next();
    }

    const hasAllRequired = requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasAllRequired) {
      throw new AppError(
        `You don't have permission to perform this action. Required: ${requiredPermissions.join(', ')}`,
        403
      );
    }

    next();
  };
};

/**
 * Passes if the user holds ANY of the listed permissions (rather than ALL).
 * Useful for routes multiple different roles should reach for different reasons.
 */
const authorizeAny = (...anyPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      throw new AppError('No role assigned to this account. Contact your company admin.', 403);
    }

    const userPermissions = req.user.role.permissions || [];

    if (userPermissions.includes(WILDCARD)) {
      return next();
    }

    const hasAny = anyPermissions.some((perm) => userPermissions.includes(perm));

    if (!hasAny) {
      throw new AppError(
        `You don't have permission to perform this action. Required any of: ${anyPermissions.join(', ')}`,
        403
      );
    }

    next();
  };
};

// Restricts a route to the tenant's Owner only (e.g. deleting the whole company)
const ownerOnly = (req, res, next) => {
  if (!req.user || !req.user.role || !req.user.role.isOwnerRole) {
    throw new AppError('Only the company owner can perform this action', 403);
  }
  next();
};

module.exports = { authorize, authorizeAny, ownerOnly };
