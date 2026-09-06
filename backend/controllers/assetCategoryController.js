const AssetCategory = require('../models/AssetCategory');
const { assertOwnership } = require('../middleware/tenantIsolation');
const { AppError } = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

const VALID_FIELD_TYPES = ['text', 'number', 'date', 'boolean'];

/**
 * Validates the shape of a customFields array from the request body before
 * it ever reaches Mongoose -- gives a clear 400 instead of a generic
 * ValidationError, and catches things Mongoose's own enum check wouldn't
 * (e.g. duplicate field names within the same category).
 */
const validateCustomFields = (customFields) => {
  if (!customFields) return [];
  if (!Array.isArray(customFields)) {
    throw new AppError('customFields must be an array', 400);
  }

  const seenNames = new Set();
  for (const field of customFields) {
    if (!field.fieldName || typeof field.fieldName !== 'string') {
      throw new AppError('Each custom field needs a fieldName', 400);
    }
    if (!VALID_FIELD_TYPES.includes(field.fieldType)) {
      throw new AppError(
        `Invalid fieldType "${field.fieldType}" -- must be one of: ${VALID_FIELD_TYPES.join(', ')}`,
        400
      );
    }
    const key = field.fieldName.trim().toLowerCase();
    if (seenNames.has(key)) {
      throw new AppError(`Duplicate custom field name "${field.fieldName}"`, 400);
    }
    seenNames.add(key);
  }

  return customFields;
};

/**
 * @route   GET /api/asset-categories
 * @desc    List every custom inventory category belonging to this tenant.
 * @access  Private (requires inventory:view)
 */
const getAssetCategories = asyncHandler(async (req, res) => {
  const categories = await AssetCategory.find(req.scoped({ isActive: true })).sort({ name: 1 });

  res.status(200).json({ success: true, count: categories.length, data: categories });
});

/**
 * @route   GET /api/asset-categories/:id
 * @access  Private (requires inventory:view)
 */
const getAssetCategory = asyncHandler(async (req, res) => {
  const category = await AssetCategory.findOne(req.scoped({ _id: req.params.id }));
  assertOwnership(category, req, 'Asset category');

  res.status(200).json({ success: true, data: category });
});

/**
 * @route   POST /api/asset-categories
 * @desc    Create a custom inventory category -- the "dynamic database
 *          layer" from SRS 1.3. A textile company might create
 *          { name: "Cotton Yarn", unitOfMeasure: "kg" }, a steelworks
 *          { name: "Steel Rod", unitOfMeasure: "pieces" } -- nothing about
 *          the item type is hardcoded.
 * @access  Private (requires inventory:create)
 */
const createAssetCategory = asyncHandler(async (req, res) => {
  const { name, unitOfMeasure, customFields, lowStockThreshold, description } = req.body;

  if (!name || !unitOfMeasure) {
    throw new AppError('name and unitOfMeasure are required', 400);
  }

  const validatedFields = validateCustomFields(customFields);

  const existing = await AssetCategory.findOne(req.scoped({ name: name.trim() }));
  if (existing) {
    throw new AppError('An asset category with this name already exists', 400);
  }

  // Subscription tier gatekeeping (Part 1.5) now runs as middleware --
  // see routes/assetCategoryRoutes.js's `enforceSubscriptionLimit(...)`
  // call ahead of this handler. By the time we're here, the plan's
  // maxMaterialTypes ceiling has already been checked.

  const category = await AssetCategory.create({
    tenantId: req.tenantId,
    name: name.trim(),
    unitOfMeasure: unitOfMeasure.trim(),
    customFields: validatedFields,
    lowStockThreshold: lowStockThreshold ?? null,
    description: description || '',
    createdBy: req.user._id
  });

  res.status(201).json({ success: true, data: category });
});

/**
 * @route   PUT /api/asset-categories/:id
 * @access  Private (requires inventory:edit)
 */
const updateAssetCategory = asyncHandler(async (req, res) => {
  const { name, unitOfMeasure, customFields, lowStockThreshold, description } = req.body;

  const category = await AssetCategory.findOne(req.scoped({ _id: req.params.id }));
  assertOwnership(category, req, 'Asset category');

  if (name && name.trim() !== category.name) {
    const duplicate = await AssetCategory.findOne(req.scoped({ name: name.trim() }));
    if (duplicate) {
      throw new AppError('An asset category with this name already exists', 400);
    }
    category.name = name.trim();
  }

  if (unitOfMeasure) category.unitOfMeasure = unitOfMeasure.trim();
  if (customFields !== undefined) category.customFields = validateCustomFields(customFields);
  if (lowStockThreshold !== undefined) category.lowStockThreshold = lowStockThreshold;
  if (description !== undefined) category.description = description;

  await category.save();

  res.status(200).json({ success: true, data: category });
});

/**
 * @route   DELETE /api/asset-categories/:id
 * @desc    Soft-deletes the category (isActive = false) rather than a hard
 *          delete, since Module 2's stock/PO/manufacturing records will
 *          reference asset categories by id and shouldn't be orphaned.
 * @access  Private (requires inventory:delete)
 */
const deleteAssetCategory = asyncHandler(async (req, res) => {
  const category = await AssetCategory.findOne(req.scoped({ _id: req.params.id }));
  assertOwnership(category, req, 'Asset category');

  category.isActive = false;
  await category.save();

  res.status(200).json({ success: true, message: 'Asset category deleted', data: {} });
});

module.exports = {
  getAssetCategories,
  getAssetCategory,
  createAssetCategory,
  updateAssetCategory,
  deleteAssetCategory
};
