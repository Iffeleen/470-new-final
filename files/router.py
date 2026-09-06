"""
Module 3 (Finance) API router. All routes live under /api/finance.
Currency (3.1) and Operational Budgets (3.2) exist so far — expenses,
payables, consumption, and analytics routes get added incrementally.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.finance.budget_service import (
    BudgetNotFoundError,
    create_budget,
    delete_budget,
    get_budget_summary,
    list_budgets,
    update_budget,
)
from app.modules.finance.currency_service import (
    get_or_create_currency_setting,
    update_currency_setting,
)
from app.modules.finance.deps import get_finance_context
from app.modules.finance.models import BudgetCategory
from app.modules.finance.schemas import (
    BudgetSummaryOut,
    CurrencySettingOut,
    CurrencySettingUpdate,
    OperationalBudgetCreate,
    OperationalBudgetOut,
    OperationalBudgetUpdate,
)

router = APIRouter(prefix="/api/finance", tags=["finance"])


def _budget_to_out(budget) -> OperationalBudgetOut:
    return OperationalBudgetOut(
        id=str(budget.id),
        name=budget.name,
        category=budget.category,
        monthly_amount=budget.monthly_amount,
        currency=budget.currency,
        due_day=budget.due_day,
        start_date=budget.start_date,
        end_date=budget.end_date,
        is_active=budget.is_active,
        notes=budget.notes,
        created_by=budget.created_by,
        created_at=budget.created_at,
        updated_at=budget.updated_at,
    )


@router.get("/currency", response_model=CurrencySettingOut)
async def read_currency_setting(context=Depends(get_finance_context)):
    setting = await get_or_create_currency_setting(context.tenant_id)
    return CurrencySettingOut(
        base_currency=setting.base_currency,
        display_currency=setting.display_currency,
        exchange_rates=setting.exchange_rates,
    )


@router.put("/currency", response_model=CurrencySettingOut)
async def update_currency(
    payload: CurrencySettingUpdate, context=Depends(get_finance_context)
):
    setting = await update_currency_setting(
        context.tenant_id, payload.model_dump(exclude_unset=True)
    )
    return CurrencySettingOut(
        base_currency=setting.base_currency,
        display_currency=setting.display_currency,
        exchange_rates=setting.exchange_rates,
    )


# ---------------------------------------------------------------------------
# Feature 3.2 — Operational Budget Mapping
# ---------------------------------------------------------------------------
# NOTE: /budgets/summary is declared before /budgets/{budget_id} so FastAPI
# doesn't try to parse "summary" as a budget_id.

@router.post(
    "/budgets",
    response_model=OperationalBudgetOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_operational_budget(
    payload: OperationalBudgetCreate, context=Depends(get_finance_context)
):
    budget = await create_budget(
        tenant_id=context.tenant_id,
        created_by=context.user_id,
        data=payload.model_dump(),
    )
    return _budget_to_out(budget)


@router.get("/budgets", response_model=list[OperationalBudgetOut])
async def get_operational_budgets(
    category: Optional[BudgetCategory] = None,
    is_active: Optional[bool] = None,
    context=Depends(get_finance_context),
):
    budgets = await list_budgets(
        tenant_id=context.tenant_id, category=category, is_active=is_active
    )
    return [_budget_to_out(b) for b in budgets]


@router.get("/budgets/summary", response_model=BudgetSummaryOut)
async def get_operational_budget_summary(context=Depends(get_finance_context)):
    summary = await get_budget_summary(context.tenant_id)
    return BudgetSummaryOut(**summary)


@router.patch("/budgets/{budget_id}", response_model=OperationalBudgetOut)
async def patch_operational_budget(
    budget_id: str,
    payload: OperationalBudgetUpdate,
    context=Depends(get_finance_context),
):
    try:
        budget = await update_budget(
            tenant_id=context.tenant_id,
            budget_id=budget_id,
            update_data=payload.model_dump(exclude_unset=True),
        )
    except BudgetNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    return _budget_to_out(budget)


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_operational_budget(
    budget_id: str, context=Depends(get_finance_context)
):
    try:
        await delete_budget(tenant_id=context.tenant_id, budget_id=budget_id)
    except BudgetNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
