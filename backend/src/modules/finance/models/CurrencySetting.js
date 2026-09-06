const mongoose = require('mongoose');

const DEFAULT_EXCHANGE_RATES = {
  BDT: 1.0,
  USD: 0.0082,
  EUR: 0.0070,
  GBP: 0.0060
};

const currencySettingSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      required: true,
      index: true
    },
    baseCurrency: {
      type: String,
      required: true,
      default: 'BDT',
      uppercase: true
    },
    displayCurrency: {
      type: String,
      required: true,
      default: 'BDT',
      uppercase: true
    },
    normalizationCurrency: {
      type: String,
      required: true,
      default: 'BDT',
      uppercase: true
    },
    exchangeRates: {
      type: Map,
      of: Number,
      default: () => new Map(Object.entries(DEFAULT_EXCHANGE_RATES))
    },
    rateUpdatedAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        // Convert Map to plain object if needed
        if (ret.exchangeRates instanceof Map) {
          ret.exchangeRates = Object.fromEntries(ret.exchangeRates);
        }
        return ret;
      }
    }
  }
);

// One currency setting document per company
currencySettingSchema.index({ companyId: 1 }, { unique: true });

const CurrencySetting = mongoose.model('CurrencySetting', currencySettingSchema);

module.exports = {
  CurrencySetting,
  DEFAULT_EXCHANGE_RATES
};
