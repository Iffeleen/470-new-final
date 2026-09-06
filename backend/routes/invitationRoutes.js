const express = require('express');
const router = express.Router();
const {
  createInvitation,
  getInvitations,
  revokeInvitation,
  verifyInvitation,
  acceptInvitation
} = require('../controllers/invitationController');
const { protect } = require('../middleware/auth');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');
const { authorize } = require('../middleware/rbac');
const { enforceSubscriptionLimit } = require('../middleware/subscriptionGate');
const { PERMISSIONS } = require('../config/permissions');
const User = require('../models/User');
const Invitation = require('../models/Invitation');

// Public routes — the invited person doesn't have an account or token yet
router.get('/verify/:token', verifyInvitation);
router.post('/accept/:token', acceptInvitation);

// Everything below requires an authenticated, tenant-scoped user
router.use(protect, enforceTenantIsolation);

router.route('/')
  .get(authorize(PERMISSIONS.TEAM_VIEW), getInvitations)
  .post(
    authorize(PERMISSIONS.TEAM_INVITE),
    // Part 1.5: a "seat" is an active user OR a pending invite that will
    // become one -- both count against maxUsers.
    enforceSubscriptionLimit(
      'maxUsers',
      async (req) => {
        const activeUserCount = await User.countDocuments({
          tenantId: req.tenantId,
          deletedAt: null,
          isActive: true
        });
        const pendingInviteCount = await Invitation.countDocuments(req.scoped({ status: 'pending' }));
        return activeUserCount + pendingInviteCount;
      },
      'users'
    ),
    createInvitation
  );

router.delete('/:id', authorize(PERMISSIONS.TEAM_INVITE), revokeInvitation);

module.exports = router;
