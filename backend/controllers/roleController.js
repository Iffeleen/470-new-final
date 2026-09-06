const Role = require('../models/Role');
const User = require('../models/User');
const { assertOwnership } = require('../middleware/tenantIsolation');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');
const { ALL_PERMISSIONS, ROLE_TEMPLATES } = require('../config/permissions');

/**
 * @route   GET /api/roles/permissions
 * @desc    Returns the full list of assignable permissions, plus templates,
 *          so the frontend can render checkboxes without hardcoding strings.
 * @access  Private (any authenticated user can view what's assignable)
 */
const getPermissionCatalog = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      permissions: ALL_PERMISSIONS,
      templates: ROLE_TEMPLATES
    }
  });
});

/**
 * @route   GET /api/roles
 * @desc    List every role belonging to this tenant.
 * @access  Private (requires role:view)
 */
const getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find(req.scoped()).sort({ createdAt: 1 });

  res.status(200).json({ success: true, count: roles.length, data: roles });
});

/**
 * @route   GET /api/roles/:id
 * @access  Private (requires role:view)
 */
const getRole = asyncHandler(async (req, res) => {
  const role = await Role.findOne(req.scoped({ _id: req.params.id }));
  assertOwnership(role, req, 'Role');

  res.status(200).json({ success: true, data: role });
});

/**
 * @route   POST /api/roles
 * @desc    Create a custom role (e.g. "Warehouse Manager") scoped to this tenant.
 * @access  Private (requires role:create)
 */
const createRole = asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;

  if (!name) {
    throw new AppError('Role name is required', 400);
  }

  const invalidPerms = (permissions || []).filter((p) => !ALL_PERMISSIONS.includes(p));
  if (invalidPerms.length > 0) {
    throw new AppError(`Unknown permission(s): ${invalidPerms.join(', ')}`, 400);
  }

  const existing = await Role.findOne(req.scoped({ name: name.trim() }));
  if (existing) {
    throw new AppError('A role with this name already exists', 400);
  }

  const role = await Role.create({
    tenantId: req.tenantId,
    name: name.trim(),
    description: description || '',
    permissions: permissions || [],
    isOwnerRole: false,
    createdBy: req.user._id
  });

  res.status(201).json({ success: true, data: role });
});

/**
 * @route   PUT /api/roles/:id
 * @desc    Edit a custom role's name, description, or permission list.
 *          The Owner role itself can never be edited — it always keeps '*'.
 * @access  Private (requires role:edit)
 */
const updateRole = asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;

  const role = await Role.findOne(req.scoped({ _id: req.params.id }));
  assertOwnership(role, req, 'Role');

  if (role.isOwnerRole) {
    throw new AppError('The Owner role cannot be modified', 400);
  }

  if (permissions) {
    const invalidPerms = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
    if (invalidPerms.length > 0) {
      throw new AppError(`Unknown permission(s): ${invalidPerms.join(', ')}`, 400);
    }
    role.permissions = permissions;
  }

  if (name) role.name = name.trim();
  if (description !== undefined) role.description = description;

  await role.save();

  res.status(200).json({ success: true, data: role });
});

/**
 * @route   DELETE /api/roles/:id
 * @desc    Delete a custom role. Blocked if any active user still holds it,
 *          and blocked entirely for the Owner role.
 * @access  Private (requires role:delete)
 */
const deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findOne(req.scoped({ _id: req.params.id }));
  assertOwnership(role, req, 'Role');

  if (role.isOwnerRole) {
    throw new AppError('The Owner role cannot be deleted', 400);
  }

  const usersWithRole = await User.countDocuments({
    tenantId: req.tenantId,
    role: role._id,
    deletedAt: null
  });

  if (usersWithRole > 0) {
    throw new AppError(
      `Cannot delete this role — ${usersWithRole} team member(s) are still assigned to it. Reassign them first.`,
      400
    );
  }

  await Role.findByIdAndDelete(role._id);

  res.status(200).json({ success: true, message: 'Role deleted', data: {} });
});

module.exports = {
  getPermissionCatalog,
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole
};
