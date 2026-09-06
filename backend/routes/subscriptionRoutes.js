const express = require('express');
const router = express.Router();
const { getTiers, getUsage, changeTier } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');
const { ownerOnly } = require('../middleware/rbac');

router.use(protect, enforceTenantIsolation);

router.get('/tiers', getTiers);
router.get('/usage', getUsage);

// Only the tenant's Owner can change what the whole company is billed for.
router.put('/upgrade', ownerOnly, changeTier);

module.exports = router;
