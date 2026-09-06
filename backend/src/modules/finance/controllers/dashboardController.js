const analyticsService = require('../services/analyticsService');

async function getDashboardOverview(req, res, next) {
  try {
    const { companyId } = req.auth;
    const dashboardData = await analyticsService.getDashboardSummary(companyId, req.query);

    res.status(200).json({
      success: true,
      message: 'Finance dashboard data retrieved successfully',
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardOverview
};
