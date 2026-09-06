const expenseService = require('../services/expenseService');

async function createExpense(req, res, next) {
  try {
    const { companyId, userId, role } = req.auth;
    const expense = await expenseService.createExpense(companyId, userId, role, req.body);

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: expense
    });
  } catch (error) {
    next(error);
  }
}

async function getExpenses(req, res, next) {
  try {
    const { companyId } = req.auth;
    const result = await expenseService.listExpenses(companyId, req.query);

    res.status(200).json({
      success: true,
      message: 'Expenses retrieved successfully',
      data: result.expenses,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
}

async function getExpenseSummary(req, res, next) {
  try {
    const { companyId } = req.auth;
    const summary = await expenseService.getExpenseSummary(companyId, req.query);

    res.status(200).json({
      success: true,
      message: 'Expense summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    next(error);
  }
}

async function getExpenseById(req, res, next) {
  try {
    const { companyId } = req.auth;
    const expense = await expenseService.getExpenseById(companyId, req.params.expenseId);

    res.status(200).json({
      success: true,
      message: 'Expense retrieved successfully',
      data: expense
    });
  } catch (error) {
    next(error);
  }
}

async function updateExpense(req, res, next) {
  try {
    const { companyId } = req.auth;
    const updated = await expenseService.updateExpense(companyId, req.params.expenseId, req.body);

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const { companyId } = req.auth;
    await expenseService.deleteExpense(companyId, req.params.expenseId);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createExpense,
  getExpenses,
  getExpenseSummary,
  getExpenseById,
  updateExpense,
  deleteExpense
};
