const { OperationalBudget } = require('../models/OperationalBudget');

async function createBudget(data) {
  const budget = new OperationalBudget(data);
  return await budget.save();
}

async function findBudgets({ companyId, category, isActive, skip = 0, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' }) {
  const query = { companyId };
  if (category) query.category = category;
  if (isActive !== undefined && isActive !== null) query.isActive = Boolean(isActive);

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  return await OperationalBudget.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
}

async function countBudgets({ companyId, category, isActive }) {
  const query = { companyId };
  if (category) query.category = category;
  if (isActive !== undefined && isActive !== null) query.isActive = Boolean(isActive);
  return await OperationalBudget.countDocuments(query);
}

async function findBudgetById(companyId, budgetId) {
  return await OperationalBudget.findOne({ _id: budgetId, companyId });
}

async function updateBudgetById(companyId, budgetId, updateData) {
  return await OperationalBudget.findOneAndUpdate(
    { _id: budgetId, companyId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
}

async function deleteBudgetById(companyId, budgetId) {
  return await OperationalBudget.findOneAndDelete({ _id: budgetId, companyId });
}

/**
 * Aggregates active budgets by category and calculates overall total monthly budget.
 */
async function getBudgetSummaryAggregation(companyId) {
  const pipeline = [
    { $match: { companyId, isActive: true } },
    {
      $group: {
        _id: '$category',
        categoryTotal: { $sum: '$normalizedMonthlyAmount' },
        count: { $sum: 1 }
      }
    }
  ];

  const results = await OperationalBudget.aggregate(pipeline);

  let totalMonthlyBudget = 0;
  let activeBudgetCount = 0;
  const categoryTotals = {};

  for (const item of results) {
    categoryTotals[item._id] = Math.round((item.categoryTotal + Number.EPSILON) * 100) / 100;
    totalMonthlyBudget += item.categoryTotal;
    activeBudgetCount += item.count;
  }

  return {
    totalMonthlyBudget: Math.round((totalMonthlyBudget + Number.EPSILON) * 100) / 100,
    currency: 'BDT',
    activeBudgetCount,
    categoryTotals
  };
}

module.exports = {
  createBudget,
  findBudgets,
  countBudgets,
  findBudgetById,
  updateBudgetById,
  deleteBudgetById,
  getBudgetSummaryAggregation
};
