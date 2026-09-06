const { Expense } = require('../models/Expense');
const { getMonthRange, getYearRange } = require('../utils/dates');
const { sanitizeSearchQuery } = require('../validators/financeValidators');

function buildExpenseFilter({ companyId, month, year, category, createdByRole, startDate, endDate, search }) {
  const query = { companyId };

  if (category) {
    query.category = category;
  }

  if (createdByRole) {
    query.createdByRole = createdByRole;
  }

  // Date filtering logic
  if (month && year) {
    const { startDate: mStart, endDate: mEnd } = getMonthRange(month, year);
    query.expenseDate = { $gte: mStart, $lte: mEnd };
  } else if (year && !month) {
    const { startDate: yStart, endDate: yEnd } = getYearRange(year);
    query.expenseDate = { $gte: yStart, $lte: yEnd };
  } else if (startDate || endDate) {
    query.expenseDate = {};
    if (startDate) query.expenseDate.$gte = new Date(startDate);
    if (endDate) query.expenseDate.$lte = new Date(endDate);
  }

  if (search) {
    const safeRegex = new RegExp(sanitizeSearchQuery(search), 'i');
    query.$or = [
      { title: safeRegex },
      { description: safeRegex },
      { notes: safeRegex }
    ];
  }

  return query;
}

async function createExpense(data) {
  const expense = new Expense(data);
  return await expense.save();
}

async function findExpenses({
  companyId,
  month,
  year,
  category,
  createdByRole,
  startDate,
  endDate,
  search,
  skip = 0,
  limit = 50,
  sortBy = 'expenseDate',
  sortOrder = 'desc'
}) {
  const query = buildExpenseFilter({ companyId, month, year, category, createdByRole, startDate, endDate, search });
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  return await Expense.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
}

async function countExpenses({ companyId, month, year, category, createdByRole, startDate, endDate, search }) {
  const query = buildExpenseFilter({ companyId, month, year, category, createdByRole, startDate, endDate, search });
  return await Expense.countDocuments(query);
}

async function findExpenseById(companyId, expenseId) {
  return await Expense.findOne({ _id: expenseId, companyId });
}

async function updateExpenseById(companyId, expenseId, updateData) {
  return await Expense.findOneAndUpdate(
    { _id: expenseId, companyId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
}

async function deleteExpenseById(companyId, expenseId) {
  return await Expense.findOneAndDelete({ _id: expenseId, companyId });
}

/**
 * Aggregates filtered expenses: totalAmount, count, averageAmount, and category breakdown.
 */
async function getExpenseSummaryAggregation(filterParams) {
  const query = buildExpenseFilter(filterParams);

  const pipeline = [
    { $match: query },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$normalizedAmount' },
              count: { $sum: 1 },
              averageAmount: { $avg: '$normalizedAmount' }
            }
          }
        ],
        categoryBreakdown: [
          {
            $group: {
              _id: '$category',
              totalAmount: { $sum: '$normalizedAmount' },
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ];

  const results = await Expense.aggregate(pipeline);
  const facetResult = results[0] || {};
  const totals = facetResult.totals && facetResult.totals[0] ? facetResult.totals[0] : { totalAmount: 0, count: 0, averageAmount: 0 };
  const categories = facetResult.categoryBreakdown || [];

  const categoryBreakdown = {};
  for (const cat of categories) {
    categoryBreakdown[cat._id] = {
      totalAmount: Math.round((cat.totalAmount + Number.EPSILON) * 100) / 100,
      count: cat.count
    };
  }

  return {
    totalAmount: Math.round((totals.totalAmount + Number.EPSILON) * 100) / 100,
    count: totals.count,
    averageAmount: Math.round(((totals.averageAmount || 0) + Number.EPSILON) * 100) / 100,
    currency: 'BDT',
    categoryBreakdown
  };
}

module.exports = {
  createExpense,
  findExpenses,
  countExpenses,
  findExpenseById,
  updateExpenseById,
  deleteExpenseById,
  getExpenseSummaryAggregation
};
