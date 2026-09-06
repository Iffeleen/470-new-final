const financeRoutes = require('./routes/financeRoutes');
const { CurrencySetting } = require('./models/CurrencySetting');
const { OperationalBudget } = require('./models/OperationalBudget');
const { Expense } = require('./models/Expense');
const { AccountPayable } = require('./models/AccountPayable');
const { ConsumptionRecord } = require('./models/ConsumptionRecord');
const { errorHandler } = require('./middleware/errorHandler');

module.exports = {
  financeRoutes,
  errorHandler,
  models: {
    CurrencySetting,
    OperationalBudget,
    Expense,
    AccountPayable,
    ConsumptionRecord
  }
};
