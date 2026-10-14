"""Pydantic schemas for dashboard metrics."""

from pydantic import BaseModel


class DashboardMetrics(BaseModel):
    """Aggregated dashboard statistics."""

    total_leads: int = 0
    hot_leads: int = 0
    warm_leads: int = 0
    cold_leads: int = 0
    unscored_leads: int = 0
    pending_tasks: int = 0
    overdue_tasks: int = 0
    completed_tasks: int = 0
