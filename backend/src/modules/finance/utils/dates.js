/**
 * Date calculation and normalization utilities for Finance module.
 */

/**
 * Normalizes a date to midnight UTC.
 * @param {Date|string|number} dateInput 
 * @returns {Date}
 */
function toMidnightUTC(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided: ${dateInput}`);
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Calculates calendar days between two dates (date2 - date1).
 * Positive if date2 is after date1.
 * @param {Date|string} date1 
 * @param {Date|string} date2 
 * @returns {number}
 */
function diffDays(date1, date2) {
  const d1 = toMidnightUTC(date1);
  const d2 = toMidnightUTC(date2);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((d2.getTime() - d1.getTime()) / MS_PER_DAY);
}

/**
 * Returns UTC start and end Date for a given month and year.
 * @param {number} month (1-12)
 * @param {number} year (e.g. 2026)
 * @returns {{ startDate: Date, endDate: Date }}
 */
function getMonthRange(month, year) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 1970) {
    throw new Error('Invalid month or year for date range');
  }

  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  // Day 0 of next month is the last day of the current month
  const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { startDate, endDate };
}

/**
 * Returns UTC start and end Date for a full year.
 * @param {number} year 
 * @returns {{ startDate: Date, endDate: Date }}
 */
function getYearRange(year) {
  const y = parseInt(year, 10);
  if (isNaN(y) || y < 1970) {
    throw new Error('Invalid year for date range');
  }
  const startDate = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
  return { startDate, endDate };
}

module.exports = {
  toMidnightUTC,
  diffDays,
  getMonthRange,
  getYearRange
};
