/**
 * Express Request Validators and Input Sanitizers for Module 3 (Finance).
 */

const mongoose = require('mongoose');
const { DEFAULT_SUPPORTED_CURRENCIES } = require('../utils/money');
const { BUDGET_CATEGORIES } = require('../models/OperationalBudget');
const { EXPENSE_CATEGORIES } = require('../models/Expense');

/**
 * Escapes regex special characters to prevent NoSQL injection via regex searches.
 * @param {string} str 
 * @returns {string}
 */
function sanitizeSearchQuery(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
}

/**
 * Validates that a route param is a valid 24-char hex MongoDB ObjectId.
 * @param {string} paramName 
 */
function validateObjectId(paramName) {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid identifier format for ${paramName}`
      });
    }
    next();
  };
}

/**
 * Validates Currency Settings update payload.
 */
function validateCurrencyUpdate(req, res, next) {
  const { displayCurrency, exchangeRates } = req.body;

  if (displayCurrency !== undefined) {
    if (typeof displayCurrency !== 'string') {
      return res.status(400).json({ success: false, message: 'displayCurrency must be a string' });
    }
    const code = displayCurrency.toUpperCase();
    if (!DEFAULT_SUPPORTED_CURRENCIES.includes(code)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported displayCurrency: ${displayCurrency}. Supported: ${DEFAULT_SUPPORTED_CURRENCIES.join(', ')}`
      });
    }
    req.body.displayCurrency = code;
  }

  if (exchangeRates !== undefined) {
    if (typeof exchangeRates !== 'object' || exchangeRates === null || Array.isArray(exchangeRates)) {
      return res.status(400).json({ success: false, message: 'exchangeRates must be an object map' });
    }

    const cleaned = {};
    for (const [key, value] of Object.entries(exchangeRates)) {
      const code = key.toUpperCase();
      if (!DEFAULT_SUPPORTED_CURRENCIES.includes(code)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported currency code in exchangeRates: ${key}`
        });
      }
      const rateNum = Number(value);
      if (isNaN(rateNum) || rateNum <= 0) {
        return res.status(400).json({
          success: false,
          message: `Exchange rate for ${code} must be a positive number`
        });
      }
      cleaned[code] = rateNum;
    }
    req.body.exchangeRates = cleaned;
  }

  next();
}

/**
 * Validates Operational Budget Create payload.
 */
function validateBudgetCreate(req, res, next) {
  const { name, category, monthlyAmount, currency, dueDay, startDate, endDate } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Budget name is required' });
  }

  if (!category || !BUDGET_CATEGORIES.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Invalid category. Must be one of: ${BUDGET_CATEGORIES.join(', ')}`
    });
  }

  const amount = Number(monthlyAmount);
  if (isNaN(amount) || amount < 0) {
    return res.status(400).json({ success: false, message: 'monthlyAmount must be a non-negative number' });
  }

  if (currency) {
    const code = String(currency).toUpperCase();
    if (!DEFAULT_SUPPORTED_CURRENCIES.includes(code)) {
      return res.status(400).json({ success: false, message: `Unsupported currency: ${currency}` });
    }
    req.body.currency = code;
  }

  const day = Number(dueDay);
  if (isNaN(day) || !Number.isInteger(day) || day < 1 || day > 31) {
    return res.status(400).json({ success: false, message: 'dueDay must be an integer between 1 and 31' });
  }

  if (!startDate || isNaN(new Date(startDate).getTime())) {
    return res.status(400).json({ success: false, message: 'Valid startDate is required' });
  }

  if (endDate) {
    if (isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid endDate provided' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ success: false, message: 'endDate cannot precede startDate' });
    }
  }

  req.body.name = name.trim();
  req.body.monthlyAmount = amount;
  req.body.dueDay = day;
  next();
}

/**
 * Validates Operational Budget Update payload.
 */
