const LocationStock = require('../models/LocationStock');
const Warehouse = require('../models/Warehouse');
const AssetCategory = require('../models/AssetCategory');
const { assertOwnership } = require('../middleware/tenantIsolation');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/warehouses/:warehouseId/stock
 * @desc    Every material balance held at one specific location -- e.g.
 *          everything sitting on "Shelf A3".
 * @access  Private (requires inventory:view)
 */
const getStockAtWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findOne(req.scoped({ _id: req.params.warehouseId }));
  assertOwnership(warehouse, req, 'Location');

  const balances = await LocationStock.find(req.scoped({ warehouse: warehouse._id }))
    .populate('assetCategory', 'name unitOfMeasure')
    .sort({ 'assetCategory.name': 1 });

  res.status(200).json({ success: true, count: balances.length, data: balances });
});

/**
 * @route   GET /api/asset-categories/:categoryId/stock
 * @desc    The flip side of the view above -- every location holding a
 *          given material, and how much is at each one. This is the
 *          clearest demonstration of "per-location stock balances": the
 *          SAME category can show a different quantity at every location.
 * @access  Private (requires inventory:view)
 */
const getStockForCategory = asyncHandler(async (req, res) => {
  const category = await AssetCategory.findOne(req.scoped({ _id: req.params.categoryId }));
  assertOwnership(category, req, 'Asset category');

  const balances = await LocationStock.find(req.scoped({ assetCategory: category._id }))
    .populate('warehouse', 'name locationType')
    .sort({ 'warehouse.name': 1 });

  const totalQuantity = balances.reduce((sum, b) => sum + b.quantity, 0);

  res.status(200).json({
    success: true,
    count: balances.length,
    totalQuantity,
    data: balances
  });
});

/**
 * @route   PUT /api/warehouses/:warehouseId/stock/:categoryId
 * @desc    Sets (upserts) the balance of one material at one location.
 *          This is the structural piece Part 1.4 is responsible for --
 *          Module 2's PO Ingestion Engine (2.2) and Real-Time Balance
 *          Adjustments (2.4) will call the same underlying pattern to move
 *          stock automatically; here it's exposed directly so the
 *          capability can be verified on its own before Module 2 exists.
 * @access  Private (requires inventory:edit)
 */
const setStockAtLocation = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  if (quantity === undefined || typeof quantity !== 'number' || quantity < 0) {
    throw new AppError('quantity must be a number >= 0', 400);
  }

  const warehouse = await Warehouse.findOne(req.scoped({ _id: req.params.warehouseId, isActive: true }));
  assertOwnership(warehouse, req, 'Location');

  const category = await AssetCategory.findOne(
    req.scoped({ _id: req.params.categoryId, isActive: true })
  );
  assertOwnership(category, req, 'Asset category');

  const balance = await LocationStock.findOneAndUpdate(
    req.scoped({ warehouse: warehouse._id, assetCategory: category._id }),
    {
      $set: { quantity, updatedBy: req.user._id },
      $setOnInsert: { tenantId: req.tenantId, warehouse: warehouse._id, assetCategory: category._id }
    },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: balance });
});

module.exports = { getStockAtWarehouse, getStockForCategory, setStockAtLocation };
