const mongoose = require('mongoose');
const { ALL_PERMISSIONS, WILDCARD } = require('../config/permissions');

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  // True only for the single auto-created "Owner" role per tenant.
  // Owner roles cannot be edited or deleted (enforced in the controller).
  isOwnerRole: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  permissions: {
    type: [String],
    default: [],
    validate: {
      validator: function (perms) {
        // Owner role is allowed the wildcard; every other role must only
        // contain permissions that actually exist in the registry.
        if (perms.includes(WILDCARD)) {
          return this.isOwnerRole === true && perms.length === 1;
        }
        return perms.every((p) => ALL_PERMISSIONS.includes(p));
      },
      message: 'One or more permissions are invalid, or the wildcard was used on a non-owner role.'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Role names must be unique within a tenant, but different companies can
// both have a role called "Manager" without conflict.
RoleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

RoleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Role', RoleSchema);
