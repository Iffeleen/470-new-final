import api from "./api";

export const getCurrencySettings = async () => await api.get("/finance/currency");
export const updateCurrencySettings = async (payload) => await api.put("/finance/currency", payload);
export const getFinanceDashboard = async () => await api.get("/finance/dashboard");

// Budget
export const getBudgets = async () => await api.get("/finance/budgets");
export const getBudgetSummary = async () => await api.get("/finance/budgets/summary");
export const createBudget = async (payload) => await api.post("/finance/budgets", payload);
export const updateBudget = async (budgetId, payload) =>
  await api.patch(`/finance/budgets/${budgetId}`, payload);
export const deleteBudget = async (budgetId) => await api.delete(`/finance/budgets/${budgetId}`);

// Expenses (3.4)
export const fetchExpenses = async (params = {}) => await api.get("/finance/expenses", { params });
export const getExpenseSummary = async (params = {}) =>
  await api.get("/finance/expenses/summary", { params });
export const createExpense = async (expenseData) => await api.post("/finance/expenses", expenseData);
export const updateExpense = async (expenseId, payload) =>
  await api.patch(`/finance/expenses/${expenseId}`, payload);
export const deleteExpense = async (expenseId) => await api.delete(`/finance/expenses/${expenseId}`);

// Payables & Payments (3.3)
export const fetchPayables = async (params = {}) => await api.get("/finance/payables", { params });
export const getPayableAging = async () => await api.get("/finance/payables/aging");
export const createPayable = async (payableData) => await api.post("/finance/payables", payableData);
export const updatePayable = async (payableId, payload) =>
  await api.patch(`/finance/payables/${payableId}`, payload);
export const deletePayable = async (payableId) => await api.delete(`/finance/payables/${payableId}`);
export const recordPayment = async (payableId, paymentPayload) =>
  await api.post(`/finance/payables/${payableId}/payments`, paymentPayload);

// Analytics / Consumption (3.5)
export const getSpendingTrend = async (params = {}) =>
  await api.get("/finance/analytics/spending-trend", { params });
export const getCategoryBreakdown = async (params = {}) =>
  await api.get("/finance/analytics/category-breakdown", { params });
export const getConsumptionTrend = async (params = {}) =>
  await api.get("/finance/analytics/consumption-trend", { params });