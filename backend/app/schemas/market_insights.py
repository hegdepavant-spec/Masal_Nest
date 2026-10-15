"""Pydantic schemas for the Market Insights feature.

All AI-generated estimates are indicative only.
Numerical fields are Optional to support null when a reasonable estimate
cannot be supported by the LLM's training data.
"""

from typing import Optional
from pydantic import BaseModel, Field


class MarketInsightsRequest(BaseModel):
    """Input payload for a Market Insights query."""

    locality: str = Field(..., min_length=2, max_length=200, description="Locality or area name")
    city: str = Field(..., min_length=2, max_length=100, description="City name")
    property_type: str = Field(
        ...,
        description="Property type: apartment | villa | independent_house",
        pattern=r"^(apartment|villa|independent_house)$",
    )
    configuration: Optional[str] = Field(
        None,
        description="BHK config: 1BHK | 2BHK | 3BHK | 4BHK_plus",
        pattern=r"^(1BHK|2BHK|3BHK|4BHK_plus)$",
    )
    customer_budget: Optional[str] = Field(
        None, max_length=100, description="Customer budget as a string, e.g. '₹1.2 crore'"
    )
    area_sqft: Optional[float] = Field(
        None, ge=100, le=100_000, description="Approximate property area in square feet"
    )


class MarketInsightsResponse(BaseModel):
    """Structured response from the Market Insights AI service."""

    # Location context
    locality: str
    city: str
    property_type: str
    configuration: Optional[str] = None

    # Market narrative
    market_overview: str = Field(description="Concise overview of the locality and property segment")

    # Indicative price range (None when insufficient basis exists)
    estimated_min_price: Optional[float] = Field(None, description="Indicative lower bound in INR")
    estimated_max_price: Optional[float] = Field(None, description="Indicative upper bound in INR")
    currency: str = Field(default="INR")
    estimated_price_per_sqft_min: Optional[float] = Field(None)
    estimated_price_per_sqft_max: Optional[float] = Field(None)

    # Analysis
    assumptions: list[str] = Field(default_factory=list, description="Key assumptions behind the estimate")
    price_factors: list[str] = Field(default_factory=list, description="Factors that influence price")
    budget_assessment: Optional[str] = Field(None, description="Budget fit assessment (only when budget provided)")
    questions_to_verify: list[str] = Field(default_factory=list, description="Questions for the salesperson to ask")

    # Disclaimer and transparency
    confidence_note: str = Field(description="Statement about estimate reliability")
    data_status: str = Field(
        default="AI_INDICATIVE",
        description="Always 'AI_INDICATIVE' — never verified live data",
    )
