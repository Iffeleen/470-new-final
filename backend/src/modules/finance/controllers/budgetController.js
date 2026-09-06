const budgetService = require('../services/budgetService');

async function createBudget(req, res, next) {
  try {
    const { companyId, userId } = req.auth;
    const budget = await budgetService.createBudget(companyId, userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Operational budget created successfully',
      data: budget
    });
  } catch (error) {
    next(error);
  }
}

async function getBudgets(req, res, next) {
  try {
    const { companyId } = req.auth;
    const result = await budgetService.listBudgets(companyId, req.query);

    res.status(200).json({
      success: true,
      message: 'Operational budgets retrieved successfully',
      data: result.budgets,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
}

async function getBudgetSummary(req, res, next) {
  try {
    const { companyId } = req.auth;
    const summary = await budgetService.getBudgetSummary(companyId);

    res.status(200).json({
      success: true,
      message: 'Budget summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    next(error);
  }
}

async function getBudgetById(req, res, next) {
  try {
    const { companyId } = req.auth;
    const budget = await budgetService.getBudgetById(companyId, req.params.budgetId);

    res.status(200).json({
      success: true,
      message: 'Operational budget retrieved successfully',
      data: budget
    });
  } catch (error) {
    next(error);
  }
}

async function updateBudget(req, res, next) {
  try {
    const { companyId } = req.auth;
    const updated = await budgetService.updateBudget(companyId, req.params.budgetId, req.body);

    res.status(200).json({
      success: true,
      message: 'Operational budget updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

async function deleteBudget(req, res, next) {
  try {
    const { companyId } = req.auth;
    await budgetService.deleteBudget(companyId, req.params.budgetId);

    res.status(200).json({
      success: true,
      message: 'Operational budget deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBudget,
  getBudgets,
  getBudgetSummary,
  getBudgetById,
  updateBudget,
  deleteBudget
};
