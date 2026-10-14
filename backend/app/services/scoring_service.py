"""Deterministic lead priority scoring service.

Calculates a 0-100 score based on documented, weighted criteria.
The LLM extracts evidence; this service applies the rules.

Scoring Criteria (weights sum to 100):
  - Buying timeline urgency:   30 points
  - Purchase intent clarity:   25 points
  - Requirement clarity:       20 points
  - Concrete next steps:       15 points
  - Objection penalty:        -10 points max

Missing data is treated as unknown (neutral), not negative.
"""

from dataclasses import dataclass

from app.core.config import get_settings
from app.schemas.analysis import LeadAnalysisResult


@dataclass
class ScoreBreakdown:
    """Detailed breakdown of how the score was calculated."""

    timeline_score: float
    intent_score: float
    clarity_score: float
    next_steps_score: float
    objection_penalty: float
    total_score: int
    category: str
    explanation: str


# --- Timeline keywords mapped to urgency levels ---
_TIMELINE_URGENCY: dict[str, float] = {
    "immediate": 1.0,
    "asap": 1.0,
    "now": 1.0,
    "this week": 0.95,
    "urgent": 0.95,
    "1 month": 0.9,
    "1-2 months": 0.85,
    "2 months": 0.8,
    "within 3 months": 0.75,
    "3 months": 0.7,
    "this quarter": 0.7,
    "6 months": 0.5,
    "within 6 months": 0.5,
    "this year": 0.4,
    "1 year": 0.3,
    "next year": 0.2,
    "exploring": 0.15,
    "not sure": 0.1,
    "no timeline": 0.1,
}

# --- Intent mapping ---
_INTENT_SCORES: dict[str, float] = {
    "buying": 1.0,
    "investing": 0.8,
    "renting": 0.5,
    "exploring": 0.3,
    "unclear": 0.15,
}

# --- Next-step keywords ---
_NEXT_STEP_KEYWORDS = [
    "site visit", "visit", "viewing", "tour",
    "loan", "mortgage", "pre-approved", "financing",
    "document", "paperwork", "registration",
    "negotiate", "offer", "deal", "book", "reserve",
    "call me", "schedule", "appointment", "meeting",
]


def calculate_score(
    analysis: LeadAnalysisResult,
    buying_timeline: str | None = None,
    budget: str | None = None,
    property_requirement: str | None = None,
) -> ScoreBreakdown:
    """Calculate a deterministic priority score from structured evidence.

    Args:
        analysis: Structured analysis output from the Lead Intelligence Agent.
        buying_timeline: Raw timeline from the lead form.
        budget: Raw budget from the lead form.
        property_requirement: Raw requirement from the lead form.

    Returns:
        ScoreBreakdown with total score, category, and explanation.
    """
    settings = get_settings()
    explanations: list[str] = []

    # 1. Timeline urgency (0-30 points)
    timeline_score = _score_timeline(buying_timeline, analysis.urgency_signals)
    timeline_points = timeline_score * 30
    if timeline_score >= 0.7:
        explanations.append(f"Strong urgency signals (timeline: {buying_timeline or 'from context'})")
    elif timeline_score >= 0.4:
        explanations.append(f"Moderate timeline ({buying_timeline or 'some urgency detected'})")
    elif timeline_score > 0:
        explanations.append(f"Long or unclear timeline ({buying_timeline or 'no specific timeline'})")

    # 2. Purchase intent (0-25 points)
    intent_score = _INTENT_SCORES.get(analysis.customer_intent.lower(), 0.15)
    intent_points = intent_score * 25
    explanations.append(f"Intent: {analysis.customer_intent} ({intent_points:.0f}/25)")

    # 3. Requirement clarity (0-20 points)
    clarity_score = _score_clarity(
        analysis.key_requirements,
        budget,
        property_requirement,
    )
    clarity_points = clarity_score * 20
    if clarity_score >= 0.7:
        explanations.append("Clear requirements and budget specified")
    elif clarity_score >= 0.4:
        explanations.append("Partial requirements provided")
    else:
        explanations.append("Requirements are vague or missing")

    # 4. Concrete next steps (0-15 points)
    next_steps_score = _score_next_steps(analysis)
    next_steps_points = next_steps_score * 15
    if next_steps_score > 0:
        explanations.append(f"Concrete next steps detected ({next_steps_points:.0f}/15)")

    # 5. Objection penalty (0 to -10 points)
    objection_penalty = _score_objections(analysis.objections)
    if objection_penalty < 0:
        explanations.append(f"Objections present: {len(analysis.objections)} concern(s) ({objection_penalty:.0f})")

    # Calculate total
    raw_score = timeline_points + intent_points + clarity_points + next_steps_points + objection_penalty
    total_score = max(0, min(100, round(raw_score)))

    category = determine_category(total_score)
    explanation = f"Score {total_score}/100 ({category.capitalize()}). " + "; ".join(explanations) + "."

    return ScoreBreakdown(
        timeline_score=timeline_points,
        intent_score=intent_points,
        clarity_score=clarity_points,
        next_steps_score=next_steps_points,
        objection_penalty=objection_penalty,
        total_score=total_score,
        category=category,
        explanation=explanation,
    )


