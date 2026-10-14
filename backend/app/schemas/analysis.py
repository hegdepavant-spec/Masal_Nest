"""Pydantic schemas for lead analysis."""

from datetime import datetime

from pydantic import BaseModel, Field


class LeadAnalysisResult(BaseModel):
    """Structured output expected from the Lead Intelligence Agent.
    Used both as the parsing target for AI output and as the API response model.
    """

    summary: str = Field(description="2-3 sentence lead summary")
    customer_intent: str = Field(description="buying | exploring | investing | renting | unclear")
    key_requirements: list[str] = Field(default_factory=list, description="Explicitly stated requirements")
    inferred_requirements: list[str] = Field(default_factory=list, description="Reasonable inferences")
    objections: list[str] = Field(default_factory=list, description="Concerns or blockers mentioned")
    missing_info: list[str] = Field(default_factory=list, description="Critical unknown information")
    recommended_action: str = Field(description="Next best step for the salesperson")
    suggested_response: str = Field(description="Personalized message draft for the customer")
    urgency_signals: list[str] = Field(default_factory=list, description="Evidence of urgency")
    readiness_signals: list[str] = Field(default_factory=list, description="Evidence of buying readiness")


class AnalysisResponse(BaseModel):
    """API response for a lead analysis."""

    id: str
    lead_id: str
    summary: str | None
    customer_intent: str | None
    key_requirements: list[str]
    inferred_requirements: list[str]
    objections: list[str]
    missing_info: list[str]
    recommended_action: str | None
    suggested_response: str | None
    urgency_signals: list[str]
    readiness_signals: list[str]
    score_explanation: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
