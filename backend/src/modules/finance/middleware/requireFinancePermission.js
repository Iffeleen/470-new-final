/**
 * RBAC Permission Middleware for Finance Module.
 * Gates routes behind fine-grained permissions:
 * - finance.read
 * - finance.create
 * - finance.update
 * - finance.delete
 */

function requireFinancePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.auth || !req.auth.companyId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication context is missing'
      });
    }

    const permissions = req.auth.permissions || [];

    // If user has wildcard finance admin or the specific permission
    if (permissions.includes('*') || permissions.includes('finance.*') || permissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: Missing required permission [${requiredPermission}]`
    });
  };
}

module.exports = {
  requireFinancePermission
};
