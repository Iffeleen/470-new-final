const budgetRepo = require('../repositories/budgetRepository');
const { getCompanyRates } = require('./currencyService');
const { convertCurrency, roundMoney } = require('../utils/money');

class BudgetNotFoundError extends Error {
  constructor(message = 'Operational budget not found') {
    super(message);
    this.statusCode = 404;
  }
}

async function createBudget(companyId, userId, data) {
  const currency = (data.currency || 'BDT').toUpperCase();
  const monthlyAmount = roundMoney(Number(data.monthlyAmount));

  const rates = await getCompanyRates(companyId);
  const normalizedMonthlyAmount = convertCurrency(monthlyAmount, currency, 'BDT', rates);
  const rateSnapshot = rates[currency] || 1.0;

 const budgetDoc = {
  companyId,
  name: data.name,
  category: data.category,
  monthlyAmount,
  currency,
  normalizedMonthlyAmount,
  exchangeRateSnapshot: rateSnapshot,
  dueDay: data.dueDay,
  startDate: new Date(data.startDate),
  endDate: data.endDate ? new Date(data.endDate) : null,
  isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  notes: data.notes || '',
  createdBy: userId
};
  return await budgetRepo.createBudget(budgetDoc);
}

async function listBudgets(companyId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 50));
  const skip = (page - 1) * pageSize;

  const filter = {
    companyId,
    category: query.category || null,
    isActive: query.isActive !== undefined ? query.isActive === 'true' || query.isActive === true : null,
    skip,
    limit: pageSize,
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder || 'desc'
  };

  const [budgets, total] = await Promise.all([
    budgetRepo.findBudgets(filter),
    budgetRepo.countBudgets(filter)
  ]);

  return {
    budgets,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

async function getBudgetById(companyId, budgetId) {
  const budget = await budgetRepo.findBudgetById(companyId, budgetId);
  if (!budget) {
    throw new BudgetNotFoundError();
  }
  return budget;
}

async function updateBudget(companyId, budgetId, updateData) {
  const existing = await budgetRepo.findBudgetById(companyId, budgetId);
  if (!existing) {
    throw new BudgetNotFoundError();
  }

  const updates = { ...updateData };

  // Recalculate normalized amount if monthlyAmount or currency changed
  if (updates.monthlyAmount !== undefined || updates.currency !== undefined) {
    const currency = (updates.currency || existing.currency).toUpperCase();
    const amount = updates.monthlyAmount !== undefined ? roundMoney(Number(updates.monthlyAmount)) : existing.monthlyAmount;

    const rates = await getCompanyRates(companyId);
    updates.normalizedMonthlyAmount = convertCurrency(amount, currency, 'BDT', rates);
    updates.exchangeRateSnapshot = rates[currency] || 1.0;
    updates.currency = currency;
    updates.monthlyAmount = amount;
  }

  if (updates.startDate) updates.startDate = new Date(updates.startDate);
  if (updates.endDate !== undefined) updates.endDate = updates.endDate ? new Date(updates.endDate) : null;

  const updated = await budgetRepo.updateBudgetById(companyId, budgetId, updates);
  if (!updated) {
    throw new BudgetNotFoundError();
  }
  return updated;
}

async function deleteBudget(companyId, budgetId) {
  const deleted = await budgetRepo.deleteBudgetById(companyId, budgetId);
  if (!deleted) {
    throw new BudgetNotFoundError();
  }
  return deleted;
}

async function getBudgetSummary(companyId) {
  return await budgetRepo.getBudgetSummaryAggregation(companyId);
}

module.exports = {
  BudgetNotFoundError,
  createBudget,
  listBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetSummary
};
