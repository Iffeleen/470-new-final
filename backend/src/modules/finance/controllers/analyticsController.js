const analyticsService = require('../services/analyticsService');
const { getConsumptionRecords, createConsumptionRecord } = require('../integrations/localConsumptionProvider');

async function getSpendingTrend(req, res, next) {
  try {
    const { companyId } = req.auth;
    const data = await analyticsService.getSpendingTrend(companyId, req.query);

    res.status(200).json({
      success: true,
      message: 'Spending trend analytics retrieved successfully',
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getCategoryBreakdown(req, res, next) {
  try {
    const { companyId } = req.auth;
    const data = await analyticsService.getCategoryBreakdown(companyId, req.query);

    res.status(200).json({
      success: true,
      message: 'Expense category breakdown retrieved successfully',
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getConsumptionTrend(req, res, next) {
  try {
    const { companyId } = req.auth;
    const data = await analyticsService.getConsumptionTrend(companyId, req.query);

    res.status(200).json({
      success: true,
      message: 'Material consumption trend analytics retrieved successfully',
      data
    });
  } catch (error) {
    next(error);
  }
}

async function getConsumptionRecordsHandler(req, res, next) {
  try {
    const { companyId } = req.auth;
    const result = await getConsumptionRecords({
      companyId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      materialId: req.query.materialId,
      page: req.query.page,
      pageSize: req.query.pageSize
    });

    res.status(200).json({
      success: true,
      message: 'Material consumption records retrieved successfully',
      data: result.records,
      meta: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createConsumptionRecordHandler(req, res, next) {
  try {
    const { companyId } = req.auth;
    const record = await createConsumptionRecord({
      companyId,
      ...req.body
    });

    res.status(201).json({
      success: true,
      message: 'Material consumption record recorded successfully',
      data: record
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSpendingTrend,
  getCategoryBreakdown,
  getConsumptionTrend,
  getConsumptionRecordsHandler,
  createConsumptionRecordHandler
};
