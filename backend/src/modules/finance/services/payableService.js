const payableRepo = require('../repositories/payableRepository');
const { getCompanyRates } = require('./currencyService');
const { convertCurrency, roundMoney } = require('../utils/money');
const { calculateAgingAndStatus } = require('../utils/aging');

class PayableNotFoundError extends Error {
  constructor(message = 'Account payable record not found') {
    super(message);
    this.statusCode = 404;
  }
}

class OverpaymentError extends Error {
  constructor(message = 'Payment amount exceeds current outstanding balance') {
    super(message);
    this.statusCode = 409;
  }
}

async function createPayable(companyId, userId, data) {
  const currency = (data.currency || 'BDT').toUpperCase();
  const totalAmount = roundMoney(Number(data.totalAmount));
  const paidAmount = roundMoney(Number(data.paidAmount || 0));

  const rates = await getCompanyRates(companyId);
  const normalizedTotalAmount = convertCurrency(totalAmount, currency, 'BDT', rates);
  const normalizedPaidAmount = convertCurrency(paidAmount, currency, 'BDT', rates);
  const rateSnapshot = rates[currency] || 1.0;

  const { outstandingAmount, agingGroup, status } = calculateAgingAndStatus({
    totalAmount,
    paidAmount,
    dueDate: data.dueDate,
    referenceDate: new Date()
  });

  const normalizedOutstandingAmount = convertCurrency(outstandingAmount, currency, 'BDT', rates);

  const payableDoc = {
    companyId,
    supplierId: data.supplierId || null,
    supplierName: data.supplierName,
    purchaseOrderId: data.purchaseOrderId || null,
    purchaseOrderNumber: data.purchaseOrderNumber || '',
    invoiceNumber: data.invoiceNumber,
    totalAmount,
    paidAmount,
    outstandingAmount,
    currency,
    normalizedTotalAmount,
    normalizedPaidAmount,
    normalizedOutstandingAmount,
    exchangeRateSnapshot: rateSnapshot,
    issueDate: new Date(data.issueDate),
    dueDate: new Date(data.dueDate),
    paymentTerms: data.paymentTerms || 'Net 30',
    status,
    agingGroup,
    paymentHistory: [],
    notes: data.notes || '',
    createdBy: userId
  };

  return await payableRepo.createPayable(payableDoc);
}

async function listPayables(companyId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 50));
  const skip = (page - 1) * pageSize;

  const filter = {
    companyId,
    supplierName: query.supplierName || null,
    status: query.status || null,
    agingGroup: query.agingGroup || null,
    startDate: query.startDate || null,
    endDate: query.endDate || null,
    skip,
    limit: pageSize,
    sortBy: query.sortBy || 'dueDate',
    sortOrder: query.sortOrder || 'asc'
  };

  const [payables, total] = await Promise.all([
    payableRepo.findPayables(filter),
    payableRepo.countPayables(filter)
  ]);

  return {
    payables,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

async function getPayableById(companyId, payableId) {
  const payable = await payableRepo.findPayableById(companyId, payableId);
  if (!payable) {
    throw new PayableNotFoundError();
  }
  return payable;
}

async function updatePayable(companyId, payableId, updateData) {
  const existing = await payableRepo.findPayableById(companyId, payableId);
  if (!existing) {
    throw new PayableNotFoundError();
  }

  const updates = { ...updateData };

  // Recalculate amounts if totalAmount or dueDate updated
  if (updates.totalAmount !== undefined || updates.dueDate !== undefined) {
    const totalAmount = updates.totalAmount !== undefined ? roundMoney(Number(updates.totalAmount)) : existing.totalAmount;
    const dueDate = updates.dueDate !== undefined ? new Date(updates.dueDate) : existing.dueDate;

    if (totalAmount < existing.paidAmount) {
      throw new Error('Total amount cannot be reduced below the already paid amount');
    }

    const rates = await getCompanyRates(companyId);
    const { outstandingAmount, agingGroup, status } = calculateAgingAndStatus({
      totalAmount,
      paidAmount: existing.paidAmount,
      dueDate,
      referenceDate: new Date()
    });

    updates.totalAmount = totalAmount;
    updates.dueDate = dueDate;
    updates.outstandingAmount = outstandingAmount;
    updates.agingGroup = agingGroup;
    updates.status = status;
    updates.normalizedTotalAmount = convertCurrency(totalAmount, existing.currency, 'BDT', rates);
    updates.normalizedOutstandingAmount = convertCurrency(outstandingAmount, existing.currency, 'BDT', rates);
  }

  if (updates.issueDate) updates.issueDate = new Date(updates.issueDate);

  const updated = await payableRepo.updatePayableById(companyId, payableId, updates);
  if (!updated) {
    throw new PayableNotFoundError();
  }
  return updated;
}

async function deletePayable(companyId, payableId) {
  const deleted = await payableRepo.deletePayableById(companyId, payableId);
  if (!deleted) {
    throw new PayableNotFoundError();
  }
  return deleted;
}

async function recordPayment(companyId, userId, payableId, paymentData) {
  const payable = await payableRepo.findPayableById(companyId, payableId);
  if (!payable) {
    throw new PayableNotFoundError();
  }

  const paymentAmount = roundMoney(Number(paymentData.amount));
  if (paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  if (paymentAmount > roundMoney(payable.outstandingAmount + 0.001)) {
    throw new OverpaymentError(
      `Payment amount of ${paymentAmount} exceeds current outstanding amount of ${payable.outstandingAmount}`
    );
  }

  const rates = await getCompanyRates(companyId);
  const normalizedPaymentAmount = convertCurrency(paymentAmount, payable.currency, 'BDT', rates);
  const rateSnapshot = rates[payable.currency] || 1.0;

  const newPaidAmount = roundMoney(payable.paidAmount + paymentAmount);
  const newOutstandingAmount = Math.max(0, roundMoney(payable.totalAmount - newPaidAmount));

  const { agingGroup: newAgingGroup, status: newStatus } = calculateAgingAndStatus({
    totalAmount: payable.totalAmount,
    paidAmount: newPaidAmount,
    dueDate: payable.dueDate,
    referenceDate: new Date()
  });

  const newNormalizedPaidAmount = convertCurrency(newPaidAmount, payable.currency, 'BDT', rates);
  const newNormalizedOutstandingAmount = convertCurrency(newOutstandingAmount, payable.currency, 'BDT', rates);

  const paymentSubdoc = {
    paymentId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    amount: paymentAmount,
    normalizedAmount: normalizedPaymentAmount,
    currency: payable.currency,
    exchangeRateSnapshot: rateSnapshot,
    paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
    paymentMethod: paymentData.paymentMethod || 'Bank Transfer',
    reference: paymentData.reference || '',
    notes: paymentData.notes || '',
    recordedBy: userId
  };

  const updated = await payableRepo.recordAtomicPayment({
    companyId,
    payableId,
    paymentSubdoc,
    newPaidAmount,
    newOutstandingAmount,
    newNormalizedPaidAmount,
    newNormalizedOutstandingAmount,
    newStatus,
    newAgingGroup
  });

  if (!updated) {
    throw new OverpaymentError('Payment conflict: Outstanding balance was updated concurrently.');
  }

  return updated;
}

module.exports = {
  PayableNotFoundError,
  OverpaymentError,
  createPayable,
  listPayables,
  getPayableById,
  updatePayable,
  deletePayable,
  recordPayment
};
