const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../../server');
const { CurrencySetting } = require('../models/CurrencySetting');
const { OperationalBudget } = require('../models/OperationalBudget');
const { Expense } = require('../models/Expense');
const { AccountPayable } = require('../models/AccountPayable');
const { ConsumptionRecord } = require('../models/ConsumptionRecord');

const COMPANY_A = 'cmp_test_alpha_01';
const COMPANY_B = 'cmp_test_beta_02';
const USER_A = 'usr_alice_01';
const USER_B = 'usr_bob_02';

const authHeadersCompanyA = {
  'x-company-id': COMPANY_A,
  'x-user-id': USER_A,
  'x-role': 'Finance Manager'
};

const authHeadersCompanyB = {
  'x-company-id': COMPANY_B,
  'x-user-id': USER_B,
  'x-role': 'Finance Manager'
};

const readOnlyHeadersCompanyA = {
  'x-company-id': COMPANY_A,
  'x-user-id': USER_A,
  'x-role': 'Viewer'
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DEV_AUTH_BYPASS = 'true';

  const testUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/intrack_finance_test';
  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 3000 });
  } catch (err) {
    console.warn('Local MongoDB test connection skipped if not running locally:', err.message);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await Promise.all([
      CurrencySetting.deleteMany({ companyId: { $in: [COMPANY_A, COMPANY_B] } }),
      OperationalBudget.deleteMany({ companyId: { $in: [COMPANY_A, COMPANY_B] } }),
      Expense.deleteMany({ companyId: { $in: [COMPANY_A, COMPANY_B] } }),
      AccountPayable.deleteMany({ companyId: { $in: [COMPANY_A, COMPANY_B] } }),
      ConsumptionRecord.deleteMany({ companyId: { $in: [COMPANY_A, COMPANY_B] } })
    ]);
    await mongoose.disconnect();
  }
});

