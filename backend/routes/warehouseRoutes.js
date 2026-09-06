const express = require('express');
const router = express.Router();
const {
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
} = require('../controllers/warehouseController');
const { getStockAtWarehouse, setStockAtLocation } = require('../controllers/locationStockController');
const { protect } = require('../middleware/auth');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');
const { authorize } = require('../middleware/rbac');
const { enforceSubscriptionLimit } = require('../middleware/subscriptionGate');
const { PERMISSIONS } = require('../config/permissions');
const Warehouse = require('../models/Warehouse');

router.use(protect, enforceTenantIsolation);

router.route('/')
  .get(authorize(PERMISSIONS.WAREHOUSE_VIEW), getWarehouses)
  .post(
    authorize(PERMISSIONS.WAREHOUSE_CREATE),
    // Part 1.5: only a NEW top-level site counts against the plan -- a
    // shelf/bin nested under an existing site is free, so the callback
    // returns null (meaning "skip this check") whenever a parentLocation
    // was supplied in the request body.
    enforceSubscriptionLimit(
      'maxWarehouses',
      (req) =>
        req.body.parentLocation
          ? null
          : Warehouse.countDocuments(req.scoped({ isActive: true, parentLocation: null })),
      'warehouse location(s)'
    ),
    createWarehouse
  );

router.route('/:id')
  .get(authorize(PERMISSIONS.WAREHOUSE_VIEW), getWarehouse)
  .put(authorize(PERMISSIONS.WAREHOUSE_EDIT), updateWarehouse)
  .delete(authorize(PERMISSIONS.WAREHOUSE_DELETE), deleteWarehouse);

// Per-location stock balances -- stock is inventory data, so these use the
// INVENTORY_* permissions rather than WAREHOUSE_*, even though they're
// nested under /warehouses in the URL.
router.route('/:warehouseId/stock')
  .get(authorize(PERMISSIONS.INVENTORY_VIEW), getStockAtWarehouse);

router.route('/:warehouseId/stock/:categoryId')
  .put(authorize(PERMISSIONS.INVENTORY_EDIT), setStockAtLocation);

module.exports = router;