def determine_category(score: int) -> str:
    """Determine lead priority category from score."""
    settings = get_settings()
    if score >= settings.score_hot_threshold:
        return "hot"
    elif score >= settings.score_warm_threshold:
        return "warm"
    return "cold"


def _score_timeline(buying_timeline: str | None, urgency_signals: list[str]) -> float:
    """Score timeline urgency 0.0-1.0."""
    score = 0.0

    if buying_timeline:
        timeline_lower = buying_timeline.lower().strip()
        # Check for exact or substring matches
        for keyword, value in _TIMELINE_URGENCY.items():
            if keyword in timeline_lower:
                score = max(score, value)
                break

        # If no keyword matched, try to parse numeric months
        if score == 0:
            import re

            month_match = re.search(r"(\d+)\s*month", timeline_lower)
            if month_match:
                months = int(month_match.group(1))
                if months <= 1:
                    score = 0.9
                elif months <= 3:
                    score = 0.7
                elif months <= 6:
                    score = 0.5
                elif months <= 12:
                    score = 0.3
                else:
                    score = 0.15

    # Boost from urgency signals
    if urgency_signals:
        signal_boost = min(len(urgency_signals) * 0.1, 0.3)
        score = min(1.0, score + signal_boost)

    return score


def _score_clarity(
    key_requirements: list[str],
    budget: str | None,
    property_requirement: str | None,
) -> float:
    """Score requirement clarity 0.0-1.0."""
    points = 0.0

    # Has any requirements from AI analysis
    if key_requirements:
        points += min(len(key_requirements) * 0.15, 0.45)

    # Has budget
    if budget and budget.strip():
        points += 0.3

    # Has property requirement
    if property_requirement and property_requirement.strip():
        points += 0.25

    return min(1.0, points)


def _score_next_steps(analysis: LeadAnalysisResult) -> float:
    """Score concrete next steps 0.0-1.0."""
    # Check recommended action and readiness signals for next-step keywords
    text_to_check = (
        (analysis.recommended_action or "").lower()
        + " "
        + " ".join(analysis.readiness_signals).lower()
        + " "
        + (analysis.suggested_response or "").lower()
    )

    matches = sum(1 for kw in _NEXT_STEP_KEYWORDS if kw in text_to_check)
    return min(1.0, matches * 0.25)


def _score_objections(objections: list[str]) -> float:
    """Calculate objection penalty (0 to -10)."""
    if not objections:
        return 0.0
    # Cap at -10, -3 per objection
    return max(-10.0, -3.0 * len(objections))
