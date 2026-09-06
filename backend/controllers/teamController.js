const User = require('../models/User');
const Role = require('../models/Role');
const { assertOwnership } = require('../middleware/tenantIsolation');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/team
 * @desc    List every active team member in this tenant with their role.
 * @access  Private (requires team:view)
 */
const getTeamMembers = asyncHandler(async (req, res) => {
  const members = await User.find(req.scoped({ deletedAt: null }))
    .select('-password')
    .populate('role', 'name isOwnerRole')
    .sort({ createdAt: 1 });

  res.status(200).json({ success: true, count: members.length, data: members });
});

/**
 * @route   PUT /api/team/:id/role
 * @desc    Reassign a team member to a different (custom) role.
 *          Cannot be used to change the Owner's role or promote someone
 *          into the Owner role — ownership transfer is a deliberately
 *          separate, more sensitive operation outside this scope.
 * @access  Private (requires team:invite, treated as the general "manage team" permission)
 */
const updateMemberRole = asyncHandler(async (req, res) => {
  const { roleId } = req.body;

  if (!roleId) {
    throw new AppError('roleId is required', 400);
  }

  const member = await User.findOne(req.scoped({ _id: req.params.id, deletedAt: null })).populate('role');
  assertOwnership(member, req, 'Team member');

  if (member.role.isOwnerRole) {
    throw new AppError('The company owner\'s role cannot be changed here', 400);
  }

  const newRole = await Role.findOne(req.scoped({ _id: roleId }));
  assertOwnership(newRole, req, 'Role');

  if (newRole.isOwnerRole) {
    throw new AppError('Cannot assign the Owner role to another member', 400);
  }

  member.role = newRole._id;
  await member.save();

  res.status(200).json({ success: true, message: 'Role updated', data: { id: member._id, role: newRole.name } });
});

/**
 * @route   DELETE /api/team/:id
 * @desc    Deactivates (soft-deletes) a team member. The Owner can never
 *          be removed this way.
 * @access  Private (requires team:remove)
 */
const removeMember = asyncHandler(async (req, res) => {
  const member = await User.findOne(req.scoped({ _id: req.params.id, deletedAt: null })).populate('role');
  assertOwnership(member, req, 'Team member');

  if (member.role.isOwnerRole) {
    throw new AppError('The company owner cannot be removed', 400);
  }

  if (String(member._id) === String(req.user._id)) {
    throw new AppError('You cannot remove your own account', 400);
  }

  member.isActive = false;
  member.deletedAt = new Date();
  await member.save();

  res.status(200).json({ success: true, message: 'Team member removed', data: {} });
});

module.exports = { getTeamMembers, updateMemberRole, removeMember };
