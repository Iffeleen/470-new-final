const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

// Verifies JWT, loads the user, and attaches tenant context to every request.
// This tenant context (req.tenantId) is what every downstream query filters on.
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authorized, no token provided', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError('Not authorized, token invalid or expired', 401);
  }

  // Load user WITH their tenant relationship — never trust a tenantId sent in the request body/headers
  const user = await User.findById(decoded.id)
    .select('-password')
    .populate('role')
    .populate('tenant');

  if (!user || user.deletedAt) {
    throw new AppError('User no longer exists', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated', 403);
  }

  if (!user.tenant || !user.tenant.isActive) {
    throw new AppError('Your company account is inactive. Contact support.', 403);
  }

  // This is the critical isolation anchor: every controller uses req.tenantId,
  // NEVER a tenantId taken from req.body or req.query, to build its DB filters.
  req.user = user;
  req.tenantId = user.tenantId;
  req.tenant = user.tenant;

  next();
});

// Restricts routes to the SaaS Super Admin (developer) panel only — bypasses tenant scoping entirely.
const superAdminOnly = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) throw new AppError('Not authorized, no token provided', 401);

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (!decoded.isSuperAdmin) {
    throw new AppError('Not authorized to access super admin resources', 403);
  }

  req.isSuperAdmin = true;
  next();
});

module.exports = { protect, superAdminOnly };
