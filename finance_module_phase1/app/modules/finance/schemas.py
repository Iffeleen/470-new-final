"""
Pydantic schemas for Module 3 request/response bodies.

Only currency schemas exist so far — budget, expense, payable, and
consumption schemas get added alongside their respective features.
"""
from typing import Dict, Optional

from pydantic import BaseModel, field_validator

SUPPORTED_CURRENCIES = {"BDT", "USD", "EUR", "GBP"}


class CurrencySettingOut(BaseModel):
    base_currency: str
    display_currency: str
    exchange_rates: Dict[str, float]


class CurrencySettingUpdate(BaseModel):
    display_currency: Optional[str] = None
    exchange_rates: Optional[Dict[str, float]] = None

    @field_validator("display_currency")
    @classmethod
    def _validate_display_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.upper()
        if v not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency: {v}")
        return v

    @field_validator("exchange_rates")
    @classmethod
    def _validate_exchange_rates(
        cls, v: Optional[Dict[str, float]]
    ) -> Optional[Dict[str, float]]:
        if v is None:
            return v
        cleaned: Dict[str, float] = {}
        for code, rate in v.items():
            code_upper = code.upper()
            if code_upper not in SUPPORTED_CURRENCIES:
                raise ValueError(f"Unsupported currency in exchange_rates: {code}")
            if rate <= 0:
                raise ValueError(f"Exchange rate for {code_upper} must be positive")
            cleaned[code_upper] = rate
        return cleaned
