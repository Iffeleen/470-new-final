# IN-Track Module 3 Integration Contract
**Module 3: Financial Tracking & Analytics**
**Technology Stack:** Node.js + Express.js + MongoDB + Mongoose (MERN Architecture)

---

## 1. Scope & Core Requirements
Module 3 provides complete financial tracking, budgeting, accounts payable, expense cycle filtering, and material consumption analytics for the IN-Track ERP.

The five requirements assigned to Module 3 are:
1. **Interactive Multi-Currency Support (REQ-3.1)**: Company-level base/display currency, manual positive exchange rates relative to BDT anchor, historical conversion snapshots.
2. **Operational Budget Mapping (REQ-3.2)**: Category-based monthly budget mapping, active status management, due day scheduling (1–31), monthly budget aggregation.
3. **Accounts Payable Aging Ledger (REQ-3.3)**: Invoice tracking, dynamic aging classification (`Not Due`, `1–30 Days Overdue`, `31–60 Days Overdue`, `61–90 Days Overdue`, `90+ Days Overdue`, `Paid`), atomic payment recording, overpayment prevention.
4. **Comprehensive Expense Cycle Filtering (REQ-3.4)**: Expense logging, normalized amounts, multi-criteria filtering (month, year, category, role, date range, sanitized search), pagination, aggregate summaries.
5. **Visual Consumption Trend Charts (REQ-3.5)**: Time-series spending trends, expense category breakdowns, material consumption cost/quantity trends, unified KPI dashboard.

---

## 2. Authentication & Module 1 Integration Modes

Module 3 strictly depends on standard authentication context provided on `req.auth`:
```javascript
req.auth = {
  userId: "usr_dev_finance_01",
  companyId: "cmp_dev_intrack_01",
  role: "Finance Manager",
  permissions: ["finance.read", "finance.create", "finance.update", "finance.delete"]
};
```

### Mode A: Module 1 Integration Mode
When Module 1 is merged into the combined backend:
1. Module 1's JWT authentication middleware populates `req.auth`.
2. Module 3's `module1AuthAdapter.js` automatically passes through `req.auth`.
3. Mount the Module 3 router once in `app.js` / `server.js`:
   ```javascript
   const { financeRoutes } = require('./modules/finance');
   app.use('/api/finance', financeRoutes);
   ```

### Mode B: Independent Development Mode
When developing or testing Module 3 independently:
- Isolated compatibility adapter `module1AuthAdapter.js` handles requests.
- Enabled by `DEV_AUTH_BYPASS=true` and `NODE_ENV !== "production"`.
- Dev headers `x-company-id`, `x-user-id`, `x-role` allow automated multi-tenant testing.
- **Never bypasses authentication in production.**

---

## 3. Tenant & Company Isolation Strategy
- `companyId` is extracted **strictly** from `req.auth.companyId`.
- Never accepted from request bodies, URL params, or query parameters.
- Every database query, aggregation match stage, create, update, and delete operation is scoped:
  ```javascript
  { _id: recordId, companyId: req.auth.companyId }
  ```
- Cross-tenant access attempts return `404 Not Found` (preventing tenant existence leakage).

---

## 4. Money Storage & Precision Strategy (`utils/money.js`)
- Floating-point calculations are avoided for critical sums and balances.
- All documents preserve:
  - `amount` / `totalAmount`: Original transaction value.
  - `currency`: Original 3-letter currency code (`BDT`, `USD`, `EUR`, `GBP`).
  - `normalizedAmount` / `normalizedTotalAmount`: Converted value in company normalization currency (`BDT`).
  - `exchangeRateSnapshot`: Exchange rate at transaction creation time.
- Changes to company display currency or exchange rates **never** rewrite historical records.

---

## 5. Collections & Mongoose Schemas

### 5.1 `CurrencySetting` (Collection: `currencysettings`)
| Field | Type | Required | Description |
|---|---|---|---|
| `companyId` | String | Yes | Unique index per company |
| `baseCurrency` | String | Yes | Anchor currency (Default: `BDT`) |
| `displayCurrency` | String | Yes | UI display preference (Default: `BDT`) |
| `normalizationCurrency` | String | Yes | Fixed internal normalization (Default: `BDT`) |
| `exchangeRates` | Map/Object | Yes | Relative rates (`BDT: 1.0, USD: 0.0082, EUR: 0.0070, GBP: 0.0060`) |
| `rateUpdatedAt` | Date | Yes | Timestamp of rate updates |
| `createdBy` | String | No | User ID who updated settings |

