/**
 * Safe, Idempotent Development Seed Script for Module 3 (Finance).
 * 
 * Safety Rules:
 * - Refuses to run if NODE_ENV === 'production'.
 * - Scoped STRICTLY to TEST_COMPANY_ID ('cmp_dev_intrack_01').
 * - Never deletes or affects any other company's data.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('../../../config/database');
const { CurrencySetting } = require('../models/CurrencySetting');
const { OperationalBudget } = require('../models/OperationalBudget');
const { Expense } = require('../models/Expense');
const { AccountPayable } = require('../models/AccountPayable');
const { ConsumptionRecord } = require('../models/ConsumptionRecord');
const { AGING_GROUPS, PAYABLE_STATUS } = require('../utils/aging');

const TEST_COMPANY_ID = process.env.DEV_TEST_COMPANY_ID || 'cmp_dev_intrack_01';
const TEST_USER_ID = process.env.DEV_TEST_USER_ID || 'usr_dev_finance_01';

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: Seeding is strictly forbidden in production mode!');
    process.exit(1);
  }

  console.log(`[Seed] Connecting to database...`);
  await connectDatabase();

  console.log(`[Seed] Cleaning old seed data strictly for company: ${TEST_COMPANY_ID}...`);
  await Promise.all([
    CurrencySetting.deleteMany({ companyId: TEST_COMPANY_ID }),
    OperationalBudget.deleteMany({ companyId: TEST_COMPANY_ID }),
    Expense.deleteMany({ companyId: TEST_COMPANY_ID }),
    AccountPayable.deleteMany({ companyId: TEST_COMPANY_ID }),
    ConsumptionRecord.deleteMany({ companyId: TEST_COMPANY_ID })
  ]);

  console.log(`[Seed] Inserting Currency Settings...`);
  await CurrencySetting.create({
    companyId: TEST_COMPANY_ID,
    baseCurrency: 'BDT',
    displayCurrency: 'BDT',
    normalizationCurrency: 'BDT',
    exchangeRates: {
      BDT: 1.0,
      USD: 0.0082,
      EUR: 0.0070,
      GBP: 0.0060
    },
    rateUpdatedAt: new Date(),
    createdBy: TEST_USER_ID
  });

  console.log(`[Seed] Inserting Operational Budgets...`);
  const now = new Date();
  const currentYear = now.getUTCFullYear();

  await OperationalBudget.create([
    {
      companyId: TEST_COMPANY_ID,
      name: 'Monthly Factory Floor Wages',
      category: 'Factory Wages',
      monthlyAmount: 350000,
      currency: 'BDT',
      normalizedMonthlyAmount: 350000,
      exchangeRateSnapshot: 1.0,
      dueDay: 5,
      startDate: new Date(Date.UTC(currentYear, 0, 1)),
      isActive: true,
      notes: 'Direct labor compensation for 50 garment operators',
      createdBy: TEST_USER_ID
    },
    {
      companyId: TEST_COMPANY_ID,
      name: 'Factory Power & Grid Utility',
      category: 'Utilities',
      monthlyAmount: 85000,
      currency: 'BDT',
      normalizedMonthlyAmount: 85000,
      exchangeRateSnapshot: 1.0,
      dueDay: 12,
      startDate: new Date(Date.UTC(currentYear, 0, 1)),
      isActive: true,
      notes: 'Industrial electricity and water supply bills',
      createdBy: TEST_USER_ID
    },
    {
      companyId: TEST_COMPANY_ID,
      name: 'Freight & Port Logistics',
      category: 'Transportation',
      monthlyAmount: 60000,
      currency: 'BDT',
      normalizedMonthlyAmount: 60000,
      exchangeRateSnapshot: 1.0,
      dueDay: 18,
      startDate: new Date(Date.UTC(currentYear, 0, 1)),
      isActive: true,
      notes: 'Chittagong port container transport',
      createdBy: TEST_USER_ID
    },
    {
      companyId: TEST_COMPANY_ID,
      name: 'Facility Lease',
      category: 'Rent',
      monthlyAmount: 120000,
      currency: 'BDT',
      normalizedMonthlyAmount: 120000,
      exchangeRateSnapshot: 1.0,
      dueDay: 1,
      startDate: new Date(Date.UTC(currentYear, 0, 1)),
      isActive: true,
      notes: 'Main production facility lease agreement',
      createdBy: TEST_USER_ID
    },
    {
      companyId: TEST_COMPANY_ID,
      name: 'Machinery Routine Servicing',
      category: 'Maintenance',
      monthlyAmount: 30000,
      currency: 'BDT',
      normalizedMonthlyAmount: 30000,
      exchangeRateSnapshot: 1.0,
      dueDay: 25,
      startDate: new Date(Date.UTC(currentYear, 0, 1)),
      isActive: true,
      notes: 'Sewing and cutting machine maintenance',
      createdBy: TEST_USER_ID
    }
  ]);

  console.log(`[Seed] Inserting Expenses across multiple months...`);
  const expenses = [];
  const categories = ['Transport', 'Salary', 'Utilities', 'Maintenance', 'Raw Materials', 'Office', 'Rent'];

  // Seed expenses for past 6 months
  for (let m = 0; m <= 5; m++) {
    const monthIndex = (now.getUTCMonth() - m + 12) % 12;
    const yearOffset = now.getUTCMonth() - m < 0 ? currentYear - 1 : currentYear;

    expenses.push(
      {
        companyId: TEST_COMPANY_ID,
        title: `Wages Distribution - Month ${monthIndex + 1}`,
        category: 'Salary',
        amount: 340000 + Math.floor(Math.random() * 20000),
        currency: 'BDT',
        normalizedAmount: 340000 + Math.floor(Math.random() * 20000),
        exchangeRateSnapshot: 1.0,
        expenseDate: new Date(Date.UTC(yearOffset, monthIndex, 5)),
        createdBy: TEST_USER_ID,
        createdByRole: 'Finance Officer'
      },
      {
        companyId: TEST_COMPANY_ID,
        title: `Electricity Bill Payment`,
        category: 'Utilities',
        amount: 82000 + Math.floor(Math.random() * 5000),
        currency: 'BDT',
        normalizedAmount: 82000 + Math.floor(Math.random() * 5000),
        exchangeRateSnapshot: 1.0,
        expenseDate: new Date(Date.UTC(yearOffset, monthIndex, 12)),
        createdBy: TEST_USER_ID,
        createdByRole: 'Finance Officer'
      },
      {
        companyId: TEST_COMPANY_ID,
        title: `Trucking & Dispatch`,
        category: 'Transport',
        amount: 55000 + Math.floor(Math.random() * 8000),
        currency: 'BDT',
        normalizedAmount: 55000 + Math.floor(Math.random() * 8000),
        exchangeRateSnapshot: 1.0,
        expenseDate: new Date(Date.UTC(yearOffset, monthIndex, 18)),
        createdBy: TEST_USER_ID,
        createdByRole: 'Logistics Lead'
      },
      {
        companyId: TEST_COMPANY_ID,
        title: `Emergency Parts Replacement`,
        category: 'Maintenance',
        amount: 15000 + Math.floor(Math.random() * 10000),
        currency: 'BDT',
        normalizedAmount: 15000 + Math.floor(Math.random() * 10000),
        exchangeRateSnapshot: 1.0,
        expenseDate: new Date(Date.UTC(yearOffset, monthIndex, 22)),
        createdBy: TEST_USER_ID,
        createdByRole: 'Maintenance Supervisor'
      }
    );
  }
  await Expense.insertMany(expenses);

  console.log(`[Seed] Inserting Accounts Payable with aging buckets...`);
  const today = new Date();

  // Helper to create dates offset by days from today
  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

  await AccountPayable.create([
    // 1. Not Due (Future due date)
    {
      companyId: TEST_COMPANY_ID,
      supplierName: 'Apex Yarn Mills Ltd.',
      invoiceNumber: 'INV-2026-001',
      totalAmount: 150000,
      paidAmount: 0,
      outstandingAmount: 150000,
      currency: 'BDT',
      normalizedTotalAmount: 150000,
      normalizedPaidAmount: 0,
      normalizedOutstandingAmount: 150000,
      exchangeRateSnapshot: 1.0,
      issueDate: addDays(today, -10),
      dueDate: addDays(today, 20),
      paymentTerms: 'Net 30',
      status: PAYABLE_STATUS.UNPAID,
      agingGroup: AGING_GROUPS.NOT_DUE,
      notes: 'High grade cotton yarn consignment',
      createdBy: TEST_USER_ID
    },
    // 2. Partially Paid (Not Due)
    {
      companyId: TEST_COMPANY_ID,
      supplierName: 'Bengal Dyeing & Chemical Ltd.',
      invoiceNumber: 'INV-2026-002',
      totalAmount: 200000,
      paidAmount: 80000,
      outstandingAmount: 120000,
      currency: 'BDT',
      normalizedTotalAmount: 200000,
      normalizedPaidAmount: 80000,
      normalizedOutstandingAmount: 120000,
      exchangeRateSnapshot: 1.0,
      issueDate: addDays(today, -15),
      dueDate: addDays(today, 15),
      paymentTerms: 'Net 30',
      status: PAYABLE_STATUS.PARTIALLY_PAID,
      agingGroup: AGING_GROUPS.NOT_DUE,
      paymentHistory: [
        {
          paymentId: 'pay_init_001',
          amount: 80000,
          normalizedAmount: 80000,
          currency: 'BDT',
          paymentDate: addDays(today, -5),
          paymentMethod: 'Bank Transfer',
          reference: 'TXN-998822',
          recordedBy: TEST_USER_ID
        }
      ],
      createdBy: TEST_USER_ID
    },
    // 3. 1-30 Days Overdue (Due 15 days ago)
    {
      companyId: TEST_COMPANY_ID,
      supplierName: 'Rahim Packaging & Accessories',
      invoiceNumber: 'INV-2026-003',
      totalAmount: 45000,
      paidAmount: 0,
      outstandingAmount: 45000,
      currency: 'BDT',
      normalizedTotalAmount: 45000,
      normalizedPaidAmount: 0,
      normalizedOutstandingAmount: 45000,
      exchangeRateSnapshot: 1.0,
      issueDate: addDays(today, -45),
      dueDate: addDays(today, -15),
      paymentTerms: 'Net 30',
      status: PAYABLE_STATUS.OVERDUE,
      agingGroup: AGING_GROUPS.DAYS_1_30,
      createdBy: TEST_USER_ID
    },
    // 4. 31-60 Days Overdue (Due 45 days ago)
    {
      companyId: TEST_COMPANY_ID,
      supplierName: 'Sonali Thread Industries',
      invoiceNumber: 'INV-2026-004',
      totalAmount: 65000,
      paidAmount: 0,
      outstandingAmount: 65000,
      currency: 'BDT',
      normalizedTotalAmount: 65000,
      normalizedPaidAmount: 0,
      normalizedOutstandingAmount: 65000,
      exchangeRateSnapshot: 1.0,
      issueDate: addDays(today, -75),
      dueDate: addDays(today, -45),
      paymentTerms: 'Net 30',
      status: PAYABLE_STATUS.OVERDUE,
      agingGroup: AGING_GROUPS.DAYS_31_60,
      createdBy: TEST_USER_ID
    },
    // 5. 90+ Days Overdue (Due 100 days ago)
    {
      companyId: TEST_COMPANY_ID,
      supplierName: 'Global Zipper & Trims Corp',
      invoiceNumber: 'INV-2026-005',
      totalAmount: 85000,
      paidAmount: 0,
      outstandingAmount: 85000,
      currency: 'BDT',
      normalizedTotalAmount: 85000,
      normalizedPaidAmount: 0,
      normalizedOutstandingAmount: 85000,
      exchangeRateSnapshot: 1.0,
      issueDate: addDays(today, -130),
      dueDate: addDays(today, -100),
      paymentTerms: 'Net 30',
      status: PAYABLE_STATUS.OVERDUE,
      agingGroup: AGING_GROUPS.DAYS_90_PLUS,
      createdBy: TEST_USER_ID
    },
    // 6. Paid Payable
    {
      companyId: TEST_COMPANY_ID,
      supplierName: 'National Labels Ltd.',
      invoiceNumber: 'INV-2026-006',
      totalAmount: 30000,
      paidAmount: 30000,
      outstandingAmount: 0,
      currency: 'BDT',
      normalizedTotalAmount: 30000,
      normalizedPaidAmount: 30000,
      normalizedOutstandingAmount: 0,
      exchangeRateSnapshot: 1.0,
      issueDate: addDays(today, -60),
      dueDate: addDays(today, -30),
      paymentTerms: 'Net 30',
      status: PAYABLE_STATUS.PAID,
      agingGroup: AGING_GROUPS.PAID,
      paymentHistory: [
        {
          paymentId: 'pay_init_002',
          amount: 30000,
          normalizedAmount: 30000,
          currency: 'BDT',
          paymentDate: addDays(today, -32),
          paymentMethod: 'Bank Transfer',
          reference: 'TXN-774411',
          recordedBy: TEST_USER_ID
        }
      ],
      createdBy: TEST_USER_ID
    }
  ]);

  console.log(`[Seed] Inserting Material Consumption Records...`);
  const materials = [
    { name: '100% Cotton Yarn 30s', unit: 'kg', unitCost: 420 },
    { name: 'Polyester Sewing Thread 40/2', unit: 'spools', unitCost: 65 },
    { name: 'Reactive Blue Dye', unit: 'kg', unitCost: 950 },
    { name: 'Polybag Packing Medium', unit: 'pcs', unitCost: 3.5 },
    { name: 'Metal Snap Button 12mm', unit: 'gross', unitCost: 180 }
  ];

  const consumptionDocs = [];
  for (let m = 0; m <= 5; m++) {
    const monthIndex = (now.getUTCMonth() - m + 12) % 12;
    const yearOffset = now.getUTCMonth() - m < 0 ? currentYear - 1 : currentYear;

    materials.forEach((mat, idx) => {
      const quantity = Math.floor(150 + Math.random() * 300);
      const totalCost = quantity * mat.unitCost;

      consumptionDocs.push({
        companyId: TEST_COMPANY_ID,
        materialId: `mat_${idx + 1}`,
        materialName: mat.name,
        quantity,
        unit: mat.unit,
        unitCost: mat.unitCost,
        totalCost,
        currency: 'BDT',
        normalizedTotalCost: totalCost,
        consumedAt: new Date(Date.UTC(yearOffset, monthIndex, 10 + (idx * 3))),
        source: 'module3_demo',
        sourceReference: `PROD-BATCH-${yearOffset}${monthIndex + 1}-${idx + 1}`
      });
    });
  }
  await ConsumptionRecord.insertMany(consumptionDocs);

  console.log(`[Seed] Completed successfully! Seeded data for company '${TEST_COMPANY_ID}'.`);
  await disconnectDatabase();
  process.exit(0);
}

seed().catch(err => {
  console.error('[Seed Error] Seeding failed:', err);
  process.exit(1);
});
