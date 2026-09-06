const express = require('express');
const router = express.Router();
const {
  getAssetCategories,
  getAssetCategory,
  createAssetCategory,
  updateAssetCategory,
  deleteAssetCategory
} = require('../controllers/assetCategoryController');
const { getStockForCategory } = require('../controllers/locationStockController');
const { protect } = require('../middleware/auth');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');
const { authorize } = require('../middleware/rbac');
const { enforceSubscriptionLimit } = require('../middleware/subscriptionGate');
const { PERMISSIONS } = require('../config/permissions');
const AssetCategory = require('../models/AssetCategory');

router.use(protect, enforceTenantIsolation);

router.route('/')
  .get(authorize(PERMISSIONS.INVENTORY_VIEW), getAssetCategories)
  .post(
    authorize(PERMISSIONS.INVENTORY_CREATE),
    // Part 1.5: shared gatekeeping dependency, ahead of record creation.
    enforceSubscriptionLimit(
      'maxMaterialTypes',
      (req) => AssetCategory.countDocuments(req.scoped({ isActive: true })),
      'material types'
    ),
    createAssetCategory
  );

router.route('/:id')
  .get(authorize(PERMISSIONS.INVENTORY_VIEW), getAssetCategory)
  .put(authorize(PERMISSIONS.INVENTORY_EDIT), updateAssetCategory)
  .delete(authorize(PERMISSIONS.INVENTORY_DELETE), deleteAssetCategory);

// Part 1.4: per-location breakdown of this material's stock -- how much
// sits at each warehouse/shelf/bin that holds it.
router.route('/:categoryId/stock')
  .get(authorize(PERMISSIONS.INVENTORY_VIEW), getStockForCategory);

module.exports = router;
