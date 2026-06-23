from fastapi import APIRouter
from app.api.endpoints import (
    auth,
    bookings,
    maps,
    regulations,
    documents,
    comparisons,
    dashboard,
    notifications,
    copilot,
    reports,
    audit_logs,
    ai_endpoints,
    offline_readiness
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(bookings.router)
api_router.include_router(maps.router)

api_router.include_router(regulations.router)
api_router.include_router(documents.router)
api_router.include_router(comparisons.router)
api_router.include_router(dashboard.router)
api_router.include_router(notifications.router)
api_router.include_router(copilot.router)
api_router.include_router(reports.router)
api_router.include_router(audit_logs.router)
api_router.include_router(ai_endpoints.router)
api_router.include_router(offline_readiness.router)