### 5.2 `OperationalBudget` (Collection: `operationalbudgets`)
| Field | Type | Required | Description |
|---|---|---|---|
| `companyId` | String | Yes | Tenant company identifier |
| `name` | String | Yes | Budget line item name |
| `category` | String | Yes | Enum: `Factory Wages`, `Transportation`, `Utilities`, `Management Payroll`, `Rent`, `Maintenance`, `Other` |
| `monthlyAmount` | Number | Yes | Monthly allocated amount (>= 0) |
| `currency` | String | Yes | Currency code (Default: `BDT`) |
| `normalizedMonthlyAmount` | Number | Yes | Value converted to BDT snapshot |
| `exchangeRateSnapshot` | Number | Yes | Exchange rate applied at creation |
| `dueDay` | Number | Yes | Day of the month due (1–31) |
| `startDate` | Date | Yes | Budget activation start date |
| `endDate` | Date | No | Optional end date (must be >= startDate) |
| `isActive` | Boolean | Yes | Active budget flag (Default: `true`) |
| `notes` | String | No | Optional remarks |
| `createdBy` | String | Yes | User ID from `req.auth.userId` |

### 5.3 `Expense` (Collection: `expenses`)
| Field | Type | Required | Description |
|---|---|---|---|
| `companyId` | String | Yes | Tenant company identifier |
| `title` | String | Yes | Expense title |
| `description` | String | No | Description / context |
| `category` | String | Yes | Enum: `Transport`, `Salary`, `Utilities`, `Maintenance`, `Raw Materials`, `Office`, `Rent`, `Other` |
| `amount` | Number | Yes | Expense amount (>= 0) |
| `currency` | String | Yes | Currency code (Default: `BDT`) |
| `normalizedAmount` | Number | Yes | Converted to BDT snapshot |
| `exchangeRateSnapshot` | Number | Yes | Rate snapshot |
| `expenseDate` | Date | Yes | Date incurred |
| `createdBy` | String | Yes | User ID |
| `createdByRole` | String | No | User role snapshot |

### 5.4 `AccountPayable` (Collection: `accountpayables`)
| Field | Type | Required | Description |
|---|---|---|---|
| `companyId` | String | Yes | Tenant company identifier |
| `supplierName` | String | Yes | Supplier name |
| `supplierId` | String | No | Optional Module 2 link |
| `purchaseOrderNumber` | String | No | Optional PO reference |
| `purchaseOrderId` | String | No | Optional Module 2 link |
| `invoiceNumber` | String | Yes | Unique invoice number per company |
| `totalAmount` | Number | Yes | Invoice total (> 0) |
| `paidAmount` | Number | Yes | Cumulative paid amount (Default: 0) |
| `outstandingAmount` | Number | Yes | Calculated: `totalAmount - paidAmount` |
| `currency` | String | Yes | Currency code (Default: `BDT`) |
| `normalizedTotalAmount` | Number | Yes | Total in BDT |
| `normalizedPaidAmount` | Number | Yes | Paid in BDT |
| `normalizedOutstandingAmount` | Number | Yes | Outstanding in BDT |
| `issueDate` | Date | Yes | Invoice issue date |
| `dueDate` | Date | Yes | Payment due date |
| `paymentTerms` | String | No | e.g. "Net 30" |
| `status` | String | Yes | `Unpaid`, `Partially Paid`, `Paid`, `Overdue` |
| `agingGroup` | String | Yes | `Not Due`, `1–30 Days Overdue`, `31–60 Days Overdue`, `61–90 Days Overdue`, `90+ Days Overdue`, `Paid` |
| `paymentHistory` | Array | Yes | Payment subdocuments with atomic update locks |

### 5.5 `ConsumptionRecord` (Collection: `consumptionrecords`)
| Field | Type | Required | Description |
|---|---|---|---|
| `companyId` | String | Yes | Tenant company identifier |
| `materialName` | String | Yes | Material name |
| `quantity` | Number | Yes | Quantity consumed |
| `unit` | String | Yes | e.g. "kg", "meters" |
| `unitCost` | Number | Yes | Cost per unit |
| `totalCost` | Number | Yes | Total cost |
| `currency` | String | Yes | Currency code |
| `normalizedTotalCost` | Number | Yes | Total cost in BDT |
| `consumedAt` | Date | Yes | Date consumed |
| `source` | String | Yes | "module3_demo" (swappable to Module 2) |

---

## 6. API Endpoints Reference

