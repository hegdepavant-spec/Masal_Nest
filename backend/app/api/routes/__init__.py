"""API routes package."""

from fastapi import APIRouter

from app.api.routes.leads import router as leads_router
from app.api.routes.chat import router as chat_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.dashboard import router as dashboard_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(leads_router)
api_router.include_router(chat_router)
api_router.include_router(tasks_router)
api_router.include_router(dashboard_router)
