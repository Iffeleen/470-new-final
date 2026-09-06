const expenseRepo = require('../repositories/expenseRepository');
const { getCompanyRates } = require('./currencyService');
const { convertCurrency, roundMoney } = require('../utils/money');

class ExpenseNotFoundError extends Error {
  constructor(message = 'Expense record not found') {
    super(message);
    this.statusCode = 404;
  }
}

async function createExpense(companyId, userId, userRole, data) {
  const currency = (data.currency || 'BDT').toUpperCase();
  const amount = roundMoney(Number(data.amount));

  const rates = await getCompanyRates(companyId);
  const normalizedAmount = convertCurrency(amount, currency, 'BDT', rates);
  const rateSnapshot = rates[currency] || 1.0;

  const expenseDoc = {
    companyId,
    title: data.title,
    description: data.description || '',
    category: data.category,
    amount,
    currency,
    normalizedAmount,
    exchangeRateSnapshot: rateSnapshot,
    expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
    createdBy: userId,
    createdByRole: userRole || 'Staff',
    notes: data.notes || ''
  };

  return await expenseRepo.createExpense(expenseDoc);
}

async function listExpenses(companyId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 50));
  const skip = (page - 1) * pageSize;

  const filter = {
    companyId,
    month: query.month || null,
    year: query.year || null,
    category: query.category || null,
    createdByRole: query.createdByRole || null,
    startDate: query.startDate || null,
    endDate: query.endDate || null,
    search: query.search || null,
    skip,
    limit: pageSize,
    sortBy: query.sortBy || 'expenseDate',
    sortOrder: query.sortOrder || 'desc'
  };

  const [expenses, total] = await Promise.all([
    expenseRepo.findExpenses(filter),
    expenseRepo.countExpenses(filter)
  ]);

  return {
    expenses,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

async function getExpenseById(companyId, expenseId) {
  const expense = await expenseRepo.findExpenseById(companyId, expenseId);
  if (!expense) {
    throw new ExpenseNotFoundError();
  }
  return expense;
}

async function updateExpense(companyId, expenseId, updateData) {
  const existing = await expenseRepo.findExpenseById(companyId, expenseId);
  if (!existing) {
    throw new ExpenseNotFoundError();
  }

  const updates = { ...updateData };

  if (updates.amount !== undefined || updates.currency !== undefined) {
    const currency = (updates.currency || existing.currency).toUpperCase();
    const amount = updates.amount !== undefined ? roundMoney(Number(updates.amount)) : existing.amount;

    const rates = await getCompanyRates(companyId);
    updates.normalizedAmount = convertCurrency(amount, currency, 'BDT', rates);
    updates.exchangeRateSnapshot = rates[currency] || 1.0;
    updates.currency = currency;
    updates.amount = amount;
  }

  if (updates.expenseDate) {
    updates.expenseDate = new Date(updates.expenseDate);
  }

  const updated = await expenseRepo.updateExpenseById(companyId, expenseId, updates);
  if (!updated) {
    throw new ExpenseNotFoundError();
  }
  return updated;
}

async function deleteExpense(companyId, expenseId) {
  const deleted = await expenseRepo.deleteExpenseById(companyId, expenseId);
  if (!deleted) {
    throw new ExpenseNotFoundError();
  }
  return deleted;
}

async function getExpenseSummary(companyId, filterParams = {}) {
  return await expenseRepo.getExpenseSummaryAggregation({
    companyId,
    month: filterParams.month || null,
    year: filterParams.year || null,
    category: filterParams.category || null,
    createdByRole: filterParams.createdByRole || null,
    startDate: filterParams.startDate || null,
    endDate: filterParams.endDate || null,
    search: filterParams.search || null
  });
}

module.exports = {
  ExpenseNotFoundError,
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary
};
