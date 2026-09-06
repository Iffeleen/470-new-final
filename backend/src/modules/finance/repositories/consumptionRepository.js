const { ConsumptionRecord } = require('../models/ConsumptionRecord');

/**
 * Aggregates consumption trends grouped by material and date period.
 */
async function getConsumptionTrendAggregation({ companyId, startDate, endDate, materialId }) {
  const match = { companyId };

  if (materialId) {
    match.materialId = materialId;
  }

  if (startDate || endDate) {
    match.consumedAt = {};
    if (startDate) match.consumedAt.$gte = new Date(startDate);
    if (endDate) match.consumedAt.$lte = new Date(endDate);
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: {
          period: { $dateToString: { format: '%Y-%m', date: '$consumedAt' } },
          materialName: '$materialName',
          unit: '$unit'
        },
        totalQuantity: { $sum: '$quantity' },
        totalCost: { $sum: '$normalizedTotalCost' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.period': 1, '_id.materialName': 1 } },
    {
      $project: {
        _id: 0,
        period: '$_id.period',
        materialName: '$_id.materialName',
        unit: '$_id.unit',
        totalQuantity: { $round: ['$totalQuantity', 2] },
        totalCost: { $round: ['$totalCost', 2] },
        recordCount: '$count'
      }
    }
  ];

  return await ConsumptionRecord.aggregate(pipeline);
}

module.exports = {
  getConsumptionTrendAggregation
};
