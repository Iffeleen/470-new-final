/**
 * Financial Precision and Safe Money Handling Utility.
 * 
 * Prevents floating-point drift and rounds reliably.
 * Supports normalization against company base/normalization currency (BDT default).
 */

const DEFAULT_SUPPORTED_CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP'];
const DEFAULT_NORMALIZATION_CURRENCY = 'BDT';

/**
 * Rounds a number safely to specified decimal places (default 2).
 * @param {number} value 
 * @param {number} decimals 
 * @returns {number}
 */
function roundMoney(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Converts a major unit decimal amount to integer minor units (e.g. 123.45 -> 12345 cents/poisha).
 * @param {number} amount 
 * @returns {number}
 */
function toMinorUnits(amount) {
  return Math.round(roundMoney(amount, 2) * 100);
}

/**
 * Converts integer minor units back to major unit float (e.g. 12345 -> 123.45).
 * @param {number} minorAmount 
 * @returns {number}
 */
function toMajorUnits(minorAmount) {
  if (typeof minorAmount !== 'number' || isNaN(minorAmount)) {
    return 0;
  }
  return roundMoney(minorAmount / 100, 2);
}

/**
 * Converts an amount from one currency to another using exchange rates relative to BDT (where BDT = 1.0).
 * Rate formula: amountInBDT = amount / rate[fromCurrency]; result = amountInBDT * rate[toCurrency].
 * 
 * @param {number} amount 
 * @param {string} fromCurrency 
 * @param {string} toCurrency 
 * @param {Record<string, number>} rates 
 * @returns {number}
 */
function convertCurrency(amount, fromCurrency, toCurrency, rates) {
  const from = (fromCurrency || 'BDT').toUpperCase();
  const to = (toCurrency || 'BDT').toUpperCase();

  if (from === to) {
    return roundMoney(amount);
  }

  if (!rates || !rates[from] || !rates[to]) {
    throw new Error(`Missing exchange rate for conversion from ${from} to ${to}`);
  }

  const fromRate = rates[from];
  const toRate = rates[to];

  if (fromRate <= 0 || toRate <= 0) {
    throw new Error(`Invalid non-positive exchange rate encountered for ${from} or ${to}`);
  }

  // Base is BDT (rate = 1.0). If USD rate = 0.0082, 100 USD = 100 / 0.0082 BDT.
  const amountInBDT = amount / fromRate;
  const converted = amountInBDT * toRate;

  return roundMoney(converted);
}

/**
 * Formats an amount with currency symbol/code.
 * @param {number} amount 
 * @param {string} currency 
 * @returns {string}
 */
function formatCurrency(amount, currency = 'BDT') {
  const code = (currency || 'BDT').toUpperCase();
  const symbols = {
    BDT: '৳',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };
  const symbol = symbols[code] || `${code} `;
  const formattedNumber = roundMoney(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${formattedNumber}`;
}

module.exports = {
  DEFAULT_SUPPORTED_CURRENCIES,
  DEFAULT_NORMALIZATION_CURRENCY,
  roundMoney,
  toMinorUnits,
  toMajorUnits,
  convertCurrency,
  formatCurrency
};
