const mongoose = require('mongoose');
const crypto = require('crypto');

const InvitationSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// One pending invite per email per tenant — prevents spamming duplicate invites
InvitationSchema.index({ tenantId: 1, email: 1, status: 1 });

InvitationSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

InvitationSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

module.exports = mongoose.model('Invitation', InvitationSchema);
