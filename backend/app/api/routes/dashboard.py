"""Dashboard API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.repositories.lead_repo import LeadRepository
from app.schemas.dashboard import DashboardMetrics
from app.services.followup_service import FollowupService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    """Retrieve aggregated dashboard statistics for leads and follow-up tasks."""
    lead_repo = LeadRepository(db)
    followup_service = FollowupService(db)

    total_leads = await lead_repo.count()
    category_counts = await lead_repo.count_by_category()
    task_metrics = await followup_service.get_task_metrics()

    return DashboardMetrics(
        total_leads=total_leads,
        hot_leads=category_counts.get("hot", 0),
        warm_leads=category_counts.get("warm", 0),
        cold_leads=category_counts.get("cold", 0),
        unscored_leads=category_counts.get("unscored", 0),
        pending_tasks=task_metrics.get("pending", 0),
        overdue_tasks=task_metrics.get("overdue", 0),
        due_today_tasks=task_metrics.get("due_today", 0),
        completed_tasks=task_metrics.get("completed", 0),
    )
