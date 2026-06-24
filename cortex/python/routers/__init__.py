"""Cortex HTTP routers.

Phase 2 of the backend plan decomposes the cortex.py monolith into cohesive
APIRouter modules. Each router imports only fastapi/pydantic, the shared
`state` module, and stdlib — never cortex.py — so there is no circular import.
"""
