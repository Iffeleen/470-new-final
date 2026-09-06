"""
Beanie documents for Module 3 (Finance).

All models inherit from Module 1's TenantOwnedDocument, which is assumed to
provide: tenant_id (str), created_at, updated_at, and the
find_for_tenant()/get_for_tenant() query helpers described in the README.

Only CurrencySetting is implemented so far (Feature 3.1). Budget, Expense,
AccountPayable, and ConsumptionRecord models will be added as we build
each feature.
"""
from datetime import datetime, timezone
from typing import Dict

from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.base import TenantOwnedDocument

DEFAULT_EXCHANGE_RATES: Dict[str, float] = {
    "BDT": 1.0,
    "USD": 0.0082,
    "EUR": 0.0070,
    "GBP": 0.0060,
}


class CurrencySetting(TenantOwnedDocument):
    base_currency: str = Field(default="BDT")
    display_currency: str = Field(default="BDT")
    # Rates are expressed relative to BDT (BDT is always 1.0).
    exchange_rates: Dict[str, float] = Field(
        default_factory=lambda: dict(DEFAULT_EXCHANGE_RATES)
    )
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "currency_settings"
        # One currency setting per tenant, enforced at the DB level.
        indexes = [
            IndexModel([("tenant_id", ASCENDING)], unique=True),
        ]