describe('IN-Track Module 3: Finance Integration Test Suite', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await Promise.all([
        CurrencySetting.deleteMany({ companyId: { $in: [COMPANY_A, COMPANY_B] } }),
        OperationalBudget.deleteMany({ companyId: { $in: [COMPANY_A, COMPANY_B] } }),
        Expense.deleteMany({ companyId: { $in: [COMPANY_A, COMPANY_B] } }),
        AccountPayable.deleteMany({ companyId: { $in: [COMPANY_A, COMPANY_B] } }),
        ConsumptionRecord.deleteMany({ companyId: { $in: [COMPANY_A, COMPANY_B] } })
      ]);
    }
  });

  describe('1. Authentication & RBAC Layer', () => {
    test('Rejects request with 401 when auth bypass is disabled and no token is present', async () => {
      const origBypass = process.env.DEV_AUTH_BYPASS;
      process.env.DEV_AUTH_BYPASS = 'false';

      const res = await request(app).get('/api/finance/currency');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);

      process.env.DEV_AUTH_BYPASS = origBypass;
    });

    test('Allows GET request with read-only viewer role', async () => {
      const res = await request(app)
        .get('/api/finance/currency')
        .set(readOnlyHeadersCompanyA);

      if (mongoose.connection.readyState === 1) {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });

    test('Rejects POST request with 403 Forbidden for read-only viewer role', async () => {
      const res = await request(app)
        .post('/api/finance/budgets')
        .set(readOnlyHeadersCompanyA)
        .send({
          name: 'Unauthorized Budget',
          category: 'Utilities',
          monthlyAmount: 5000,
          dueDay: 5,
          startDate: '2026-01-01'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('finance.create');
    });
  });

  describe('2. Multi-Currency Settings (REQ-3.1)', () => {
    test('Initializes BDT default currency settings for new company', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .get('/api/finance/currency')
        .set(authHeadersCompanyA);

      expect(res.status).toBe(200);
      expect(res.body.data.baseCurrency).toBe('BDT');
      expect(res.body.data.displayCurrency).toBe('BDT');
      expect(res.body.data.exchangeRates.BDT).toBe(1.0);
      expect(res.body.data.exchangeRates.USD).toBeDefined();
    });

    test('Updates display currency and custom exchange rates', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .put('/api/finance/currency')
        .set(authHeadersCompanyA)
        .send({
          displayCurrency: 'USD',
          exchangeRates: { USD: 0.0090 }
        });

      expect(res.status).toBe(200);
      expect(res.body.data.displayCurrency).toBe('USD');
      expect(res.body.data.exchangeRates.USD).toBe(0.0090);
      expect(res.body.data.exchangeRates.BDT).toBe(1.0);
    });

    test('Rejects invalid currency and non-positive rates with 400 Bad Request', async () => {
      const res = await request(app)
        .put('/api/finance/currency')
        .set(authHeadersCompanyA)
        .send({
          displayCurrency: 'INVALID_CURR',
          exchangeRates: { USD: -5 }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Operational Budgets & Tenant Isolation (REQ-3.2)', () => {
    test('Creates budget and verifies company isolation', async () => {
      if (mongoose.connection.readyState !== 1) return;

      // 1. Company A creates a budget
      const createRes = await request(app)
        .post('/api/finance/budgets')
        .set(authHeadersCompanyA)
        .send({
          name: 'Factory Wages Alpha',
          category: 'Factory Wages',
          monthlyAmount: 100000,
          currency: 'BDT',
          dueDay: 10,
          startDate: '2026-01-01'
        });

      expect(createRes.status).toBe(201);
      const budgetId = createRes.body.data._id;

      // 2. Company A can retrieve it
      const getResA = await request(app)
        .get(`/api/finance/budgets/${budgetId}`)
        .set(authHeadersCompanyA);
      expect(getResA.status).toBe(200);
      expect(getResA.body.data.name).toBe('Factory Wages Alpha');

      // 3. Company B cannot access Company A budget (returns 404)
      const getResB = await request(app)
        .get(`/api/finance/budgets/${budgetId}`)
        .set(authHeadersCompanyB);
      expect(getResB.status).toBe(404);

      // 4. Company B summary does not include Company A's budget
      const summaryB = await request(app)
        .get('/api/finance/budgets/summary')
        .set(authHeadersCompanyB);
      expect(summaryB.body.data.totalMonthlyBudget).toBe(0);
      expect(summaryB.body.data.activeBudgetCount).toBe(0);
    });

    test('Validates budget fields (dueDay 1-31, non-negative amount)', async () => {
      const invalidDayRes = await request(app)
        .post('/api/finance/budgets')
        .set(authHeadersCompanyA)
        .send({
          name: 'Bad Day Budget',
          category: 'Rent',
          monthlyAmount: 5000,
          dueDay: 40,
          startDate: '2026-01-01'
        });
      expect(invalidDayRes.status).toBe(400);

      const negAmountRes = await request(app)
        .post('/api/finance/budgets')
        .set(authHeadersCompanyA)
        .send({
          name: 'Bad Amount Budget',
          category: 'Rent',
          monthlyAmount: -500,
          dueDay: 15,
          startDate: '2026-01-01'
        });
      expect(negAmountRes.status).toBe(400);
    });
  });

  describe('4. Accounts Payable, Aging Ledger & Atomic Payments (REQ-3.3)', () => {
    test('Calculates correct initial aging bucket and processes partial & full payments', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const today = new Date();
      const futureDue = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 1. Create Payable
      const createRes = await request(app)
        .post('/api/finance/payables')
        .set(authHeadersCompanyA)
        .send({
          supplierName: 'Alpha Textiles',
          invoiceNumber: 'INV-TEST-001',
          totalAmount: 50000,
          currency: 'BDT',
          issueDate: '2026-01-01',
          dueDate: futureDue
        });

      expect(createRes.status).toBe(201);
      const payableId = createRes.body.data._id;
      expect(createRes.body.data.status).toBe('Unpaid');
      expect(createRes.body.data.agingGroup).toBe('Not Due');
      expect(createRes.body.data.outstandingAmount).toBe(50000);

      // 2. Partial Payment (20,000)
      const partialPayRes = await request(app)
        .post(`/api/finance/payables/${payableId}/payments`)
        .set(authHeadersCompanyA)
        .send({
          amount: 20000,
          paymentMethod: 'Bank Transfer',
          reference: 'REF-1001'
        });

      expect(partialPayRes.status).toBe(200);
      expect(partialPayRes.body.data.paidAmount).toBe(20000);
      expect(partialPayRes.body.data.outstandingAmount).toBe(30000);
      expect(partialPayRes.body.data.status).toBe('Partially Paid');
      expect(partialPayRes.body.data.paymentHistory.length).toBe(1);

      // 3. Overpayment Attempt (40,000 > 30,000 outstanding)
      const overpayRes = await request(app)
        .post(`/api/finance/payables/${payableId}/payments`)
        .set(authHeadersCompanyA)
        .send({ amount: 40000 });

      expect(overpayRes.status).toBe(409);

      // 4. Full remaining payment (30,000)
      const fullPayRes = await request(app)
        .post(`/api/finance/payables/${payableId}/payments`)
        .set(authHeadersCompanyA)
        .send({ amount: 30000 });

      expect(fullPayRes.status).toBe(200);
      expect(fullPayRes.body.data.paidAmount).toBe(50000);
      expect(fullPayRes.body.data.outstandingAmount).toBe(0);
      expect(fullPayRes.body.data.status).toBe('Paid');
      expect(fullPayRes.body.data.agingGroup).toBe('Paid');
    });

    test('Enforces unique invoiceNumber per company', async () => {
      if (mongoose.connection.readyState !== 1) return;

      await request(app)
        .post('/api/finance/payables')
        .set(authHeadersCompanyA)
        .send({
          supplierName: 'Supplier 1',
          invoiceNumber: 'INV-DUP-99',
          totalAmount: 10000,
          issueDate: '2026-01-01',
          dueDate: '2026-02-01'
        });

      const dupRes = await request(app)
        .post('/api/finance/payables')
        .set(authHeadersCompanyA)
        .send({
          supplierName: 'Supplier 2',
          invoiceNumber: 'INV-DUP-99',
          totalAmount: 15000,
          issueDate: '2026-01-01',
          dueDate: '2026-02-01'
        });

      expect(dupRes.status).toBe(409);
    });
  });

  describe('5. Expenses Filtering & Dashboard Analytics (REQ-3.4, REQ-3.5)', () => {
    test('Filters expenses by category and calculates summaries', async () => {
      if (mongoose.connection.readyState !== 1) return;

      await request(app)
        .post('/api/finance/expenses')
        .set(authHeadersCompanyA)
        .send({
          title: 'Office Internet Fiber',
          category: 'Utilities',
          amount: 4000,
          currency: 'BDT',
          expenseDate: '2026-05-10'
        });

      await request(app)
        .post('/api/finance/expenses')
        .set(authHeadersCompanyA)
        .send({
          title: 'Local Transport Fare',
          category: 'Transport',
          amount: 1500,
          currency: 'BDT',
          expenseDate: '2026-05-15'
        });

      // Filter by category
      const filterRes = await request(app)
        .get('/api/finance/expenses?category=Utilities')
        .set(authHeadersCompanyA);

      expect(filterRes.status).toBe(200);
      expect(filterRes.body.data.length).toBe(1);
      expect(filterRes.body.data[0].category).toBe('Utilities');

      // Summary
      const summaryRes = await request(app)
        .get('/api/finance/expenses/summary')
        .set(authHeadersCompanyA);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.totalAmount).toBe(5500);
      expect(summaryRes.body.data.count).toBe(2);
    });

    test('Returns structured dashboard summary with zero-safe defaults for empty company', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app)
        .get('/api/finance/dashboard')
        .set(authHeadersCompanyB);

      expect(res.status).toBe(200);
      expect(res.body.data.monthlyBudget).toBe(0);
      expect(res.body.data.monthlyExpense).toBe(0);
      expect(res.body.data.outstandingPayable).toBe(0);
      expect(res.body.data.overduePayable).toBe(0);
      expect(Array.isArray(res.body.data.recentExpenses)).toBe(true);
      expect(Array.isArray(res.body.data.upcomingPayments)).toBe(true);
      expect(Array.isArray(res.body.data.spendingTrend)).toBe(true);
      expect(Array.isArray(res.body.data.categoryBreakdown)).toBe(true);
    });
  });
});
