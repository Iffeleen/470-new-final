"""
Pydantic schemas for Module 3 request/response bodies.

Implemented so far: currency (3.1), operational budgets (3.2).
Expense, payable, and consumption schemas get added alongside their
respective features.
"""
from datetime import date, datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.modules.finance.models import BudgetCategory

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


# ---------------------------------------------------------------------------
# Feature 3.2 — Operational Budget Mapping
# ---------------------------------------------------------------------------

class OperationalBudgetCreate(BaseModel):
    name: str
    category: BudgetCategory
    monthly_amount: float
    currency: str = "BDT"
    due_day: int = Field(ge=1, le=31)
    start_date: date
    end_date: Optional[date] = None
    is_active: bool = True
    notes: Optional[str] = None

    @field_validator("monthly_amount")
    @classmethod
    def _amount_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("monthly_amount cannot be negative")
        return v

    @field_validator("name")
    @classmethod
    def _name_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name is required")
        return v.strip()

    @field_validator("currency")
    @classmethod
    def _currency_supported(cls, v: str) -> str:
        v = v.upper()
        if v not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency: {v}")
        return v

    @model_validator(mode="after")
    def _end_after_start(self):
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class OperationalBudgetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[BudgetCategory] = None
    monthly_amount: Optional[float] = None
    currency: Optional[str] = None
    due_day: Optional[int] = Field(default=None, ge=1, le=31)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

    @field_validator("monthly_amount")
    @classmethod
    def _amount_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("monthly_amount cannot be negative")
        return v

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name cannot be blank")
        return v.strip() if v else v

    @field_validator("currency")
    @classmethod
    def _currency_supported(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.upper()
        if v not in SUPPORTED_CURRENCIES:
            raise ValueError(f"Unsupported currency: {v}")
        return v


class OperationalBudgetOut(BaseModel):
    id: str
    name: str
    category: BudgetCategory
    monthly_amount: float
    currency: str
    due_day: int
    start_date: date
    end_date: Optional[date] = None
    is_active: bool
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime


class BudgetSummaryOut(BaseModel):
    total_monthly_budget: float
    currency: str
    active_budget_count: int
    category_totals: Dict[str, float]
