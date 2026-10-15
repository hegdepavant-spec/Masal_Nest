"""Pydantic schemas for lead analysis."""

from datetime import datetime

from pydantic import BaseModel, Field


from app.services.timeline_service import TimelineInfo


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
    hard_constraints: list[str] = Field(default_factory=list, description="Non-negotiable customer constraints (e.g. handover bounds)")
    possession_requirement: str | None = Field(default=None, description="Explicit property possession deadline")
    purchase_timeline: str | None = Field(default=None, description="Explicit purchase decision timeline")
    timeline_info: TimelineInfo | None = Field(default=None, description="Structured timeline normalization")


class FactorScoreBreakdown(BaseModel):
    """Breakdown for an individual scoring factor."""

    factor: str = Field(description="Name of the scoring dimension")
    weight: float = Field(default=0.0, description="Factor weight (maximum points)")
    max_points: float = Field(description="Maximum points possible for this factor")
    awarded_points: float = Field(description="Points awarded based on evidence")
    evidence: str = Field(description="Underlying data or signals used to calculate this score")


class ScoreBreakdownDetail(BaseModel):
    """Complete structured breakdown of deterministic lead priority scoring."""

    scoring_version: str = Field(default="3.0.0", description="Scoring algorithm version")
    total_score: int = Field(ge=0, le=100, description="Overall priority score bounded [0, 100]")
    category: str = Field(description="Priority category: hot | warm | cold")
    factors: list[FactorScoreBreakdown] = Field(default_factory=list, description="Per-factor breakdown")
    timeline_info: TimelineInfo | None = Field(default=None, description="Structured timeline normalization")
    analysis_timestamp: datetime | None = Field(default=None, description="Timestamp of this scoring analysis")
    is_stale: bool = Field(default=False, description="Whether lead data has changed since this analysis was calculated")
    known_features: list[str] = Field(default_factory=list, description="Verified known lead features")
    unknown_features: list[str] = Field(default_factory=list, description="Missing or unconfirmed lead criteria")


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
    hard_constraints: list[str] = Field(default_factory=list)
    score_explanation: str | None
    score_breakdown: ScoreBreakdownDetail | None = None
    timeline_info: TimelineInfo | None = None
    scoring_version: str = "3.0.0"
    is_stale: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}

