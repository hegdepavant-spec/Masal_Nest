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
    normalized_timeline: str | None = None
    latest_analysis: "AnalysisResponse | None" = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadDetailResponse(LeadResponse):
    """Response schema for a lead detail view, includes latest analysis and tasks."""

    tasks: list["TaskResponse"] = []


class InteractionExtractRequest(BaseModel):
    """Request to extract updates and next steps from call interaction notes."""

    outcome: str = Field(..., max_length=50, description="Call outcome")
    notes: str = Field(..., min_length=1, max_length=5000, description="Interaction notes")


class ProposedLeadUpdates(BaseModel):
    """Extracted lead profile fields proposed for salesperson review."""

    location: str | None = None
    budget: str | None = None
    buying_timeline: str | None = None
    property_requirement: str | None = None
    followup_status: str | None = None


class SuggestedTask(BaseModel):
    """Extracted follow-up task proposed for salesperson review."""

    title: str = Field(..., max_length=255)
    action_type: str = Field("call", max_length=20)
    due_in_days: int = Field(1, ge=0, le=90)
    description: str | None = None


class InteractionExtractResponse(BaseModel):
    """Structured extraction output returned to salesperson for review before committing."""

    proposed_updates: ProposedLeadUpdates
    suggested_task: SuggestedTask | None = None
    summary: str


# Forward references resolved at end of module
from app.schemas.analysis import AnalysisResponse  # noqa: E402
from app.schemas.tasks import TaskResponse  # noqa: E402

LeadResponse.model_rebuild()
LeadDetailResponse.model_rebuild()

