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

## Not yet implemented
Operational budgets, expenses, accounts payable, consumption records,
analytics, dashboard, seed data, RBAC permission gating, automated tests.

## Open questions for Module 1 owner
1. Real attribute names on the object returned by `get_current_context`.
2. How to declare a required permission on a route (decorator? dependency?
   what's the exact import and usage pattern?).
3. Exact `init_beanie(...)` call location in `app/core/database.py`, so
   `CurrencySetting` can be registered correctly.