function validateBudgetUpdate(req, res, next) {
  const { name, category, monthlyAmount, currency, dueDay, startDate, endDate } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'name cannot be empty' });
    }
    req.body.name = name.trim();
  }

  if (category !== undefined && !BUDGET_CATEGORIES.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Invalid category. Must be one of: ${BUDGET_CATEGORIES.join(', ')}`
    });
  }

  if (monthlyAmount !== undefined) {
    const amount = Number(monthlyAmount);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: 'monthlyAmount must be a non-negative number' });
    }
    req.body.monthlyAmount = amount;
  }

  if (currency !== undefined) {
    const code = String(currency).toUpperCase();
    if (!DEFAULT_SUPPORTED_CURRENCIES.includes(code)) {
      return res.status(400).json({ success: false, message: `Unsupported currency: ${currency}` });
    }
    req.body.currency = code;
  }

  if (dueDay !== undefined) {
    const day = Number(dueDay);
    if (isNaN(day) || !Number.isInteger(day) || day < 1 || day > 31) {
      return res.status(400).json({ success: false, message: 'dueDay must be an integer between 1 and 31' });
    }
    req.body.dueDay = day;
  }

  if (startDate !== undefined && isNaN(new Date(startDate).getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid startDate provided' });
  }

  if (endDate !== undefined && endDate !== null) {
    if (isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid endDate provided' });
    }
  }

  next();
}

/**
 * Validates Expense Create payload.
 */
function validateExpenseCreate(req, res, next) {
  const { title, category, amount, currency, expenseDate } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Expense title is required' });
  }

  if (!category || !EXPENSE_CATEGORIES.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Invalid expense category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}`
    });
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt < 0) {
    return res.status(400).json({ success: false, message: 'amount must be a non-negative number' });
  }

  if (currency) {
    const code = String(currency).toUpperCase();
    if (!DEFAULT_SUPPORTED_CURRENCIES.includes(code)) {
      return res.status(400).json({ success: false, message: `Unsupported currency: ${currency}` });
    }
    req.body.currency = code;
  }

  if (expenseDate && isNaN(new Date(expenseDate).getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid expenseDate provided' });
  }

  req.body.title = title.trim();
  req.body.amount = amt;
  next();
}

/**
 * Validates Expense Update payload.
 */
function validateExpenseUpdate(req, res, next) {
  const { title, category, amount, currency, expenseDate } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'title cannot be empty' });
    }
    req.body.title = title.trim();
  }

  if (category !== undefined && !EXPENSE_CATEGORIES.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Invalid expense category. Must be one of: ${EXPENSE_CATEGORIES.join(', ')}`
    });
  }

  if (amount !== undefined) {
    const amt = Number(amount);
    if (isNaN(amt) || amt < 0) {
      return res.status(400).json({ success: false, message: 'amount must be a non-negative number' });
    }
    req.body.amount = amt;
  }

  if (currency !== undefined) {
    const code = String(currency).toUpperCase();
    if (!DEFAULT_SUPPORTED_CURRENCIES.includes(code)) {
      return res.status(400).json({ success: false, message: `Unsupported currency: ${currency}` });
    }
    req.body.currency = code;
  }

  if (expenseDate !== undefined && isNaN(new Date(expenseDate).getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid expenseDate provided' });
  }

  next();
}

/**
 * Validates Account Payable Create payload.
 */
function validatePayableCreate(req, res, next) {
  const { supplierName, invoiceNumber, totalAmount, currency, issueDate, dueDate } = req.body;

  if (!supplierName || typeof supplierName !== 'string' || !supplierName.trim()) {
    return res.status(400).json({ success: false, message: 'supplierName is required' });
  }

  if (!invoiceNumber || typeof invoiceNumber !== 'string' || !invoiceNumber.trim()) {
    return res.status(400).json({ success: false, message: 'invoiceNumber is required' });
  }

  const total = Number(totalAmount);
  if (isNaN(total) || total <= 0) {
    return res.status(400).json({ success: false, message: 'totalAmount must be a positive number' });
  }

  if (currency) {
    const code = String(currency).toUpperCase();
    if (!DEFAULT_SUPPORTED_CURRENCIES.includes(code)) {
      return res.status(400).json({ success: false, message: `Unsupported currency: ${currency}` });
    }
    req.body.currency = code;
  }

  if (!issueDate || isNaN(new Date(issueDate).getTime())) {
    return res.status(400).json({ success: false, message: 'Valid issueDate is required' });
  }

  if (!dueDate || isNaN(new Date(dueDate).getTime())) {
    return res.status(400).json({ success: false, message: 'Valid dueDate is required' });
  }

  if (new Date(dueDate) < new Date(issueDate)) {
    return res.status(400).json({ success: false, message: 'dueDate cannot precede issueDate' });
  }

  req.body.supplierName = supplierName.trim();
  req.body.invoiceNumber = invoiceNumber.trim();
  req.body.totalAmount = total;
  next();
}

/**
 * Validates Payment payload for a payable.
 */
function validatePaymentRecord(req, res, next) {
  const { amount, paymentDate } = req.body;

  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
  }

  if (paymentDate && isNaN(new Date(paymentDate).getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid paymentDate provided' });
  }

  req.body.amount = amt;
  next();
}

module.exports = {
  sanitizeSearchQuery,
  validateObjectId,
  validateCurrencyUpdate,
  validateBudgetCreate,
  validateBudgetUpdate,
  validateExpenseCreate,
  validateExpenseUpdate,
  validatePayableCreate,
  validatePaymentRecord
};
