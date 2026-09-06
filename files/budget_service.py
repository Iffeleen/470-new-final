"""
Operational budget business logic: CRUD scoped to tenant, plus the
monthly-total summary used on the finance dashboard.

Every read/update/delete here re-checks tenant_id on the fetched document,
even though the query itself already filters by tenant_id — this guards
against a caller accidentally passing a raw ObjectId without going through
the tenant-scoped finder first.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId
from beanie.operators import In

from app.modules.finance.models import BudgetCategory, OperationalBudget


class BudgetNotFoundError(Exception):
    pass


async def create_budget(
    tenant_id: str, created_by: str, data: Dict[str, Any]
) -> OperationalBudget:
    budget = OperationalBudget(tenant_id=tenant_id, created_by=created_by, **data)
    await budget.insert()
    return budget


async def list_budgets(
    tenant_id: str,
    category: Optional[BudgetCategory] = None,
    is_active: Optional[bool] = None,
) -> List[OperationalBudget]:
    query = OperationalBudget.find(OperationalBudget.tenant_id == tenant_id)
    if category is not None:
        query = query.find(OperationalBudget.category == category)
    if is_active is not None:
        query = query.find(OperationalBudget.is_active == is_active)
    return await query.sort(-OperationalBudget.created_at).to_list()


async def get_budget(tenant_id: str, budget_id: str) -> OperationalBudget:
    budget = await OperationalBudget.get(PydanticObjectId(budget_id))
    if budget is None or budget.tenant_id != tenant_id:
        raise BudgetNotFoundError(budget_id)
    return budget


async def update_budget(
    tenant_id: str, budget_id: str, update_data: Dict[str, Any]
) -> OperationalBudget:
    budget = await get_budget(tenant_id, budget_id)
    for field, value in update_data.items():
        setattr(budget, field, value)
    budget.updated_at = datetime.now(timezone.utc)
    await budget.save()
    return budget


async def delete_budget(tenant_id: str, budget_id: str) -> None:
    budget = await get_budget(tenant_id, budget_id)
    await budget.delete()


async def get_budget_summary(tenant_id: str) -> Dict[str, Any]:
    active_budgets = await list_budgets(tenant_id, is_active=True)

    total_monthly_budget = sum(b.monthly_amount for b in active_budgets)

    category_totals: Dict[str, float] = {}
    for b in active_budgets:
        key = b.category.value if isinstance(b.category, BudgetCategory) else b.category
        category_totals[key] = category_totals.get(key, 0.0) + b.monthly_amount

    # All active budgets are assumed to share the tenant's base currency by
    # this point (currency normalization happens at write time). Fall back
    # to BDT if there are no active budgets to read a currency from.
    currency = active_budgets[0].currency if active_budgets else "BDT"

    return {
        "total_monthly_budget": total_monthly_budget,
        "currency": currency,
        "active_budget_count": len(active_budgets),
        "category_totals": category_totals,
    }
