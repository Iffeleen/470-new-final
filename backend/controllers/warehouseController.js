const Warehouse = require('../models/Warehouse');
const { assertOwnership } = require('../middleware/tenantIsolation');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

/**
 * If a parentLocation id was supplied, confirms it exists, belongs to this
 * tenant, and is active. Returns the parent document (or null if none).
 */
const resolveParent = async (parentLocation, req) => {
  if (!parentLocation) return null;

  const parent = await Warehouse.findOne(req.scoped({ _id: parentLocation, isActive: true }));
  if (!parent) {
    throw new AppError('Parent location not found', 400);
  }
  return parent;
};

/**
 * Walks a proposed new parent's own ancestor chain to make sure the location
 * being edited doesn't appear anywhere in it -- prevents a shelf from being
 * re-parented into one of its own bins, which would create an infinite loop.
 */
const assertNoCycle = async (locationId, proposedParentId, req) => {
  let currentId = proposedParentId;
  const seen = new Set();

  while (currentId) {
    if (String(currentId) === String(locationId)) {
      throw new AppError('A location cannot be nested inside its own descendant', 400);
    }
    if (seen.has(String(currentId))) break; // defensive: shouldn't happen, avoids any infinite loop
    seen.add(String(currentId));

    const current = await Warehouse.findOne(req.scoped({ _id: currentId }));
    currentId = current ? current.parentLocation : null;
  }
};

/**
 * @route   GET /api/warehouses
 * @desc    List every location belonging to this tenant. Supports
 *          ?parentLocation=<id> to fetch only the direct children of a
 *          location (e.g. every shelf inside one building), or
 *          ?parentLocation=root for only top-level buildings.
 * @access  Private (requires warehouse:view)
 */
const getWarehouses = asyncHandler(async (req, res) => {
  const filter = { isActive: true };

  if (req.query.parentLocation === 'root') {
    filter.parentLocation = null;
  } else if (req.query.parentLocation) {
    filter.parentLocation = req.query.parentLocation;
  }

  const warehouses = await Warehouse.find(req.scoped(filter))
    .populate('parentLocation', 'name locationType')
    .sort({ locationType: 1, name: 1 });

  res.status(200).json({ success: true, count: warehouses.length, data: warehouses });
});

/**
 * @route   GET /api/warehouses/:id
 * @access  Private (requires warehouse:view)
 */
const getWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findOne(req.scoped({ _id: req.params.id }))
    .populate('parentLocation', 'name locationType');
  assertOwnership(warehouse, req, 'Location');

  res.status(200).json({ success: true, data: warehouse });
});

/**
 * @route   POST /api/warehouses
 * @desc    Create a new physical location -- a building, a shelf, or a bin.
 *          Only top-level locations (no parentLocation) count against the
 *          subscription's maxWarehouses limit: a shelf or bin is a
 *          subdivision of a building the tenant is already paying for, not
 *          a new site.
 * @access  Private (requires warehouse:create)
 */
const createWarehouse = asyncHandler(async (req, res) => {
  const { name, locationType, parentLocation, address, notes } = req.body;

  if (!name) {
    throw new AppError('name is required', 400);
  }

  const parent = await resolveParent(parentLocation, req);

  const existing = await Warehouse.findOne(req.scoped({ name: name.trim() }));
  if (existing) {
    throw new AppError('A location with this name already exists', 400);
  }

  // Subscription tier gatekeeping (Part 1.5) now runs as middleware -- see
  // routes/warehouseRoutes.js's `enforceSubscriptionLimit(...)` call. Its
  // countUsage callback already knows to skip the check entirely for
  // non-top-level locations (shelves/bins), matching the original rule
  // that only new physical sites count against the plan.

  const warehouse = await Warehouse.create({
    tenantId: req.tenantId,
    name: name.trim(),
    locationType: locationType || 'building',
    parentLocation: parent ? parent._id : null,
    address: address || undefined,
    notes: notes || '',
    createdBy: req.user._id
  });

  res.status(201).json({ success: true, data: warehouse });
});

/**
 * @route   PUT /api/warehouses/:id
 * @access  Private (requires warehouse:edit)
 */
const updateWarehouse = asyncHandler(async (req, res) => {
  const { name, locationType, parentLocation, address, notes } = req.body;

  const warehouse = await Warehouse.findOne(req.scoped({ _id: req.params.id }));
  assertOwnership(warehouse, req, 'Location');

  if (name && name.trim() !== warehouse.name) {
    const duplicate = await Warehouse.findOne(req.scoped({ name: name.trim() }));
    if (duplicate) {
      throw new AppError('A location with this name already exists', 400);
    }
    warehouse.name = name.trim();
  }

  if (locationType) warehouse.locationType = locationType;
  if (address !== undefined) warehouse.address = address;
  if (notes !== undefined) warehouse.notes = notes;

  if (parentLocation !== undefined) {
    if (parentLocation === null) {
      warehouse.parentLocation = null;
    } else {
      if (String(parentLocation) === String(warehouse._id)) {
        throw new AppError('A location cannot be its own parent', 400);
      }
      await resolveParent(parentLocation, req);
      await assertNoCycle(warehouse._id, parentLocation, req);
      warehouse.parentLocation = parentLocation;
    }
  }

  await warehouse.save();

  res.status(200).json({ success: true, data: warehouse });
});

/**
 * @route   DELETE /api/warehouses/:id
 * @desc    Soft-deletes the location (isActive = false), matching Part 3's
 *          pattern, since LocationStock rows and (in Module 2) POs will
 *          reference a warehouse by id. Refuses to delete a location that
 *          still has active child locations, so a building can't disappear
 *          out from under shelves that still point to it.
 * @access  Private (requires warehouse:delete)
 */
const deleteWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await Warehouse.findOne(req.scoped({ _id: req.params.id }));
  assertOwnership(warehouse, req, 'Location');

  const activeChildren = await Warehouse.countDocuments(
    req.scoped({ parentLocation: warehouse._id, isActive: true })
  );
  if (activeChildren > 0) {
    throw new AppError(
      'This location still has active sub-locations (shelves/bins). Remove or reassign them first.',
      400
    );
  }

  warehouse.isActive = false;
  await warehouse.save();

  res.status(200).json({ success: true, message: 'Location deleted', data: {} });
});

module.exports = {
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
};
