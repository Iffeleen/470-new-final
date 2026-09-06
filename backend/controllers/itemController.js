const SampleItem = require('../models/SampleItem');
const { assertOwnership } = require('../middleware/tenantIsolation');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

/**
 * These handlers exist to demonstrate the isolation pattern end-to-end.
 * Every future module (PO ingestion, recipes, expenses, etc.) follows this
 * exact shape: req.scoped(...) on every read, tenantId stamped on every write.
 */

// @route GET /api/items
const getItems = asyncHandler(async (req, res) => {
  // req.scoped() (set by enforceTenantIsolation) guarantees tenantId is
  // ALWAYS part of the filter — impossible to accidentally omit it here.
  const items = await SampleItem.find(req.scoped()).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: items.length,
    data: items
  });
});

// @route GET /api/items/:id
const getItem = asyncHandler(async (req, res) => {
  const item = await SampleItem.findOne(req.scoped({ _id: req.params.id }));
  // findOne with tenantId baked in means a mismatched id from another
  // tenant returns null — not another company's document.
  assertOwnership(item, req, 'Item');

  res.status(200).json({ success: true, data: item });
});

// @route POST /api/items
const createItem = asyncHandler(async (req, res) => {
  const { name, quantity } = req.body;

  if (!name) throw new AppError('Item name is required', 400);

  const item = await SampleItem.create({
    tenantId: req.tenantId, // stamped server-side, never trusted from req.body
    name,
    quantity: quantity || 0,
    createdBy: req.user._id
  });

  res.status(201).json({ success: true, data: item });
});

// @route PUT /api/items/:id
const updateItem = asyncHandler(async (req, res) => {
  const { name, quantity } = req.body;

  // findOneAndUpdate scoped by tenantId: an attacker passing another
  // tenant's document _id simply gets a 404, never a silent cross-tenant write.
  const item = await SampleItem.findOneAndUpdate(
    req.scoped({ _id: req.params.id }),
    { $set: { ...(name && { name }), ...(quantity !== undefined && { quantity }) } },
    { new: true, runValidators: true }
  );

  assertOwnership(item, req, 'Item');

  res.status(200).json({ success: true, data: item });
});

// @route DELETE /api/items/:id
const deleteItem = asyncHandler(async (req, res) => {
  const item = await SampleItem.findOneAndDelete(req.scoped({ _id: req.params.id }));

  assertOwnership(item, req, 'Item');

  res.status(200).json({ success: true, message: 'Item deleted', data: {} });
});

module.exports = { getItems, getItem, createItem, updateItem, deleteItem };
