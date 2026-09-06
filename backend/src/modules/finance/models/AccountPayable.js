const mongoose = require('mongoose');
const { AGING_GROUPS, PAYABLE_STATUS } = require('../utils/aging');

const paymentSubSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    normalizedAmount: {
      type: Number,
      required: true,
      min: 0.01
    },
    currency: {
      type: String,
      required: true,
      default: 'BDT',
      uppercase: true
    },
    exchangeRateSnapshot: {
      type: Number,
      required: true,
      default: 1.0
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Cash', 'Cheque', 'Mobile Banking', 'Other'],
      default: 'Bank Transfer'
    },
    reference: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    recordedBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const accountPayableSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      required: true,
      index: true
    },
    supplierId: {
      type: String,
      default: null
    },
    supplierName: {
      type: String,
      required: true,
      trim: true
    },
    purchaseOrderId: {
      type: String,
      default: null
    },
    purchaseOrderNumber: {
      type: String,
      default: ''
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0.01
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    outstandingAmount: {
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
    normalizedTotalAmount: {
      type: Number,
      required: true,
      min: 0.01
    },
    normalizedPaidAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    normalizedOutstandingAmount: {
      type: Number,
      required: true,
      min: 0
    },
    exchangeRateSnapshot: {
      type: Number,
      required: true,
      default: 1.0
    },
    issueDate: {
      type: Date,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    paymentTerms: {
      type: String,
      default: 'Net 30'
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(PAYABLE_STATUS),
      default: PAYABLE_STATUS.UNPAID
    },
    agingGroup: {
      type: String,
      required: true,
      enum: Object.values(AGING_GROUPS),
      default: AGING_GROUPS.NOT_DUE
    },
    paymentHistory: [paymentSubSchema],
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

accountPayableSchema.index({ companyId: 1, dueDate: 1 });
accountPayableSchema.index({ companyId: 1, status: 1, dueDate: 1 });
accountPayableSchema.index({ companyId: 1, supplierName: 1 });
accountPayableSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });

const AccountPayable = mongoose.model('AccountPayable', accountPayableSchema);

module.exports = {
  AccountPayable
};
