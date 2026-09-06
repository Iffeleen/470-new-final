const { Expense } = require('../models/Expense');
const { AccountPayable } = require('../models/AccountPayable');
const { OperationalBudget } = require('../models/OperationalBudget');
const { getConsumptionTrendAggregation } = require('../repositories/consumptionRepository');
const { getOrCreateCurrencySetting, getCompanyRates } = require('./currencyService');
const { convertCurrency, roundMoney } = require('../utils/money');
const { getMonthRange } = require('../utils/dates');

/**
 * Returns spending trend aggregated over time (month, day, or year).
 */
async function getSpendingTrend(companyId, { startDate, endDate, groupBy = 'month', currency }) {
  const match = { companyId };

  if (startDate || endDate) {
    match.expenseDate = {};
    if (startDate) match.expenseDate.$gte = new Date(startDate);
    if (endDate) match.expenseDate.$lte = new Date(endDate);
  }

  let dateFormat = '%Y-%m';
  if (groupBy === 'day') dateFormat = '%Y-%m-%d';
  if (groupBy === 'year') dateFormat = '%Y';

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$expenseDate' } },
        totalNormalizedAmount: { $sum: '$normalizedAmount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const results = await Expense.aggregate(pipeline);
  const rates = await getCompanyRates(companyId);
  const targetCurrency = (currency || 'BDT').toUpperCase();

  return results.map(item => {
    const normalizedBDT = roundMoney(item.totalNormalizedAmount);
    const convertedAmount = convertCurrency(normalizedBDT, 'BDT', targetCurrency, rates);

    return {
      period: item._id,
      totalAmount: convertedAmount,
      normalizedAmountBDT: normalizedBDT,
      currency: targetCurrency,
      count: item.count
    };
  });
}

/**
 * Returns expense breakdown by category with percentages.
 */
async function getCategoryBreakdown(companyId, { startDate, endDate, currency }) {
  const match = { companyId };

  if (startDate || endDate) {
    match.expenseDate = {};
    if (startDate) match.expenseDate.$gte = new Date(startDate);
    if (endDate) match.expenseDate.$lte = new Date(endDate);
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$category',
        totalNormalizedAmount: { $sum: '$normalizedAmount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalNormalizedAmount: -1 } }
  ];

  const results = await Expense.aggregate(pipeline);
  const rates = await getCompanyRates(companyId);
  const targetCurrency = (currency || 'BDT').toUpperCase();

  const totalOverall = results.reduce((acc, cur) => acc + cur.totalNormalizedAmount, 0);

  return results.map(item => {
    const normalizedBDT = roundMoney(item.totalNormalizedAmount);
    const convertedAmount = convertCurrency(normalizedBDT, 'BDT', targetCurrency, rates);
    const percentage = totalOverall > 0 ? roundMoney((normalizedBDT / totalOverall) * 100, 1) : 0;

    return {
      category: item._id,
      totalAmount: convertedAmount,
      normalizedAmountBDT: normalizedBDT,
      percentage,
      count: item.count,
      currency: targetCurrency
    };
  });
}

/**
 * Returns consumption trends grouped by material and period.
 */
async function getConsumptionTrend(companyId, { startDate, endDate, materialId, currency }) {
  const results = await getConsumptionTrendAggregation({ companyId, startDate, endDate, materialId });
  const rates = await getCompanyRates(companyId);
  const targetCurrency = (currency || 'BDT').toUpperCase();

  return results.map(item => {
    const convertedCost = convertCurrency(item.totalCost, 'BDT', targetCurrency, rates);
    return {
      ...item,
      totalCost: convertedCost,
      currency: targetCurrency
    };
  });
}


/**
 * High‑efficiency concurrent Dashboard overview query.
*/
async function getDashboardSummary(companyId, { currency } = {}) {
  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();
  const { startDate: monthStart, endDate: monthEnd } = getMonthRange(currentMonth, currentYear);

  const setting = await getOrCreateCurrencySetting(companyId);
  const rates = setting.exchangeRates instanceof Map ? Object.fromEntries(setting.exchangeRates) : (setting.exchangeRates || {});
  const targetCurrency = (currency || setting.displayCurrency || 'BDT').toUpperCase();

  const [
    monthlyBudgetAgg,
    currentMonthExpenseAgg,
    payablesAgg,
    recentExpenses,
    upcomingPayables,
    spendingTrend,
    categoryBreakdown
  ] = await Promise.all([
    OperationalBudget.aggregate([
      { $match: { companyId, isActive: true } },
      { $group: { _id: null, total: { $sum: '$normalizedMonthlyAmount' } } }
    ]),
    Expense.aggregate([
      { $match: { companyId, expenseDate: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$normalizedAmount' } } }
    ]),
    AccountPayable.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$normalizedOutstandingAmount' },
          totalOverdue: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$agingGroup', 'Not Due'] }, { $ne: ['$agingGroup', 'Paid'] }] },
                '$normalizedOutstandingAmount',
                0
              ]
            }
          }
        }
      }
    ]),
    Expense.find({ companyId })
      .sort({ expenseDate: -1 })
      .limit(5)
      .lean(),
    AccountPayable.find({ companyId, outstandingAmount: { $gt: 0 } })
      .sort({ dueDate: 1 })
      .limit(5)
      .lean(),
    getSpendingTrend(companyId, {
      startDate: new Date(Date.UTC(currentYear, currentMonth - 6, 1)),
      endDate: monthEnd,
      groupBy: 'month',
      currency: targetCurrency
    }),
    getCategoryBreakdown(companyId, {
      startDate: monthStart,
      endDate: monthEnd,
      currency: targetCurrency
    })
  ]);

  const rawMonthlyBudgetBDT = monthlyBudgetAgg[0] ? monthlyBudgetAgg[0].total : 0;
  const rawMonthlyExpenseBDT = currentMonthExpenseAgg[0] ? currentMonthExpenseAgg[0].total : 0;
  const rawOutstandingBDT = payablesAgg[0] ? payablesAgg[0].totalOutstanding : 0;
  const rawOverdueBDT = payablesAgg[0] ? payablesAgg[0].totalOverdue : 0;

  return {
    displayCurrency: targetCurrency,
    monthlyBudget: convertCurrency(rawMonthlyBudgetBDT, 'BDT', targetCurrency, rates),
    monthlyExpense: convertCurrency(rawMonthlyExpenseBDT, 'BDT', targetCurrency, rates),
    outstandingPayable: convertCurrency(rawOutstandingBDT, 'BDT', targetCurrency, rates),
    overduePayable: convertCurrency(rawOverdueBDT, 'BDT', targetCurrency, rates),
    recentExpenses: recentExpenses.map(e => ({
      id: e._id,
      title: e.title,
      category: e.category,
      amount: e.amount,
      currency: e.currency,
      expenseDate: e.expenseDate
    })),
    upcomingPayments: upcomingPayables.map(p => ({
      id: p._id,
      supplierName: p.supplierName,
      invoiceNumber: p.invoiceNumber,
      outstandingAmount: p.outstandingAmount,
      currency: p.currency,
      dueDate: p.dueDate,
      status: p.status,
      agingGroup: p.agingGroup
    })),
    spendingTrend: spendingTrend || [],
    categoryBreakdown: categoryBreakdown || []
  };
}

module.exports = {
  getSpendingTrend,
  getCategoryBreakdown,
  getConsumptionTrend,
  getDashboardSummary
};
