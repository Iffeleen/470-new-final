"""
Module 3 (Finance) API router. All routes live under /api/finance.
Only currency endpoints exist so far — budgets, expenses, payables,
consumption, and analytics routes get added incrementally.
"""
from fastapi import APIRouter, Depends

from app.modules.finance.currency_service import (
    get_or_create_currency_setting,
    update_currency_setting,
)
from app.modules.finance.deps import get_finance_context
from app.modules.finance.schemas import CurrencySettingOut, CurrencySettingUpdate

router = APIRouter(prefix="/api/finance", tags=["finance"])


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
