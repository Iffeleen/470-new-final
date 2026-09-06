const express = require('express');
const router = express.Router();
const {
  getPermissionCatalog,
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole
} = require('../controllers/roleController');
const { protect } = require('../middleware/auth');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');
const { authorize } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/permissions');

router.use(protect, enforceTenantIsolation);

router.get('/permissions', getPermissionCatalog);

router.route('/')
  .get(authorize(PERMISSIONS.ROLE_VIEW), getRoles)
  .post(authorize(PERMISSIONS.ROLE_CREATE), createRole);

router.route('/:id')
  .get(authorize(PERMISSIONS.ROLE_VIEW), getRole)
  .put(authorize(PERMISSIONS.ROLE_EDIT), updateRole)
  .delete(authorize(PERMISSIONS.ROLE_DELETE), deleteRole);

module.exports = router;
