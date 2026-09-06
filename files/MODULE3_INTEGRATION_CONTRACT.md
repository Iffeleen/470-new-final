# Module 3 Integration Contract

Living document. Updated as each finance feature is built. This is what
whoever merges Module 3 into the combined backend will read first.

## Scope
Module 3 implements: Multi-Currency Support, Operational Budget Mapping,
Accounts Payable Aging Ledger, Comprehensive Expense Cycle Filtering,
Visual Consumption Trend Charts. Nothing else.

## Dependency on Module 1
- Tenant/company isolation field: `tenant_id` (per Module 1's `TenantOwnedDocument`)
- Auth context dependency: `app.core.dependencies.get_current_context`
  - Wrapped by `app.modules.finance.deps.get_finance_context` — if Module 1's
    real context shape differs from the assumption below, only `deps.py`
    needs to change.
  - **Assumed shape:** `context.tenant_id: str`, `context.user_id: str`,
    `context.role: str` — **not yet verified against real Module 1 code.**
- Route registration (added to `main.py` once, never touched again):
  ```python
  from app.modules.finance.router import router as finance_router
  app.include_router(finance_router)
  ```
- Beanie model registration: `CurrencySetting` must be added to the
  `document_models` list passed to `init_beanie(...)` in
  `app/core/database.py`.

## Route prefix
All Module 3 routes live under `/api/finance`.

## Implemented so far

### Feature 3.1 — Multi-Currency Support
| Method | Route | Auth | Request | Response |
|---|---|---|---|---|
| GET | /api/finance/currency | any authenticated user | — | `CurrencySettingOut` |
| PUT | /api/finance/currency | any authenticated user (permission TBD) | `CurrencySettingUpdate` (partial) | `CurrencySettingOut` |

**Model:** `CurrencySetting` (collection `currency_settings`)
- `tenant_id: str` (unique index — one setting per tenant)
- `base_currency: str` (default `"BDT"`, immutable after creation)
- `display_currency: str` (default `"BDT"`)
- `exchange_rates: dict[str, float]` (relative to BDT = 1.0)
- `updated_at: datetime`

Supported currencies: `BDT`, `USD`, `EUR`, `GBP`. Rates are demonstration
values, not live — no external API call is made.

**Not yet implemented:** RBAC permission check on `PUT /currency`
(currently any authenticated user can update it — will gate behind
`finance.update` once Module 1's permission-checking dependency shape is
confirmed).

### Feature 3.2 — Operational Budget Mapping
| Method | Route | Auth | Request | Response |
|---|---|---|---|---|
| POST | /api/finance/budgets | any authenticated user (permission TBD) | `OperationalBudgetCreate` | `OperationalBudgetOut` (201) |
| GET | /api/finance/budgets | any authenticated user | query: `category?`, `is_active?` | `list[OperationalBudgetOut]` |
| GET | /api/finance/budgets/summary | any authenticated user | — | `BudgetSummaryOut` |
| PATCH | /api/finance/budgets/{budget_id} | any authenticated user (permission TBD) | `OperationalBudgetUpdate` (partial) | `OperationalBudgetOut` |
| DELETE | /api/finance/budgets/{budget_id} | any authenticated user (permission TBD) | — | 204 No Content |

**Model:** `OperationalBudget` (collection `operational_budgets`)
- `tenant_id: str`
- `name: str`
- `category: BudgetCategory` enum — Factory Wages, Transportation, Utilities,
  Management Payroll, Rent, Maintenance, Other
- `monthly_amount: float` (must be ≥ 0)
- `currency: str` (default `"BDT"`)
- `due_day: int` (1–31)
- `start_date: date`, `end_date: date | None` (end must be ≥ start)
- `is_active: bool` (default `True`)
- `notes: str | None`
- `created_by: str` — populated from `context.user_id`, never from the
  request body
- `created_at`, `updated_at: datetime`

**Summary logic:** `BudgetSummaryOut.total_monthly_budget` sums
`monthly_amount` across active budgets only. `category_totals` breaks that
same sum down per category. Currency conversion is **not** applied yet —
the summary currently just reports whatever currency the first active
budget happens to use; this needs revisiting once mixed-currency budgets
are common (see Open Questions).

**404 handling:** `get_budget`/`update_budget`/`delete_budget` raise
`BudgetNotFoundError` when the doc doesn't exist *or* belongs to another
tenant — routers translate this to a generic 404, so a cross-tenant probe
gets the same response as a nonexistent ID (no tenant-existence leak).

**Not yet implemented:** RBAC permission checks on the three mutating
routes (currently any authenticated user in the tenant can create/edit/
delete budgets — will gate behind `finance.create` / `finance.update` /
`finance.delete` once Module 1's permission dependency shape is confirmed).

## Not yet implemented
Expenses, accounts payable, consumption records, analytics, dashboard,
seed data, RBAC permission gating, automated tests.

## Open questions for Module 1 owner
1. Real attribute names on the object returned by `get_current_context`.
2. How to declare a required permission on a route (decorator? dependency?
   what's the exact import and usage pattern?).
3. Exact `init_beanie(...)` call location in `app/core/database.py`, so
   `CurrencySetting` and `OperationalBudget` can be registered correctly.
4. Whether `context.role` alone is enough to decide "can filter by
   `created_by_role`" for the upcoming Expense feature, or whether that
   needs a lookup against Module 1's user directory.
