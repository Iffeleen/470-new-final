const express = require('express');
const router = express.Router();
const { getTeamMembers, updateMemberRole, removeMember } = require('../controllers/teamController');
const { protect } = require('../middleware/auth');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');
const { authorize } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/permissions');

router.use(protect, enforceTenantIsolation);

router.get('/', authorize(PERMISSIONS.TEAM_VIEW), getTeamMembers);
router.put('/:id/role', authorize(PERMISSIONS.TEAM_INVITE), updateMemberRole);
router.delete('/:id', authorize(PERMISSIONS.TEAM_REMOVE), removeMember);

module.exports = router;
