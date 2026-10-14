"""Pydantic schemas for Lead API requests and responses."""

from datetime import datetime

from pydantic import BaseModel, Field


class LeadCreate(BaseModel):
    """Request body for creating a new lead."""

    customer_name: str = Field(..., min_length=1, max_length=255, description="Customer full name")
    location: str | None = Field(None, max_length=255, description="Preferred property location")
    property_requirement: str | None = Field(None, max_length=2000, description="Property type and requirements")
    budget: str | None = Field(None, max_length=100, description="Budget range, e.g. '50L-80L' or '$200k-$350k'")
    buying_timeline: str | None = Field(None, max_length=100, description="When they want to buy, e.g. '3 months'")
    customer_message: str | None = Field(None, max_length=5000, description="Free-text customer message or inquiry")


class LeadUpdate(BaseModel):
    """Request body for updating a lead. All fields optional."""

    customer_name: str | None = Field(None, min_length=1, max_length=255)
    location: str | None = Field(None, max_length=255)
    property_requirement: str | None = Field(None, max_length=2000)
    budget: str | None = Field(None, max_length=100)
    buying_timeline: str | None = Field(None, max_length=100)
    customer_message: str | None = Field(None, max_length=5000)
    followup_status: str | None = Field(None, max_length=20)


class LeadResponse(BaseModel):
    """Response schema for a lead (list view)."""

    id: str
    customer_name: str
    location: str | None
    property_requirement: str | None
    budget: str | None
    buying_timeline: str | None
    customer_message: str | None
    priority_score: int | None
    priority_category: str | None
    followup_status: str
    analysis_stale: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadDetailResponse(LeadResponse):
    """Response schema for a lead detail view, includes latest analysis and tasks."""

    latest_analysis: "AnalysisResponse | None" = None
    tasks: list["TaskResponse"] = []


# Forward references resolved at end of module
from app.schemas.analysis import AnalysisResponse  # noqa: E402
from app.schemas.tasks import TaskResponse  # noqa: E402

LeadDetailResponse.model_rebuild()
