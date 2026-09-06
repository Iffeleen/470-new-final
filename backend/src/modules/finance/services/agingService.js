const payableRepo = require('../repositories/payableRepository');

async function getAgingLedger(companyId) {
  return await payableRepo.getAgingLedgerAggregation(companyId);
}

module.exports = {
  getAgingLedger
};
