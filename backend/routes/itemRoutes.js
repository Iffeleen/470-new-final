const express = require('express');
const router = express.Router();
const {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem
} = require('../controllers/itemController');
const { protect } = require('../middleware/auth');
const { enforceTenantIsolation } = require('../middleware/tenantIsolation');

// Every route here runs: verify JWT -> attach tenant context -> enforce isolation
router.use(protect, enforceTenantIsolation);

router.route('/')
  .get(getItems)
  .post(createItem);

router.route('/:id')
  .get(getItem)
  .put(updateItem)
  .delete(deleteItem);

module.exports = router;
