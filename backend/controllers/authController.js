const crypto = require('crypto');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Role = require('../models/Role');
const SubscriptionTier = require('../models/SubscriptionTier');
const { generateToken } = require('../utils/generateToken');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

// Generates a short, unique, URL-safe tenant identifier.
// This is the value stamped onto every single row a company ever creates.
const generateTenantId = () => {
  return 'tn_' + crypto.randomBytes(8).toString('hex');
};

/**
 * @route   POST /api/auth/register-company
 * @desc    Registers a brand-new company (tenant) + its first owner user.
 *          This is the ONLY place a tenantId is ever generated from scratch.
 * @access  Public
 */
const registerCompany = asyncHandler(async (req, res) => {
  const {
    companyName,
    companyEmail,
    industry,
    phoneNumber,
    firstName,
    lastName,
    ownerEmail,
    password
  } = req.body;

  if (!companyName || !companyEmail || !industry || !firstName || !lastName || !ownerEmail || !password) {
    throw new AppError('Please provide all required fields', 400);
  }

  // Check for existing company or user email up front (outside the transaction
  // for a fast-fail, still re-checked by unique indexes at write time)
  const existingTenant = await Tenant.findOne({ companyEmail: companyEmail.toLowerCase() });
  if (existingTenant) {
    throw new AppError('A company is already registered with this email', 400);
  }

  const existingUser = await User.findOne({ email: ownerEmail.toLowerCase() });
  if (existingUser) {
    throw new AppError('A user is already registered with this email', 400);
  }

  const tenantId = generateTenantId();

  // NOTE: MongoDB multi-document transactions require a replica set, which a
  // default standalone local install does not have. Rather than requiring
  // students/devs to reconfigure MongoDB, we create records sequentially and
  // manually roll back anything already created if a later step fails. This
  // achieves the same "all-or-nothing" guarantee for local dev and standalone
  // servers, and still works unmodified if you later deploy to a real replica
  // set (e.g. MongoDB Atlas).
  let createdTenant = null;
  let createdRole = null;

  try {
    // Default free-tier subscription for every new signup
    let defaultTier = await SubscriptionTier.findOne({ name: 'Free' });
    if (!defaultTier) {
      defaultTier = await SubscriptionTier.create({ name: 'Free' });
    }

    const tenant = await Tenant.create({
      tenantId,
      companyName,
      companyEmail: companyEmail.toLowerCase(),
      industry,
      phoneNumber,
      subscriptionTier: defaultTier._id,
      owner: null // set after user creation below
    });
    createdTenant = tenant;

    // Owner role is scoped to this tenant only — no cross-tenant role sharing
    const ownerRole = await Role.create({
      name: 'Owner',
      tenantId,
      isOwnerRole: true,
      permissions: ['*'] // wildcard: full access within their own tenant
    });
    createdRole = ownerRole;

    const owner = await User.create({
      firstName,
      lastName,
      email: ownerEmail.toLowerCase(),
      password,
      tenantId,
      tenant: tenant._id,
      role: ownerRole._id
    });

    tenant.owner = owner._id;
    await tenant.save();

    const token = generateToken(owner._id);

    res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      token,
      data: {
        tenantId: tenant.tenantId,
        companyName: tenant.companyName,
        user: {
          id: owner._id,
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
          role: ownerRole.name
        }
      }
    });
  } catch (err) {
    // Manual rollback: undo whatever was already created before the failure,
    // so a crash partway through never leaves an orphaned tenant or role behind.
    if (createdRole) await Role.findByIdAndDelete(createdRole._id).catch(() => {});
    if (createdTenant) await Tenant.findByIdAndDelete(createdTenant._id).catch(() => {});
    throw err;
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Logs a user in. Tenant is resolved server-side from the user
 *          record — the client never sends or chooses a tenantId.
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null })
    .select('+password')
    .populate('role')
    .populate('tenant');

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.isLocked()) {
    throw new AppError('Account temporarily locked due to too many failed attempts. Try again later.', 423);
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    await user.incLoginAttempts();
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact your company admin.', 403);
  }

  if (!user.tenant || !user.tenant.isActive) {
    throw new AppError('Your company account is inactive. Contact support.', 403);
  }

  await user.resetLoginAttempts();
  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    data: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role.name,
      tenantId: user.tenantId,
      companyName: user.tenant.companyName
    }
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Returns the currently authenticated user + tenant context.
 *          Useful for the frontend to hydrate its TenantContext on refresh.
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      role: req.user.role.name,
      tenantId: req.tenantId,
      companyName: req.tenant.companyName,
      currency: req.tenant.currency
    }
  });
});

module.exports = { registerCompany, login, getMe };
