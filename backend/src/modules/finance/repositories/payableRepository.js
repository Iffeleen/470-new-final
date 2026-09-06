const { AccountPayable } = require('../models/AccountPayable');
const { AGING_GROUPS, PAYABLE_STATUS, calculateAgingAndStatus } = require('../utils/aging');
const { sanitizeSearchQuery } = require('../validators/financeValidators');

function buildPayableFilter({ companyId, supplierName, status, agingGroup, startDate, endDate }) {
  const query = { companyId };

  if (supplierName) {
    const safeRegex = new RegExp(sanitizeSearchQuery(supplierName), 'i');
    query.supplierName = safeRegex;
  }

  if (status) {
    query.status = status;
  }

  if (agingGroup) {
    query.agingGroup = agingGroup;
  }

  if (startDate || endDate) {
    query.dueDate = {};
    if (startDate) query.dueDate.$gte = new Date(startDate);
    if (endDate) query.dueDate.$lte = new Date(endDate);
  }

  return query;
}

async function createPayable(data) {
  const payable = new AccountPayable(data);
  return await payable.save();
}

async function findPayables({
  companyId,
  supplierName,
  status,
  agingGroup,
  startDate,
  endDate,
  skip = 0,
  limit = 50,
  sortBy = 'dueDate',
  sortOrder = 'asc'
}) {
  const query = buildPayableFilter({ companyId, supplierName, status, agingGroup, startDate, endDate });
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  return await AccountPayable.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
}

async function countPayables({ companyId, supplierName, status, agingGroup, startDate, endDate }) {
  const query = buildPayableFilter({ companyId, supplierName, status, agingGroup, startDate, endDate });
  return await AccountPayable.countDocuments(query);
}

async function findPayableById(companyId, payableId) {
  return await AccountPayable.findOne({ _id: payableId, companyId });
}

async function updatePayableById(companyId, payableId, updateData) {
  return await AccountPayable.findOneAndUpdate(
    { _id: payableId, companyId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
}

async function deletePayableById(companyId, payableId) {
  return await AccountPayable.findOneAndDelete({ _id: payableId, companyId });
}

/**
 * Atomically records a payment and updates payable balances, strictly preventing overpayment.
 */
async function recordAtomicPayment({
  companyId,
  payableId,
  paymentSubdoc,
  newPaidAmount,
  newOutstandingAmount,
  newNormalizedPaidAmount,
  newNormalizedOutstandingAmount,
  newStatus,
  newAgingGroup
}) {
  const paymentAmount = paymentSubdoc.amount;

  const updatedPayable = await AccountPayable.findOneAndUpdate(
    {
      _id: payableId,
      companyId,
      outstandingAmount: { $gte: paymentAmount - 0.0001 } // Atomic guard against concurrent overpayment
    },
    {
      $push: { paymentHistory: paymentSubdoc },
      $set: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstandingAmount,
        normalizedPaidAmount: newNormalizedPaidAmount,
        normalizedOutstandingAmount: newNormalizedOutstandingAmount,
        status: newStatus,
        agingGroup: newAgingGroup
      }
    },
    {
      new: true
    }
  );

  return updatedPayable;
}

/**
 * Aggregates aging ledger into standard buckets.
 */
async function getAgingLedgerAggregation(companyId) {
  const pipeline = [
    { $match: { companyId } },
    {
      $group: {
        _id: '$agingGroup',
        totalOutstanding: { $sum: '$normalizedOutstandingAmount' },
        totalAmount: { $sum: '$normalizedTotalAmount' },
        count: { $sum: 1 }
      }
    }
  ];

  const results = await AccountPayable.aggregate(pipeline);

  const buckets = {
    [AGING_GROUPS.NOT_DUE]: { totalOutstanding: 0, count: 0 },
    [AGING_GROUPS.DAYS_1_30]: { totalOutstanding: 0, count: 0 },
    [AGING_GROUPS.DAYS_31_60]: { totalOutstanding: 0, count: 0 },
    [AGING_GROUPS.DAYS_61_90]: { totalOutstanding: 0, count: 0 },
    [AGING_GROUPS.DAYS_90_PLUS]: { totalOutstanding: 0, count: 0 },
    [AGING_GROUPS.PAID]: { totalOutstanding: 0, count: 0 }
  };

  let totalOutstanding = 0;
  let totalOverdue = 0;

  for (const group of results) {
    if (buckets[group._id] !== undefined) {
      const rounded = Math.round((group.totalOutstanding + Number.EPSILON) * 100) / 100;
      buckets[group._id] = {
        totalOutstanding: rounded,
        count: group.count
      };
      totalOutstanding += rounded;

      if (group._id !== AGING_GROUPS.NOT_DUE && group._id !== AGING_GROUPS.PAID) {
        totalOverdue += rounded;
      }
    }
  }

  return {
    totalOutstanding: Math.round((totalOutstanding + Number.EPSILON) * 100) / 100,
    totalOverdue: Math.round((totalOverdue + Number.EPSILON) * 100) / 100,
    currency: 'BDT',
    buckets
  };
}

module.exports = {
  createPayable,
  findPayables,
  countPayables,
  findPayableById,
  updatePayableById,
  deletePayableById,
  recordAtomicPayment,
  getAgingLedgerAggregation
};
