/**
 * Accounts Payable Aging Calculation Utility.
 * 
 * Handles exact boundary classifications for aging groups and statuses.
 */

const { diffDays } = require('./dates');
const { roundMoney } = require('./money');

const AGING_GROUPS = {
  NOT_DUE: 'Not Due',
  DAYS_1_30: '1–30 Days Overdue',
  DAYS_31_60: '31–60 Days Overdue',
  DAYS_61_90: '61–90 Days Overdue',
  DAYS_90_PLUS: '90+ Days Overdue',
  PAID: 'Paid'
};

const PAYABLE_STATUS = {
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue'
};

/**
 * Calculates days overdue, aging group, and status for a payable record.
 * 
 * @param {Object} params
 * @param {number} params.totalAmount
 * @param {number} params.paidAmount
 * @param {Date|string} params.dueDate
 * @param {Date|string} [params.referenceDate=new Date()]
 * @returns {{ outstandingAmount: number, daysOverdue: number, agingGroup: string, status: string }}
 */
function calculateAgingAndStatus({ totalAmount, paidAmount, dueDate, referenceDate = new Date() }) {
  const total = roundMoney(totalAmount || 0);
  const paid = roundMoney(paidAmount || 0);
  const outstanding = Math.max(0, roundMoney(total - paid));

  // If fully paid
  if (outstanding <= 0.001) {
    return {
      outstandingAmount: 0,
      daysOverdue: 0,
      agingGroup: AGING_GROUPS.PAID,
      status: PAYABLE_STATUS.PAID
    };
  }

  // Days overdue = referenceDate - dueDate
  // diffDays(dueDate, referenceDate) returns positive if referenceDate is after dueDate
  const daysOverdue = diffDays(dueDate, referenceDate);

  let agingGroup = AGING_GROUPS.NOT_DUE;
  let status = paid > 0 ? PAYABLE_STATUS.PARTIALLY_PAID : PAYABLE_STATUS.UNPAID;

  if (daysOverdue <= 0) {
    // Due today (0) or in the future (<0)
    agingGroup = AGING_GROUPS.NOT_DUE;
  } else {
    // 1 or more days past due date
    status = PAYABLE_STATUS.OVERDUE;

    if (daysOverdue <= 30) {
      agingGroup = AGING_GROUPS.DAYS_1_30;
    } else if (daysOverdue <= 60) {
      agingGroup = AGING_GROUPS.DAYS_31_60;
    } else if (daysOverdue <= 90) {
      agingGroup = AGING_GROUPS.DAYS_61_90;
    } else {
      agingGroup = AGING_GROUPS.DAYS_90_PLUS;
    }
  }

  return {
    outstandingAmount: outstanding,
    daysOverdue: Math.max(0, daysOverdue),
    agingGroup,
    status
  };
}

module.exports = {
  AGING_GROUPS,
  PAYABLE_STATUS,
  calculateAgingAndStatus
};
