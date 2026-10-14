"""Tests for the deterministic lead scoring service."""

import pytest
from app.schemas.analysis import LeadAnalysisResult
from app.services.scoring_service import calculate_score, determine_category


def test_high_intent_immediate_timeline_scoring():
    """Verify that immediate timeline + clear intent + good budget produces a HOT score."""
    analysis = LeadAnalysisResult(
        summary="Urgent buyer relocating next month with ready budget.",
        customer_intent="buying",
        key_requirements=["4 BHK villa", "Whitefield", "Gated community"],
        inferred_requirements=["Luxury clubhouse"],
        objections=[],
        missing_info=[],
        recommended_action="Schedule immediate visit",
        suggested_response="Let's view villas this Saturday.",
        urgency_signals=["Relocating next month", "Bank loan sanctioned"],
        readiness_signals=["Sanction letter ready", "Immediate budget"],
    )

    result = calculate_score(
        analysis=analysis,
        buying_timeline="immediate (within 30 days)",
        budget="₹4 Cr",
        property_requirement="4 BHK luxury villa",
    )

    assert result.total_score >= 70
    assert result.category == "hot"
    assert result.timeline_score > 0
    assert result.intent_score > 0


def test_missing_data_is_neutral_not_negative():
    """Verify missing data yields neutral/unknown score rather than unfair punitive zero."""
    analysis = LeadAnalysisResult(
        summary="Vague inquiry with minimal info.",
        customer_intent="unclear",
        key_requirements=[],
        inferred_requirements=[],
        objections=[],
        missing_info=["Budget", "Timeline", "Location"],
        recommended_action="Clarify requirements",
        suggested_response="Hi, what location do you prefer?",
        urgency_signals=[],
        readiness_signals=[],
    )

    result = calculate_score(
        analysis=analysis,
        buying_timeline=None,
        budget=None,
        property_requirement=None,
    )

    assert result.total_score < 40
    assert result.category == "cold"


def test_scoring_category_thresholds():
    """Verify score category mapping respects 70 and 40 thresholds."""
    assert determine_category(85) == "hot"
    assert determine_category(70) == "hot"
    assert determine_category(69) == "warm"
    assert determine_category(40) == "warm"
    assert determine_category(39) == "cold"
    assert determine_category(0) == "cold"
