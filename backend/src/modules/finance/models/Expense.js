const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = [
  'Transport',
  'Salary',
  'Utilities',
  'Maintenance',
  'Raw Materials',
  'Office',
  'Rent',
  'Other'
];

const expenseSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      required: true,
      enum: EXPENSE_CATEGORIES
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'BDT',
      uppercase: true
    },
    normalizedAmount: {
      type: Number,
      required: true,
      min: 0
    },
    exchangeRateSnapshot: {
      type: Number,
      required: true,
      default: 1.0
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    createdBy: {
      type: String,
      required: true
    },
    createdByRole: {
      type: String,
      default: 'Staff'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

expenseSchema.index({ companyId: 1, expenseDate: -1 });
expenseSchema.index({ companyId: 1, category: 1, expenseDate: -1 });
expenseSchema.index({ companyId: 1, createdByRole: 1, expenseDate: -1 });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = {
  Expense,
  EXPENSE_CATEGORIES
};
