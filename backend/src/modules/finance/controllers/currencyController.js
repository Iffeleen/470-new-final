const currencyService = require('../services/currencyService');

async function getCurrencySettings(req, res, next) {
  try {
    const { companyId } = req.auth;
    const settings = await currencyService.getOrCreateCurrencySetting(companyId);

    res.status(200).json({
      success: true,
      message: 'Currency settings retrieved successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
}

async function updateCurrencySettings(req, res, next) {
  try {
    const { companyId, userId } = req.auth;
    const updated = await currencyService.updateCurrencySetting(companyId, req.body, userId);

    res.status(200).json({
      success: true,
      message: 'Currency settings updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCurrencySettings,
  updateCurrencySettings
};