All endpoints are prefixed with `/api/finance`.

### 6.1 Dashboard
- `GET /api/finance/dashboard`
  - Permission: `finance.read`
  - Query: `?currency=`
  - Returns: `{ monthlyBudget, monthlyExpense, outstandingPayable, overduePayable, recentExpenses, upcomingPayments, spendingTrend, categoryBreakdown, displayCurrency }`

### 6.2 Multi-Currency (REQ-3.1)
- `GET /api/finance/currency`
  - Permission: `finance.read`
- `PUT /api/finance/currency`
  - Permission: `finance.update`
  - Body: `{ displayCurrency?: "USD", exchangeRates?: { USD: 0.0090 } }`

### 6.3 Operational Budgets (REQ-3.2)
- `GET /api/finance/budgets/summary`
  - Permission: `finance.read`
  - Returns: `{ totalMonthlyBudget, currency, activeBudgetCount, categoryTotals }`
- `GET /api/finance/budgets`
  - Permission: `finance.read`
  - Query: `category`, `isActive`, `page`, `pageSize`
- `POST /api/finance/budgets`
  - Permission: `finance.create`
  - Body: `{ name, category, monthlyAmount, currency, dueDay, startDate, endDate?, notes? }`
- `GET /api/finance/budgets/:budgetId`
  - Permission: `finance.read`
- `PATCH /api/finance/budgets/:budgetId`
  - Permission: `finance.update`
- `DELETE /api/finance/budgets/:budgetId`
  - Permission: `finance.delete`

### 6.4 Comprehensive Expenses (REQ-3.4)
- `GET /api/finance/expenses/summary`
  - Permission: `finance.read`
  - Query: Filters matching `GET /expenses`
  - Returns: `{ totalAmount, count, averageAmount, categoryBreakdown }`
- `GET /api/finance/expenses`
  - Permission: `finance.read`
  - Query: `month`, `year`, `category`, `createdByRole`, `startDate`, `endDate`, `search`, `page`, `pageSize`, `sortBy`, `sortOrder`
- `POST /api/finance/expenses`
  - Permission: `finance.create`
  - Body: `{ title, description?, category, amount, currency, expenseDate?, notes? }`
- `GET /api/finance/expenses/:expenseId`
  - Permission: `finance.read`
- `PATCH /api/finance/expenses/:expenseId`
  - Permission: `finance.update`
- `DELETE /api/finance/expenses/:expenseId`
  - Permission: `finance.delete`

### 6.5 Accounts Payable & Aging (REQ-3.3)
- `GET /api/finance/payables/aging`
  - Permission: `finance.read`
  - Returns: `{ totalOutstanding, totalOverdue, currency, buckets: { "Not Due", "1–30 Days Overdue", "31–60 Days Overdue", "61–90 Days Overdue", "90+ Days Overdue", "Paid" } }`
- `GET /api/finance/payables`
  - Permission: `finance.read`
  - Query: `supplierName`, `status`, `agingGroup`, `startDate`, `endDate`, `page`, `pageSize`
- `POST /api/finance/payables`
  - Permission: `finance.create`
  - Body: `{ supplierName, invoiceNumber, totalAmount, currency, issueDate, dueDate, paymentTerms?, notes? }`
- `GET /api/finance/payables/:payableId`
  - Permission: `finance.read`
- `PATCH /api/finance/payables/:payableId`
  - Permission: `finance.update`
- `DELETE /api/finance/payables/:payableId`
  - Permission: `finance.delete`
- `POST /api/finance/payables/:payableId/payments`
  - Permission: `finance.update`
  - Body: `{ amount, paymentDate?, paymentMethod?, reference?, notes? }`

### 6.6 Visual Consumption & Analytics (REQ-3.5)
- `GET /api/finance/analytics/spending-trend`
  - Query: `startDate`, `endDate`, `groupBy` (`month`|`day`|`year`), `currency`
- `GET /api/finance/analytics/category-breakdown`
  - Query: `startDate`, `endDate`, `currency`
- `GET /api/finance/analytics/consumption-trend`
  - Query: `startDate`, `endDate`, `materialId`, `currency`
- `GET /api/finance/consumption-records` (Demo provider)
- `POST /api/finance/consumption-records` (Demo provider)

---

## 7. Execution Commands

### Development Server
```bash
cd backend
npm install
npm run dev
```

### Run Seed Data (Safe Idempotent Dev Seeder)
```bash
npm run seed:finance
```

### Run Automated Tests
```bash
npm run test
```
