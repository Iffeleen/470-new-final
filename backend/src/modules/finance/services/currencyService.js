const { CurrencySetting, DEFAULT_EXCHANGE_RATES } = require('../models/CurrencySetting');
const { convertCurrency, roundMoney } = require('../utils/money');

/**
 * Gets or initializes currency setting for a company.
 * @param {string} companyId 
 * @returns {Promise<Object>}
 */
async function getOrCreateCurrencySetting(companyId) {
  let setting = await CurrencySetting.findOne({ companyId });

  if (!setting) {
    setting = new CurrencySetting({
      companyId,
      baseCurrency: 'BDT',
      displayCurrency: 'BDT',
      normalizationCurrency: 'BDT',
      exchangeRates: new Map(Object.entries(DEFAULT_EXCHANGE_RATES)),
      rateUpdatedAt: new Date()
    });
    await setting.save();
  }

  return setting.toJSON();
}

/**
 * Updates company currency settings (displayCurrency or custom exchange rates).
 * Note: Historical transactions are NOT modified.
 */
async function updateCurrencySetting(companyId, updateData, userId = null) {
  let setting = await CurrencySetting.findOne({ companyId });

  if (!setting) {
    setting = new CurrencySetting({
      companyId,
      baseCurrency: 'BDT',
      displayCurrency: 'BDT',
      normalizationCurrency: 'BDT',
      exchangeRates: new Map(Object.entries(DEFAULT_EXCHANGE_RATES))
    });
  }

  if (updateData.displayCurrency) {
    setting.displayCurrency = updateData.displayCurrency.toUpperCase();
  }

  if (updateData.exchangeRates) {
    const currentRates = setting.exchangeRates instanceof Map 
      ? Object.fromEntries(setting.exchangeRates) 
      : (setting.exchangeRates || DEFAULT_EXCHANGE_RATES);

    const mergedRates = {
      ...currentRates,
      ...updateData.exchangeRates,
      BDT: 1.0 // BDT is always fixed anchor at 1.0
    };

    setting.exchangeRates = new Map(Object.entries(mergedRates));
    setting.rateUpdatedAt = new Date();
  }

  if (userId) {
    setting.createdBy = userId;
  }

  await setting.save();
  return setting.toJSON();
}

/**
 * Returns plain object map of exchange rates for a company.
 */
async function getCompanyRates(companyId) {
  const setting = await getOrCreateCurrencySetting(companyId);
  return setting.exchangeRates instanceof Map
    ? Object.fromEntries(setting.exchangeRates)
    : (setting.exchangeRates || DEFAULT_EXCHANGE_RATES);
}

module.exports = {
  getOrCreateCurrencySetting,
  updateCurrencySetting,
  getCompanyRates
};
