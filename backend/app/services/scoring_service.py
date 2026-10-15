"""Deterministic lead qualification and priority scoring service (v3.0.0).

Calculates a 0-100 priority score based on objective intake qualification and buying potential.
Customer engagement history (calls/visits/tasks) is NOT a direct scoring category,
ensuring brand-new leads are evaluated fairly based on their actual buying opportunity.

Scoring Criteria (positive weights sum to 100.0 max points):
  1. Purchase Intent:                           30.0 points max
  2. Purchase Decision Urgency:                 20.0 points max
  3. Budget & Financial Readiness:              20.0 points max
  4. Requirement Clarity & Fit:                 20.0 points max
  5. Qualification Completeness & Feasibility:   10.0 points max
  -------------------------------------------------------------
  Total positive maximum:                      100.0 points

  Deductions (Material Risks & Contradictions):
  - Verified Material Blocker / Contradiction: 0 to -10 points

Missing intake data results in neutral lack of qualification credit (0 pts),
never an invented negative penalty.
Customer delivery bounds (e.g. "possession within 3 months") are treated as operational
constraints/requirements, NOT as negative objections and NOT as immediate purchase deadlines.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.core.config import get_settings
from app.schemas.analysis import LeadAnalysisResult
from app.services.timeline_service import (
    TimelineInfo,
    normalize_timeline,
)

SCORING_VERSION = "3.0.0"


@dataclass
class ScoreBreakdown:
    """Detailed breakdown of how the deterministic score was calculated."""

    timeline_score: float
    intent_score: float
    financial_score: float
    clarity_score: float
    qualification_score: float
    next_steps_score: float  # Maintained for backwards compatibility (defaults to 0.0)
    objection_penalty: float
    total_score: int
    category: str
    explanation: str
    factors: list[dict] = field(default_factory=list)
    timeline_info: TimelineInfo | None = None
    scoring_version: str = SCORING_VERSION
    known_features: list[str] = field(default_factory=list)
    unknown_features: list[str] = field(default_factory=list)


# --- Base intent mapping (0-30 max) ---
_INTENT_BASE_POINTS: dict[str, float] = {
    "buying": 20.0,
    "investing": 18.0,
    "renting": 8.0,
    "exploring": 4.0,
    "unclear": 0.0,
}


def calculate_score(
    analysis: LeadAnalysisResult,
    buying_timeline: str | None = None,
    budget: str | None = None,
    property_requirement: str | None = None,
    customer_message: str | None = None,
    location: str | None = None,
) -> ScoreBreakdown:
    """Calculate a deterministic priority score from structured intake evidence.

    Args:
        analysis: Structured analysis output from the Lead Intelligence Agent.
        buying_timeline: Raw timeline from the lead form.
        budget: Raw budget from the lead form.
        property_requirement: Raw requirement from the lead form.
        customer_message: Raw customer message / interaction notes.
        location: Customer stated preferred location or city.

    Returns:
        ScoreBreakdown with total score, category, factor details, and known/unknown features.
    """
    explanations: list[str] = []
    known_features: list[str] = []
    unknown_features: list[str] = list(analysis.missing_info or [])

    customer_msg = customer_message or getattr(analysis, "customer_message", "") or ""
    raw_signals_text = " ".join(analysis.urgency_signals + analysis.readiness_signals).lower()

    # -------------------------------------------------------------------------
    # 1. Purchase Intent (0-30 points)
    # -------------------------------------------------------------------------
    intent_points, intent_evidence_parts = _score_purchase_intent(
        analysis=analysis,
        customer_msg=customer_msg,
        raw_signals_text=raw_signals_text,
        known_features=known_features,
        unknown_features=unknown_features,
    )
    explanations.append(f"Intent: {analysis.customer_intent or 'unclear'} ({intent_points:.0f}/30 pts)")

    # -------------------------------------------------------------------------
    # 2. Purchase Decision Urgency (0-20 points)
    # -------------------------------------------------------------------------
    timeline_input = buying_timeline or getattr(analysis, "purchase_timeline", None) or ""
    analysis_timeline = getattr(analysis, "timeline_info", None)

    if analysis_timeline and analysis_timeline.confidence >= 0.7:
        timeline_info = analysis_timeline
    else:
        timeline_info = normalize_timeline(timeline_input)

    timeline_points, tl_reason = _score_purchase_timeline(timeline_info)
    if timeline_info.normalized_label and timeline_info.normalized_label != "Not specified":
        known_features.append(f"Timeline: {timeline_info.normalized_label}")
    else:
        unknown_features.append("Specific buying timeline unstated")

    explanations.append(f"Timeline: {timeline_info.normalized_label or 'Unspecified'} ({timeline_points:.0f}/20 pts)")

    # -------------------------------------------------------------------------
    # 3. Budget & Financial Readiness (0-20 points)
    # -------------------------------------------------------------------------
    financial_points, budget_pts, fin_pts, fin_reason = _score_budget_and_readiness(
        budget=budget,
        customer_msg=customer_msg,
        raw_signals_text=raw_signals_text,
        known_features=known_features,
        unknown_features=unknown_features,
    )
    explanations.append(f"Budget & Finance: budget ({budget_pts:.0f}/10 pts), finance ({fin_pts:.0f}/10 pts)")

    # -------------------------------------------------------------------------
    # 4. Requirement Clarity & Fit (0-20 points)
    # -------------------------------------------------------------------------
    clarity_points, prop_pts, loc_pts, effective_prop, effective_loc = _score_requirement_and_fit(
        key_requirements=analysis.key_requirements,
        property_requirement=property_requirement,
        location=location,
        analysis=analysis,
        known_features=known_features,
        unknown_features=unknown_features,
    )
    explanations.append(f"Requirements: property ({prop_pts:.0f}/10 pts), location ({loc_pts:.0f}/10 pts)")

    # -------------------------------------------------------------------------
    # 5. Qualification Completeness & Feasibility (0-10 points)
    # -------------------------------------------------------------------------
    qual_points, qual_evidence = _score_qualification_completeness(
        analysis=analysis,
        timeline_info=timeline_info,
        customer_msg=customer_msg,
        property_requirement=property_requirement,
        known_features=known_features,
        unknown_features=unknown_features,
    )
    explanations.append(f"Qualification: {qual_points:.0f}/10 pts ({qual_evidence})")

    # -------------------------------------------------------------------------
    # Deductions: Material Risks & Contradictions (0 to -10 points)
    # -------------------------------------------------------------------------
    blocker_penalty, blocker_evidence = _score_material_blockers(
        objections=analysis.objections,
        timeline_info=timeline_info,
    )
    if blocker_penalty < 0:
        explanations.append(f"Deductions: {blocker_penalty:.0f} pts ({blocker_evidence})")

    # Calculate strictly bounded total score [0, 100]
    raw_total = (
        intent_points
        + timeline_points
        + financial_points
        + clarity_points
        + qual_points
        + blocker_penalty
    )
    total_score = max(0, min(100, round(raw_total)))
    category = determine_category(total_score)
    explanation = f"Score {total_score}/100 ({category.capitalize()}). " + "; ".join(explanations) + "."

    # Build 5 standard factors table (summing to 100 max points)
    factors = [
        {
            "factor": "Purchase Intent",
            "weight": 30.0,
            "max_points": 30.0,
            "awarded_points": round(intent_points, 1),
            "evidence": "; ".join(intent_evidence_parts),
        },
        {
            "factor": "Purchase Timeline Urgency",
            "weight": 20.0,
            "max_points": 20.0,
            "awarded_points": round(timeline_points, 1),
            "evidence": tl_reason,
        },
        {
            "factor": "Budget & Financial Readiness",
            "weight": 20.0,
            "max_points": 20.0,
            "awarded_points": round(financial_points, 1),
            "evidence": (
                f"Budget: {budget or 'missing'} ({budget_pts:.0f}/10 pts); "
                f"Financing: {fin_reason} ({fin_pts:.0f}/10 pts)"
            ),
        },
        {
            "factor": "Requirement Clarity & Fit",
            "weight": 20.0,
            "max_points": 20.0,
            "awarded_points": round(clarity_points, 1),
            "evidence": (
                f"Property specs: {effective_prop or 'unspecified'} ({prop_pts:.0f}/10 pts); "
                f"Location: {effective_loc or 'unspecified'} ({loc_pts:.0f}/10 pts)"
            ),
        },
        {
            "factor": "Qualification Completeness & Feasibility",
            "weight": 10.0,
            "max_points": 10.0,
            "awarded_points": round(qual_points, 1),
            "evidence": qual_evidence,
        },
    ]

    if blocker_penalty < 0:
        factors.append({
            "factor": "Material Risk & Blocker Deductions",
            "weight": 0.0,
            "max_points": 0.0,
            "awarded_points": round(blocker_penalty, 1),
            "evidence": blocker_evidence,
        })

    return ScoreBreakdown(
        timeline_score=timeline_points,
        intent_score=intent_points,
        financial_score=financial_points,
        clarity_score=clarity_points,
        qualification_score=qual_points,
        next_steps_score=0.0,
        objection_penalty=blocker_penalty,
        total_score=total_score,
        category=category,
        explanation=explanation,
        factors=factors,
        timeline_info=timeline_info,
        scoring_version=SCORING_VERSION,
        known_features=known_features,
        unknown_features=unknown_features,
    )


def determine_category(score: int) -> str:
    """Determine lead priority category from score."""
    settings = get_settings()
    if score >= settings.score_hot_threshold:
        return "hot"
    elif score >= settings.score_warm_threshold:
        return "warm"
    return "cold"


def _score_purchase_intent(
    analysis: LeadAnalysisResult,
    customer_msg: str,
    raw_signals_text: str,
    known_features: list[str],
    unknown_features: list[str],
) -> tuple[float, list[str]]:
    """Score purchase intent (0 to 30 pts).

    Evaluates explicit intention to purchase, active property comparison,
    and concrete buying objectives over generic inquiries.
    """
    intent_raw = (analysis.customer_intent or "unclear").lower().strip()
    intent_base = _INTENT_BASE_POINTS.get(intent_raw, 0.0)
    intent_bonus = 0.0
    intent_evidence_parts: list[str] = [f"Declared intent: '{intent_raw}' ({intent_base:.0f}/20 pts)"]

    combined_text = (customer_msg + " " + raw_signals_text).lower()

    if intent_raw == "buying":
        known_features.append(f"Intent: Buying ({intent_raw})")
        # 1. Active commitment / direct purchase objective (+5 pts)
        commit_patterns = [
            "ready to purchase", "ready to buy", "ready to decide", "decision now",
            "purchase now", "finalize", "book", "offer", "commit to buy", "ready to move"
        ]
        if any(w in combined_text for w in commit_patterns):
            intent_bonus += 5.0
            intent_evidence_parts.append("+5 pts ready-to-purchase commitment")

        # 2. Active property evaluation / comparison / shortlist requested (+3 pts)
        eval_patterns = [
            "shortlist", "viewing", "options", "compare", "properties matching",
            "looking to relocate", "relocate", "relocating", "site visit"
        ]
        if any(w in combined_text for w in eval_patterns):
            intent_bonus += 3.0
            intent_evidence_parts.append("+3 pts active property evaluation")

    elif intent_raw == "investing":
        known_features.append(f"Intent: Investing ({intent_raw})")
        if any(w in combined_text for w in ["yield", "roi", "commercial rental", "rental income", "appreciation"]):
            intent_bonus += 4.0
            intent_evidence_parts.append("+4 pts defined financial yield target")

    elif intent_raw in ("exploring", "renting"):
        known_features.append(f"Intent: {intent_raw.capitalize()}")
    else:
        unknown_features.append("Customer intent unclear")

    intent_points = min(30.0, intent_base + intent_bonus)
    return intent_points, intent_evidence_parts


def _score_purchase_timeline(timeline_info: TimelineInfo) -> tuple[float, str]:
    """Score purchase decision timeline strictly based on normalized duration (0 to 20 pts).

    Calibrated monotonic thresholds:
      - 0–7 days (Immediate):               20.0 pts (1.0)
      - 8–14 days (Near-term):              18.0 pts (0.9)
      - 15–30 days (~1 month):              15.0 pts (0.75)
      - 31–60 days (~2 months):             10.0 pts (0.50)
      - 61–90 days (~3 months):              7.0 pts (0.35)
      - 91–180 days (~6 months):             4.0 pts (0.20)
      - > 180 days / Flexible / Exploring:   2.0 pts (0.10)
      - Undecided / Unknown:                 0.0 pts (neutral lack of evidence)
      - Conflicting:                         0.0 pts (requires clarification)
    """
    if timeline_info.has_conflicting_signals or timeline_info.timeline_status == "conflicting":
        return 0.0, (
            f"Timeline '{timeline_info.normalized_label}' contains conflicting signals; "
            f"requires clarification before awarding urgency credit (0/20 pts)"
        )

    # Use purchase decision days if available; otherwise fallback to maximum_days
    max_days = timeline_info.purchase_max_days
    if max_days is None:
        max_days = timeline_info.maximum_days

    # If only a possession constraint is present (e.g. 90-day delivery window)
    if timeline_info.purchase_max_days is None and timeline_info.possession_max_days is not None:
        poss_days = timeline_info.possession_max_days
        if poss_days <= 30:
            return 12.0, f"Delivery window <= 30 days suggests near-term requirement (~12/20 pts)"
        elif poss_days <= 90:
            return 8.0, f"Delivery window {poss_days} days translates to moderate timeline (~8/20 pts)"
        else:
            return 4.0, f"Extended delivery window {poss_days} days translates to longer horizon (~4/20 pts)"

    if max_days is None:
        if timeline_info.timeline_status == "exploring":
            return 2.0, "Exploring / flexible timeline with no fixed decision date (2/20 pts)"
        return 0.0, "No definitive purchase timeline specified (0/20 pts)"

    if max_days <= 7:
        return 20.0, f"Immediate purchase urgency: {timeline_info.normalized_label} (20/20 pts)"
    elif max_days <= 14:
        return 18.0, f"Near-term purchase urgency: {timeline_info.normalized_label} (18/20 pts)"
    elif max_days <= 30:
        return 15.0, f"Short-term purchase urgency: {timeline_info.normalized_label} (15/20 pts)"
    elif max_days <= 60:
        return 10.0, f"Moderate purchase urgency: {timeline_info.normalized_label} (10/20 pts)"
    elif max_days <= 90:
        return 7.0, f"Quarterly purchase horizon: {timeline_info.normalized_label} (7/20 pts)"
    elif max_days <= 180:
        return 4.0, f"Mid-term purchase horizon: {timeline_info.normalized_label} (4/20 pts)"
    else:
        return 2.0, f"Extended purchase horizon: {timeline_info.normalized_label} (2/20 pts)"


def _score_budget_and_readiness(
    budget: str | None,
    customer_msg: str,
    raw_signals_text: str,
    known_features: list[str],
    unknown_features: list[str],
) -> tuple[float, float, float, str]:
    """Score budget specificity and verified financial readiness (0 to 20 pts).

    Budget specificity: 0 to 10 pts
    Financial readiness: 0 to 10 pts
    """
    budget_pts = 0.0
    fin_pts = 0.0

    if budget and budget.strip():
        b_str = budget.lower().strip()
        if re.search(r"\d+", b_str) and any(u in b_str for u in ["cr", "crore", "lakh", "lac", "₹", "rs", "k", "million"]):
            budget_pts = 10.0
            known_features.append(f"Budget: {budget.strip()} (concrete)")
        elif re.search(r"\d+", b_str):
            budget_pts = 7.0
            known_features.append(f"Budget: {budget.strip()}")
        elif any(v in b_str for v in ["flexible", "negotiable", "reasonable", "market"]):
            budget_pts = 3.0
            known_features.append(f"Budget: {budget.strip()} (approximate)")
        else:
            budget_pts = 2.0
    else:
        unknown_features.append("Budget not specified")

    # Financial / payment readiness check (explicit statements only, never inferred)
    combined = (customer_msg + " " + raw_signals_text).lower()
    verified_loan_patterns = [
        "pre-approved", "loan sanctioned", "loan approved", "cash buyer",
        "self-funded", "budget ready", "funds ready", "sanction letter", "cash ready"
    ]
    in_progress_patterns = [
        "applying for loan", "loan in process", "eligible for loan", "arranging funds"
    ]

    if any(p in combined for p in verified_loan_patterns):
        fin_pts = 10.0
        fin_reason = "Verified financing / pre-approved capital (+10 pts)"
        known_features.append("Financing: Pre-approved or ready capital")
    elif any(p in combined for p in in_progress_patterns):
        fin_pts = 5.0
        fin_reason = "Financing application in progress (+5 pts)"
        known_features.append("Financing: In progress")
    else:
        fin_pts = 0.0
        fin_reason = "Financing readiness unconfirmed (0/10 pts)"
        unknown_features.append("Financing readiness unconfirmed")

    return (budget_pts + fin_pts), budget_pts, fin_pts, fin_reason


def _score_requirement_and_fit(
    key_requirements: list[str],
    property_requirement: str | None,
    location: str | None,
    analysis: LeadAnalysisResult,
    known_features: list[str],
    unknown_features: list[str],
) -> tuple[float, float, float, str, str]:
    """Score property requirement clarity and location specificity (0 to 20 pts).

    Property specifications: 0 to 10 pts
    Locality & market fit: 0 to 10 pts
    """
    prop_pts = 0.0
    loc_pts = 0.0

    effective_prop = (property_requirement or "").strip()
    if not effective_prop and key_requirements:
        effective_prop = ", ".join(key_requirements)

    if effective_prop:
        p_str = effective_prop.lower().strip()
        has_config = bool(re.search(r"\b(\d+\s*bhk|villa|apartment|flat|commercial|penthouse|office|plot)\b", p_str))
        has_specs = len(p_str.split()) >= 3 or len(key_requirements) >= 2

        if has_config and has_specs:
            prop_pts = 10.0
            known_features.append(f"Property: {effective_prop}")
        elif has_config or has_specs:
            prop_pts = 6.0
            known_features.append(f"Property: {effective_prop} (partial)")
        else:
            prop_pts = 3.0
    else:
        unknown_features.append("Property specification not provided")

    effective_loc = (location or "").strip()
    if not effective_loc:
        # Check inferred requirements or summary for location signals
        loc_candidates = [
            req for req in (analysis.inferred_requirements + analysis.key_requirements + [analysis.summary])
            if any(c in req.lower() for c in ["bangalore", "bengaluru", "whitefield", "brookefield", "indiranagar", "mumbai", "pune", "delhi"])
        ]
        if loc_candidates:
            effective_loc = loc_candidates[0]

    if effective_loc:
        loc_lower = effective_loc.lower()
        # Micro-market check (locality with comma or well-known area)
        micro_markets = [
            "whitefield", "brookefield", "brookfield", "indiranagar", "koramangala",
            "hsr", "electronic city", "hebbal", "sarjapur", "bellandur", "yelahanka"
        ]
        if any(m in loc_lower for m in micro_markets) or "," in effective_loc:
            loc_pts = 10.0
            known_features.append(f"Location: {effective_loc} (micro-market)")
        else:
            loc_pts = 5.0
            known_features.append(f"Location: {effective_loc} (city-level)")
    else:
        unknown_features.append("Preferred location unstated")

    return (prop_pts + loc_pts), prop_pts, loc_pts, effective_prop, effective_loc


def _score_qualification_completeness(
    analysis: LeadAnalysisResult,
    timeline_info: TimelineInfo,
    customer_msg: str,
    property_requirement: str | None,
    known_features: list[str],
    unknown_features: list[str],
) -> tuple[float, str]:
    """Score qualification completeness and operational constraints (0 to 10 pts).

    Intake completeness: 0 to 6 pts
    Explicit constraints / decision-maker clarity: 0 to 4 pts
    """
    completeness_pts = 0.0
    constraint_pts = 0.0
    ev_parts: list[str] = []

    missing_count = len(analysis.missing_info)
    if missing_count == 0:
        completeness_pts = 6.0
        ev_parts.append("Fully complete requirements (+6 pts)")
    elif missing_count <= 2:
        completeness_pts = 4.0
        ev_parts.append(f"Minor missing criteria ({missing_count} field(s), +4 pts)")
    elif missing_count <= 4:
        completeness_pts = 2.0
        ev_parts.append(f"Moderate missing criteria ({missing_count} field(s), +2 pts)")
    else:
        ev_parts.append(f"{missing_count} critical fields unconfirmed (0 pts)")

    # Explicit operational constraints / requirements (e.g. strict possession bounds, ready to move)
    hard_constraints = getattr(analysis, "hard_constraints", []) or timeline_info.hard_constraints
    p_lower = (property_requirement or "").lower()
    c_lower = customer_msg.lower()

    if hard_constraints:
        constraint_pts = 4.0
        ev_parts.append(f"{len(hard_constraints)} operational constraint(s) specified (+4 pts)")
        for c in hard_constraints:
            known_features.append(f"Constraint: {c}")
    elif any(phrase in c_lower or phrase in p_lower for phrase in ["ready to move", "gated community", "vaastu", "facing"]):
        constraint_pts = 4.0
        ev_parts.append("Explicit property preference constraints specified (+4 pts)")
    elif property_requirement:
        constraint_pts = 1.0
        ev_parts.append("Standard intake preferences (+1 pt)")

    total_qual = min(10.0, completeness_pts + constraint_pts)
    evidence = "; ".join(ev_parts) if ev_parts else "Standard qualification parameters"
    return total_qual, evidence


def _score_material_blockers(
    objections: list[str],
    timeline_info: TimelineInfo,
) -> tuple[float, str]:
    """Score material blocker deductions (0 to -10 pts).

    Only penalize verified material dealbreakers (e.g. legal disputes, loan rejections,
    or conflicting timeline statements). Operational requirements (like a 3-month
    possession window) are NOT blockers.
    """
    penalty = 0.0
    reasons: list[str] = []

    if timeline_info.has_conflicting_signals:
        penalty -= 3.0
        reasons.append("Conflicting timeline duration signals (-3 pts)")

    if objections:
        genuine_blockers = [
            obj for obj in objections
            if not any(w in obj.lower() for w in ["handover", "possession", "delivery", "3-month", "window", "timeline"])
        ]
        if genuine_blockers:
            obj_deduction = max(-10.0, -5.0 * len(genuine_blockers))
            penalty += obj_deduction
            reasons.append(f"{len(genuine_blockers)} verified blocker(s) ({obj_deduction:.0f} pts)")

    penalty = max(-10.0, penalty)
    evidence = "; ".join(reasons) if reasons else "No material blockers noted"
    return penalty, evidence
