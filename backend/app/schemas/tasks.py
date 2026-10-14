"""Pydantic schemas for follow-up tasks."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    """Request body for creating a follow-up task."""

    lead_id: str = Field(..., description="ID of the associated lead")
    title: str = Field(..., min_length=1, max_length=255, description="Task title")
    description: str | None = Field(None, max_length=2000)
    action_type: Literal["call", "email", "site_visit", "document", "other"] = "other"
    due_date: date | None = None
    created_by: Literal["user", "ai"] = "user"


class TaskUpdate(BaseModel):
    """Request body for updating a follow-up task."""

    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    action_type: Literal["call", "email", "site_visit", "document", "other"] | None = None
    status: Literal["pending", "in_progress", "completed", "cancelled"] | None = None
    due_date: date | None = None


class TaskResponse(BaseModel):
    """API response for a follow-up task."""

    id: str
    lead_id: str
    lead_name: str | None = None
    title: str
    description: str | None
    action_type: str
    status: str
    due_date: date | None
    completed_at: date | None
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
