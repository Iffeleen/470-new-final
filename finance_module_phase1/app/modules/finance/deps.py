"""
Compatibility layer between Module 1's auth/tenant context and Module 3.

Every Module 3 route depends on `get_finance_context`, NOT on Module 1's
`get_current_context` directly. If Module 1's real context object uses
different attribute names (e.g. `company_id` instead of `tenant_id`, or
`ctx.user.id` instead of `ctx.user_id`), fix it ONLY here — nothing else
in the finance module needs to change.

ASSUMPTION (to verify once you share app/core/dependencies.py):
    context.tenant_id   -> str, the authenticated user's tenant/company id
    context.user_id     -> str, the authenticated user's id
    context.role        -> str, optional, the user's role name
"""
from fastapi import Depends

from app.core.dependencies import get_current_context


async def get_finance_context(context=Depends(get_current_context)):
    # Thin passthrough for now. If attribute names differ, normalize them
    # here instead of touching every service/router in this module.
    return context
