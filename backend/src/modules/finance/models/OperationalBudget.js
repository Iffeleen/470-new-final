const mongoose = require('mongoose');

const BUDGET_CATEGORIES = [
  'Factory Wages',
  'Transportation',
  'Utilities',
  'Management Payroll',
  'Rent',
  'Maintenance',
  'Other'
];

const operationalBudgetSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: BUDGET_CATEGORIES
    },
    monthlyAmount: {
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
    normalizedMonthlyAmount: {
      type: Number,
      required: true,
      min: 0
    },
    exchangeRateSnapshot: {
      type: Number,
      required: true,
      default: 1.0
    },
    dueDay: {
      type: Number,
      required: true,
      min: 1,
      max: 31
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      default: ''
    },
    createdBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

operationalBudgetSchema.index({ companyId: 1, isActive: 1 });
operationalBudgetSchema.index({ companyId: 1, category: 1 });
operationalBudgetSchema.index({ companyId: 1, createdAt: -1 });

const OperationalBudget = mongoose.model('OperationalBudget', operationalBudgetSchema);

module.exports = {
  OperationalBudget,
  BUDGET_CATEGORIES
};
