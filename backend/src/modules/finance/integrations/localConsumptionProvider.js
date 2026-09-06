/**
 * Material Consumption Data Provider.
 * 
 * Implements the consumption query interface for Requirement 3.5 (Visual Consumption Trend Charts).
 * During Mode B (independent development), queries the ConsumptionRecord collection.
 * During Mode A final integration, this provider can be redirected to Module 2's inventory transaction logs.
 */

const { ConsumptionRecord } = require('../models/ConsumptionRecord');
const { CurrencySetting } = require('../models/CurrencySetting');
const { convertCurrency, roundMoney } = require('../utils/money');

/**
 * Retrieves raw or paginated consumption records scoped strictly by companyId.
 */
async function getConsumptionRecords({ companyId, startDate, endDate, materialId, page = 1, pageSize = 50 }) {
  const query = { companyId };

  if (materialId) {
    query.materialId = materialId;
  }

  if (startDate || endDate) {
    query.consumedAt = {};
    if (startDate) query.consumedAt.$gte = new Date(startDate);
    if (endDate) query.consumedAt.$lte = new Date(endDate);
  }

  const skip = (Math.max(1, page) - 1) * Math.min(100, pageSize);
  const limit = Math.min(100, pageSize);

  const [records, total] = await Promise.all([
    ConsumptionRecord.find(query).sort({ consumedAt: -1 }).skip(skip).limit(limit).lean(),
    ConsumptionRecord.countDocuments(query)
  ]);

  return {
    records,
    total,
    page: Number(page),
    pageSize: limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Creates a demo material consumption record for local independent development.
 */
async function createConsumptionRecord({
  companyId,
  materialId,
  materialName,
  quantity,
  unit = 'kg',
  unitCost,
  currency = 'BDT',
  consumedAt = new Date(),
  sourceReference = ''
}) {
  const qty = Number(quantity);
  const costPerUnit = Number(unitCost);
  const totalCost = roundMoney(qty * costPerUnit);

  // Fetch exchange rate snapshot
  const setting = await CurrencySetting.findOne({ companyId }).lean();
  const rates = setting && setting.exchangeRates ? (setting.exchangeRates instanceof Map ? Object.fromEntries(setting.exchangeRates) : setting.exchangeRates) : { BDT: 1.0, USD: 0.0082, EUR: 0.0070, GBP: 0.0060 };
  const normalizedTotalCost = convertCurrency(totalCost, currency, 'BDT', rates);

  const record = new ConsumptionRecord({
    companyId,
    materialId: materialId || null,
    materialName,
    quantity: qty,
    unit,
    unitCost: costPerUnit,
    totalCost,
    currency: currency.toUpperCase(),
    normalizedTotalCost,
    consumedAt: new Date(consumedAt),
    source: 'module3_demo',
    sourceReference
  });

  return await record.save();
}

module.exports = {
  getConsumptionRecords,
  createConsumptionRecord
};
