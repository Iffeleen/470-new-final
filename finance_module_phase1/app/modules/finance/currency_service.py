"""
Currency business logic: get-or-create per-tenant settings, updates,
conversion, and formatting.

Changing a tenant's display currency or exchange rates must never rewrite
historical amounts on Expense/Budget/Payable records — those store their
own normalized snapshot at creation time (added in later features).
"""
from typing import Any, Dict

from app.modules.finance.models import CurrencySetting, DEFAULT_EXCHANGE_RATES

CURRENCY_SYMBOLS = {"BDT": "৳", "USD": "$", "EUR": "€", "GBP": "£"}


async def get_or_create_currency_setting(tenant_id: str) -> CurrencySetting:
    setting = await CurrencySetting.find_one(CurrencySetting.tenant_id == tenant_id)
    if setting is None:
        setting = CurrencySetting(
            tenant_id=tenant_id,
            base_currency="BDT",
            display_currency="BDT",
            exchange_rates=dict(DEFAULT_EXCHANGE_RATES),
        )
        await setting.insert()
    return setting


async def update_currency_setting(
    tenant_id: str, update_data: Dict[str, Any]
) -> CurrencySetting:
    setting = await get_or_create_currency_setting(tenant_id)

    display_currency = update_data.get("display_currency")
    if display_currency is not None:
        setting.display_currency = display_currency

    exchange_rates = update_data.get("exchange_rates")
    if exchange_rates is not None:
        setting.exchange_rates.update(exchange_rates)

    await setting.save()
    return setting


def convert_amount(
    amount: float, from_currency: str, to_currency: str, rates: Dict[str, float]
) -> float:
    """Convert amount between currencies. Rates are relative to BDT (BDT=1.0)."""
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()
    if from_currency == to_currency:
        return amount
    if from_currency not in rates or to_currency not in rates:
        raise ValueError("Unknown currency in conversion")
    amount_in_bdt = amount / rates[from_currency]
    return amount_in_bdt * rates[to_currency]


def format_currency(amount: float, currency: str) -> str:
    symbol = CURRENCY_SYMBOLS.get(currency.upper(), currency.upper() + " ")
    return f"{symbol}{amount:,.2f}"
