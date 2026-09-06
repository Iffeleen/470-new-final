/**
 * Module 1 Authentication and RBAC Compatibility Adapter.
 * 
 * In Mode B (Independent Development Mode):
 * - Extracts or populates standard req.auth context:
 *     req.auth = { userId, companyId, role, permissions }
 * - Requires explicit DEV_AUTH_BYPASS=true and NODE_ENV !== 'production'.
 * - Never bypasses in production.
 * - Respects custom dev headers (x-user-id, x-company-id, x-role) for multi-tenant testing.
 */

function module1AuthMiddleware(req, res, next) {
  // If Module 1's real auth middleware already attached req.auth, use it directly (Mode A)
  if (req.auth && req.auth.companyId && req.auth.userId) {
    return next();
  }

  // Check if development bypass is explicitly allowed
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevBypassEnabled = process.env.DEV_AUTH_BYPASS === 'true';

  if (isProduction || !isDevBypassEnabled) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Authorization token is missing or invalid.'
    });
  }

  // Independent Development Context (Mode B)
  // Headers take precedence to allow automated multi-tenant testing
  const userId = req.headers['x-user-id'] || process.env.DEV_TEST_USER_ID || 'usr_dev_finance_01';
  const companyId = req.headers['x-company-id'] || process.env.DEV_TEST_COMPANY_ID || 'cmp_dev_intrack_01';
  const role = req.headers['x-role'] || process.env.DEV_TEST_ROLE || 'Finance Manager';

  // Standard permissions assigned to Finance roles during independent mode
  let permissions = [
    'finance.read',
    'finance.create',
    'finance.update',
    'finance.delete'
  ];

  if (role === 'Viewer') {
    permissions = ['finance.read'];
  } else if (req.headers['x-permissions']) {
    try {
      permissions = JSON.parse(req.headers['x-permissions']);
    } catch {
      permissions = req.headers['x-permissions'].split(',').map(p => p.trim());
    }
  }

  req.auth = {
    userId,
    companyId,
    role,
    permissions
  };

  next();
}

module.exports = {
  module1AuthMiddleware
};
