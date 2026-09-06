const payableService = require('../services/payableService');
const agingService = require('../services/agingService');

async function createPayable(req, res, next) {
  try {
    const { companyId, userId } = req.auth;
    const payable = await payableService.createPayable(companyId, userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Account payable created successfully',
      data: payable
    });
  } catch (error) {
    next(error);
  }
}

async function getPayables(req, res, next) {
  try {
    const { companyId } = req.auth;
    const result = await payableService.listPayables(companyId, req.query);

    res.status(200).json({
      success: true,
      message: 'Accounts payable retrieved successfully',
      data: result.payables,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
}

async function getAgingLedger(req, res, next) {
  try {
    const { companyId } = req.auth;
    const aging = await agingService.getAgingLedger(companyId);

    res.status(200).json({
      success: true,
      message: 'Accounts payable aging ledger retrieved successfully',
      data: aging
    });
  } catch (error) {
    next(error);
  }
}

async function getPayableById(req, res, next) {
  try {
    const { companyId } = req.auth;
    const payable = await payableService.getPayableById(companyId, req.params.payableId);

    res.status(200).json({
      success: true,
      message: 'Account payable retrieved successfully',
      data: payable
    });
  } catch (error) {
    next(error);
  }
}

async function updatePayable(req, res, next) {
  try {
    const { companyId } = req.auth;
    const updated = await payableService.updatePayable(companyId, req.params.payableId, req.body);

    res.status(200).json({
      success: true,
      message: 'Account payable updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

async function deletePayable(req, res, next) {
  try {
    const { companyId } = req.auth;
    await payableService.deletePayable(companyId, req.params.payableId);

    res.status(200).json({
      success: true,
      message: 'Account payable deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

async function recordPayment(req, res, next) {
  try {
    const { companyId, userId } = req.auth;
    const updated = await payableService.recordPayment(companyId, userId, req.params.payableId, req.body);

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPayable,
  getPayables,
  getAgingLedger,
  getPayableById,
  updatePayable,
  deletePayable,
  recordPayment
};
