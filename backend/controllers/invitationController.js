const Invitation = require('../models/Invitation');
const Role = require('../models/Role');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { generateToken } = require('../utils/generateToken');
const { assertOwnership } = require('../middleware/tenantIsolation');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

const INVITE_EXPIRY_DAYS = 7;

/**
 * @route   POST /api/invitations
 * @desc    Owner/admin invites a new team member into a specific custom role.
 *          No email is actually sent here (that's an infra concern outside
 *          this module's scope) — the invite link/token is returned directly
 *          so the frontend can display it or wire up a mail provider later.
 * @access  Private (requires team:invite)
 */
const createInvitation = asyncHandler(async (req, res) => {
  const { email, roleId } = req.body;

  if (!email || !roleId) {
    throw new AppError('Email and role are required', 400);
  }

  const role = await Role.findOne(req.scoped({ _id: roleId }));
  assertOwnership(role, req, 'Role');

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('A user with this email already exists', 400);
  }

  const existingInvite = await Invitation.findOne(
    req.scoped({ email: email.toLowerCase(), status: 'pending' })
  );
  if (existingInvite && !existingInvite.isExpired()) {
    throw new AppError('An active invitation already exists for this email', 400);
  }

  // Enforce subscription seat limit before creating the invite (Part 1.5)
  // now runs as middleware -- see routes/invitationRoutes.js's
  // `enforceSubscriptionLimit(...)` call ahead of this handler.

  const invitation = await Invitation.create({
    tenantId: req.tenantId,
    email: email.toLowerCase(),
    role: role._id,
    invitedBy: req.user._id,
    token: Invitation.generateToken(),
    expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  });

  res.status(201).json({
    success: true,
    message: 'Invitation created',
    data: {
      id: invitation._id,
      email: invitation.email,
      role: role.name,
      expiresAt: invitation.expiresAt,
      // In production this becomes a link e.g. `${CLIENT_URL}/accept-invite/${token}`
      // and is emailed rather than returned in the API response.
      inviteToken: invitation.token
    }
  });
});

/**
 * @route   GET /api/invitations
 * @desc    List all pending invitations for the tenant (for the team management screen)
 * @access  Private (requires team:invite or team:view)
 */
const getInvitations = asyncHandler(async (req, res) => {
  const invitations = await Invitation.find(req.scoped({ status: 'pending' }))
    .populate('role', 'name')
    .populate('invitedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: invitations.length, data: invitations });
});

/**
 * @route   DELETE /api/invitations/:id
 * @desc    Revoke a pending invitation before it's accepted.
 * @access  Private (requires team:invite)
 */
const revokeInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findOne(req.scoped({ _id: req.params.id }));
  assertOwnership(invitation, req, 'Invitation');

  invitation.status = 'revoked';
  await invitation.save();

  res.status(200).json({ success: true, message: 'Invitation revoked', data: {} });
});

/**
 * @route   GET /api/invitations/verify/:token
 * @desc    Public lookup so the "accept invite" page can show which company
 *          and role the invite is for before the person sets a password.
 * @access  Public
 */
const verifyInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findOne({ token: req.params.token })
    .populate('role', 'name')
    .populate('invitedBy', 'firstName lastName');

  if (!invitation || invitation.status !== 'pending') {
    throw new AppError('This invitation is invalid or has already been used', 404);
  }

  if (invitation.isExpired()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new AppError('This invitation has expired. Ask your admin to send a new one.', 410);
  }

  const tenant = await Tenant.findOne({ tenantId: invitation.tenantId });

  res.status(200).json({
    success: true,
    data: {
      email: invitation.email,
      companyName: tenant.companyName,
      roleName: invitation.role.name,
      invitedBy: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
    }
  });
});

/**
 * @route   POST /api/invitations/accept/:token
 * @desc    Public: the invited person sets their name + password and their
 *          User account is created, pre-attached to the inviting tenant/role.
 *          This is the ONLY other place besides company registration where
 *          a User can be created — and note tenantId/role are never supplied
 *          by the client, only resolved from the (server-verified) invitation.
 * @access  Public
 */
const acceptInvitation = asyncHandler(async (req, res) => {
  const { firstName, lastName, password } = req.body;

  if (!firstName || !lastName || !password) {
    throw new AppError('First name, last name, and password are required', 400);
  }
  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  const invitation = await Invitation.findOne({ token: req.params.token });

  if (!invitation || invitation.status !== 'pending') {
    throw new AppError('This invitation is invalid or has already been used', 404);
  }
  if (invitation.isExpired()) {
    invitation.status = 'expired';
    await invitation.save();
    throw new AppError('This invitation has expired. Ask your admin to send a new one.', 410);
  }

  const tenant = await Tenant.findOne({ tenantId: invitation.tenantId });
  if (!tenant || !tenant.isActive) {
    throw new AppError('The company associated with this invite is no longer active', 400);
  }

  const user = await User.create({
    firstName,
    lastName,
    email: invitation.email,
    password,
    tenantId: invitation.tenantId,
    tenant: tenant._id,
    role: invitation.role
  });

  invitation.status = 'accepted';
  await invitation.save();

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token,
    data: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      tenantId: user.tenantId,
      companyName: tenant.companyName
    }
  });
});

module.exports = {
  createInvitation,
  getInvitations,
  revokeInvitation,
  verifyInvitation,
  acceptInvitation
};
