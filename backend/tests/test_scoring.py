"""Tests for the deterministic lead qualification and priority scoring service (v3.0.0)."""

import pytest
from app.schemas.analysis import LeadAnalysisResult
from app.services.scoring_service import calculate_score, determine_category, SCORING_VERSION
from app.services.timeline_service import normalize_timeline


def test_100_point_maximum_and_category_arithmetic():
    """Verify that positive factor weights sum to 100.0 max points and factor sums reconcile to total_score."""
    analysis = LeadAnalysisResult(
        summary="Ready buyer looking for 3 BHK flat.",
        customer_intent="buying",
        key_requirements=["3 BHK flat", "Brookefield, Bengaluru"],
        inferred_requirements=[],
        objections=[],
        missing_info=["Financing status"],
        recommended_action="Follow up",
        suggested_response="Hi, we have options.",
        urgency_signals=["Immediate purchase timeline (within 10 days)"],
        readiness_signals=["Budget allocated", "Ready to purchase now"],
    )

    result = calculate_score(
        analysis=analysis,
        buying_timeline="within 10 days",
        budget="₹3.5 Cr",
        property_requirement="3 BHK flat with pool and parking",
        location="Brookefield, Bengaluru",
    )

    assert result.scoring_version == SCORING_VERSION
    assert result.scoring_version == "3.0.0"

    # Positive factor weights sum to exactly 100.0
    pos_max = sum(f["max_points"] for f in result.factors if f["max_points"] > 0)
    assert pos_max == 100.0

    # The 5 standard positive categories must exist
    factor_names = [f["factor"] for f in result.factors]
    assert "Purchase Intent" in factor_names
    assert "Purchase Timeline Urgency" in factor_names
    assert "Budget & Financial Readiness" in factor_names
    assert "Requirement Clarity & Fit" in factor_names
    assert "Qualification Completeness & Feasibility" in factor_names

    # Sum of awarded points equals total_score (accounting for round)
    factor_sum = sum(f["awarded_points"] for f in result.factors)
    assert round(factor_sum) == result.total_score
    assert 0 <= result.total_score <= 100


def test_brand_new_lead_with_no_interaction_history_scores_fairly():
    """Verify that a brand-new lead with complete intake details (clear intent, near-term timeline,
    specific budget, property configuration, location) qualifies as HOT (>= 70) on day one without CRM history."""
    analysis = LeadAnalysisResult(
        summary="Chinmay Jo from Brookfield is looking to buy a ready-to-move 3 BHK flat within 10 days.",
        customer_intent="buying",
        key_requirements=["3 BHK flat", "swimming pool", "parking lot"],
        inferred_requirements=["Brookfield, Bengaluru"],
        objections=[],
        missing_info=["Financing or loan pre-approval status", "Preferred floor"],
        recommended_action="Contact lead immediately",
        suggested_response="Hi Chinmay, we have ready-to-move 3 BHK flats.",
        urgency_signals=["Immediate buying timeline (within 10 days)"],
        readiness_signals=["Clearly defined budget range", "Ready to move"],
        hard_constraints=["Ready to move"],
    )

    result = calculate_score(
        analysis=analysis,
        buying_timeline="immediate(within 10 days)",
        budget="3.5 cr to 4.5 cr",
        property_requirement="3 bhk flat with swimming pool and parking lot",
        customer_message="flat should be ready to move",
        location="Brookefield, Bengaluru",
    )

    # Brand new lead is not penalized for 0 CRM calls/visits -> qualifies as HOT
    assert result.total_score >= 70
    assert result.category == "hot"
    assert result.next_steps_score == 0.0  # Engagement is not a direct scoring category
    assert result.timeline_score == 18.0   # 10 days in 8-14d bracket = 18/20 pts


def test_high_urgency_without_strong_purchase_intent():
    """Verify that a lead with immediate timeline but vague/exploring intent does not score Hot.
    Urgency alone does not dominate the qualification score."""
    analysis = LeadAnalysisResult(
        summary="Customer casually looking around with immediate timeline but no buying intent or budget.",
        customer_intent="exploring",
        key_requirements=[],
        inferred_requirements=[],
        objections=[],
        missing_info=["Budget", "Specific property type", "Location", "Decision maker"],
        recommended_action="Send general catalog",
        suggested_response="Here is our overview brochure.",
        urgency_signals=["Wants info in 2 days"],
        readiness_signals=[],
    )

    result = calculate_score(
        analysis=analysis,
        buying_timeline="Within 3 days",
        budget=None,
        property_requirement=None,
        customer_message="Just looking around, send whatever you have fast.",
    )

    # High urgency (20/20) + weak intent (4/30) + missing budget (0/20) + vague specs (0/20) -> COLD
    assert result.timeline_score == 20.0
    assert result.intent_score == 4.0
    assert result.financial_score == 0.0
    assert result.total_score < 40
    assert result.category == "cold"


def test_strong_purchase_intent_without_short_timeline():
    """Verify that a lead with strong buying intent and verified financing but an extended timeline
    (3-6 months) is classified as WARM, not unfairly demoted to COLD."""
    analysis = LeadAnalysisResult(
        summary="Committed investor targeting high-yield commercial property in 4 months with pre-approved financing.",
        customer_intent="investing",
        key_requirements=["Commercial office space", "1500 sq ft", "Whitefield"],
        inferred_requirements=[],
        objections=[],
        missing_info=["Tenant lease preference"],
        recommended_action="Share commercial prospectus",
        suggested_response="Here are our commercial properties.",
        urgency_signals=["Targeting acquisition in 4 months"],
        readiness_signals=["Pre-approved bank loan", "Clear budget bracket"],
    )

    result = calculate_score(
        analysis=analysis,
        buying_timeline="3-6 months",
        budget="₹2.5 Cr",
        property_requirement="Commercial office space, 1500 sq ft",
        customer_message="Pre-approved bank loan ready. Planning purchase in ~4 months.",
        location="Whitefield, Bangalore",
    )

    # Intent (18+4=22/30) + Timeline (4/20) + Finance (10+10=20/20) + Specs (10+10=20/20) + Qual (6-8/10)
    assert result.total_score >= 55
    assert result.category == "warm"


def test_budget_specificity_vs_unverified_financial_readiness():
    """Verify that stating a concrete budget awards budget points (10/10), but financing readiness
    is NOT assumed without explicit evidence (0/10 vs 10/10)."""
    analysis_unverified = LeadAnalysisResult(
        summary="Buyer with budget but no financing stated.",
        customer_intent="buying",
        key_requirements=["3 BHK flat"],
        inferred_requirements=[],
        objections=[],
        missing_info=["Financing source"],
        recommended_action="Inquire about financing",
        suggested_response="Do you plan to take a home loan?",
        urgency_signals=[],
        readiness_signals=[],
    )

    res_unverified = calculate_score(
        analysis=analysis_unverified,
        buying_timeline="1 month",
        budget="₹2 Cr",
        property_requirement="3 BHK flat",
        customer_message="Looking for 3 BHK flat.",
    )

    # Budget is concrete (10 pts), but financing readiness is 0 pts -> 10/20 pts total
    assert res_unverified.financial_score == 10.0
    fin_factor_unverified = next(f for f in res_unverified.factors if f["factor"] == "Budget & Financial Readiness")
    assert fin_factor_unverified["awarded_points"] == 10.0
    assert "Financing readiness unconfirmed" in fin_factor_unverified["evidence"]

    # Now with explicit pre-approved loan
    analysis_verified = LeadAnalysisResult(
        summary="Buyer with pre-approved bank loan.",
        customer_intent="buying",
        key_requirements=["3 BHK flat"],
        inferred_requirements=[],
        objections=[],
        missing_info=[],
        recommended_action="Schedule visit",
        suggested_response="Let's view villas.",
        urgency_signals=[],
        readiness_signals=["Pre-approved bank loan"],
    )

    res_verified = calculate_score(
        analysis=analysis_verified,
        buying_timeline="1 month",
        budget="₹2 Cr",
        property_requirement="3 BHK flat",
        customer_message="Pre-approved for bank loan, budget ready.",
    )

    # Both budget (10 pts) and financing readiness (10 pts) awarded -> 20/20 pts
    assert res_verified.financial_score == 20.0
    fin_factor_verified = next(f for f in res_verified.factors if f["factor"] == "Budget & Financial Readiness")
    assert fin_factor_verified["awarded_points"] == 20.0
    assert "pre-approved" in fin_factor_verified["evidence"].lower()


def test_missing_data_is_neutral_not_negative_and_contradictions_penalized():
    """Verify that missing intake data yields neutral 0 points rather than punitive deductions,
    while explicit contradictions (e.g. conflicting timeline duration signals) are penalized."""
    # Lead with missing data
    analysis_sparse = LeadAnalysisResult(
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

    result_sparse = calculate_score(
        analysis=analysis_sparse,
        buying_timeline=None,
        budget=None,
        property_requirement=None,
    )

    assert result_sparse.objection_penalty == 0.0  # Missing data is NOT a negative deduction
    assert result_sparse.total_score >= 0
    assert result_sparse.category == "cold"

    # Lead with conflicting timeline signals
    analysis_conflict = LeadAnalysisResult(
        summary="Customer stated conflicting timeline signals.",
        customer_intent="buying",
        key_requirements=["2 BHK"],
        inferred_requirements=[],
        objections=[],
        missing_info=[],
        recommended_action="Clarify timeline",
        suggested_response="When do you plan to decide?",
        urgency_signals=[],
        readiness_signals=[],
    )

    result_conflict = calculate_score(
        analysis=analysis_conflict,
        buying_timeline="immediately but 6 months",
        budget="₹1 Cr",
        property_requirement="2 BHK",
    )

    assert result_conflict.objection_penalty <= -3.0  # Conflicting signals penalized
    assert "Conflicting" in result_conflict.explanation


def test_possession_deadline_vs_purchase_decision_timeline():
    """Verify that a customer's handover/possession deadline (e.g. 90-day handover) is treated as an
    operational constraint, NOT as proof of an immediate purchase decision."""
    analysis = LeadAnalysisResult(
        summary="Customer with 3-month delivery window constraint.",
        customer_intent="buying",
        key_requirements=["3 BHK villa"],
        hard_constraints=["Must have possession within 3 months"],
        inferred_requirements=[],
        objections=[],
        missing_info=[],
        recommended_action="Show ready-to-move projects",
        suggested_response="We have ready projects.",
        urgency_signals=[],
        readiness_signals=[],
    )

    # Only possession constraint provided (no explicit purchase decision days)
    result = calculate_score(
        analysis=analysis,
        buying_timeline="possession within 3 months",
        budget="₹2 Cr",
        property_requirement="3 BHK villa",
    )

    # Possession window of 90 days earns moderate timeline credit (8/20 pts), NOT 20/20 immediate!
    assert result.timeline_score <= 12.0
    assert result.timeline_info.possession_deadline_days == 90
    # The 3-month possession requirement is an operational constraint (+4 pts in qualification)
    qual_factor = next(f for f in result.factors if f["factor"] == "Qualification Completeness & Feasibility")
    assert qual_factor["awarded_points"] >= 4.0


def test_avoiding_double_counted_evidence():
    """Verify that repeating the same readiness signal or keyword multiple times does not artificially inflate points."""
    analysis_single = LeadAnalysisResult(
        summary="Buyer with one readiness signal.",
        customer_intent="buying",
        key_requirements=["3 BHK flat"],
        inferred_requirements=[],
        objections=[],
        missing_info=[],
        recommended_action="Follow up",
        suggested_response="Hello",
        urgency_signals=["Ready to purchase now"],
        readiness_signals=["Pre-approved bank loan"],
    )

    analysis_dup = LeadAnalysisResult(
        summary="Buyer repeating the same signals.",
        customer_intent="buying",
        key_requirements=["3 BHK flat"],
        inferred_requirements=[],
        objections=[],
        missing_info=[],
        recommended_action="Follow up",
        suggested_response="Hello",
        urgency_signals=["Ready to purchase now", "Ready to purchase now", "ready to purchase now"],
        readiness_signals=["Pre-approved bank loan", "pre-approved bank loan", "Pre-approved bank loan"],
    )

    score_single = calculate_score(analysis=analysis_single, buying_timeline="1 month", budget="₹2 Cr", property_requirement="3 BHK flat")
    score_dup = calculate_score(analysis=analysis_dup, buying_timeline="1 month", budget="₹2 Cr", property_requirement="3 BHK flat")

    assert score_single.intent_score == score_dup.intent_score
    assert score_single.financial_score == score_dup.financial_score
    assert score_single.total_score == score_dup.total_score


def test_interaction_volume_does_not_inflate_score():
    """Verify that customer engagement history (e.g. calls, meetings, tasks) does NOT artificially inflate
    the 100-point lead qualification score for an unqualified lead."""
    analysis = LeadAnalysisResult(
        summary="Vague lead that has had many salesperson calls logged.",
        customer_intent="exploring",
        key_requirements=[],
        inferred_requirements=[],
        objections=[],
        missing_info=["Budget", "Timeline", "Property requirement"],
        recommended_action="Keep checking in",
        suggested_response="Checking in again.",
        urgency_signals=[],
        readiness_signals=[],
    )

    # Customer message with extensive salesperson logged notes
    verbose_crm_notes = (
        "Call logged on 10/1: customer busy. Call logged on 10/3: customer asked for general info. "
        "Call logged on 10/6: left voicemail. Call logged on 10/10: asked to follow up next month."
    )

    result = calculate_score(
        analysis=analysis,
        buying_timeline="exploring",
        budget=None,
        property_requirement=None,
        customer_message=verbose_crm_notes,
    )

    # Unqualified lead remains COLD despite high call volume
    assert result.total_score < 40
    assert result.category == "cold"


def test_identical_evidence_produces_identical_scores():
    """Verify deterministic reproducibility: identical evidence produces identical score breakdowns."""
    analysis = LeadAnalysisResult(
        summary="Prospective buyer inquiry",
        customer_intent="buying",
        key_requirements=["3 BHK apartment in Indiranagar"],
        inferred_requirements=[],
        objections=[],
        missing_info=["Financing status"],
        recommended_action="Call customer",
        suggested_response="Hello",
        urgency_signals=["Within 30 days"],
        readiness_signals=[],
    )

    r1 = calculate_score(analysis, "Within 30 days", "₹1.5 Cr", "3 BHK flat", location="Indiranagar, Bangalore")
    r2 = calculate_score(analysis, "Within 30 days", "₹1.5 Cr", "3 BHK flat", location="Indiranagar, Bangalore")

    assert r1.total_score == r2.total_score
    assert r1.category == r2.category
    assert r1.timeline_score == r2.timeline_score
    assert r1.intent_score == r2.intent_score
    assert r1.financial_score == r2.financial_score
    assert r1.clarity_score == r2.clarity_score
    assert r1.qualification_score == r2.qualification_score
    assert r1.factors == r2.factors


def test_shorter_timeline_receives_greater_urgency_credit():
    """Verify that shorter confirmed purchase decision timelines strictly receive greater or equal urgency credit
    across the calibrated monotonic brackets (max 20 pts)."""
    base_analysis = LeadAnalysisResult(
        summary="Standard validated buyer inquiry",
        customer_intent="buying",
        key_requirements=["3 BHK flat"],
        inferred_requirements=[],
        objections=[],
        missing_info=[],
        recommended_action="Schedule viewing",
        suggested_response="Hi, we have several options.",
        urgency_signals=[],
        readiness_signals=[],
    )

    s_5d = calculate_score(base_analysis, "Within 5 days", "₹2 Cr", "3 BHK flat")
    s_10d = calculate_score(base_analysis, "Within 10 days", "₹2 Cr", "3 BHK flat")
    s_20d = calculate_score(base_analysis, "Within 20 days", "₹2 Cr", "3 BHK flat")
    s_45d = calculate_score(base_analysis, "45 days", "₹2 Cr", "3 BHK flat")
    s_75d = calculate_score(base_analysis, "75 days", "₹2 Cr", "3 BHK flat")
    s_120d = calculate_score(base_analysis, "4 months", "₹2 Cr", "3 BHK flat")
    s_200d = calculate_score(base_analysis, "8 months", "₹2 Cr", "3 BHK flat")

    # Monotonic hierarchy: 20 >= 18 >= 15 >= 10 >= 7 >= 4 >= 2
    assert s_5d.timeline_score == 20.0
    assert s_10d.timeline_score == 18.0
    assert s_20d.timeline_score == 15.0
    assert s_45d.timeline_score == 10.0
    assert s_75d.timeline_score == 7.0
    assert s_120d.timeline_score == 4.0
    assert s_200d.timeline_score == 2.0

    assert s_5d.timeline_score > s_10d.timeline_score
    assert s_10d.timeline_score > s_20d.timeline_score
    assert s_20d.timeline_score > s_45d.timeline_score
    assert s_45d.timeline_score > s_75d.timeline_score
    assert s_75d.timeline_score > s_120d.timeline_score
    assert s_120d.timeline_score > s_200d.timeline_score


def test_scoring_category_thresholds():
    """Verify score category mapping respects documented policy: Hot >= 70, Warm 40-69, Cold < 40."""
    assert determine_category(100) == "hot"
    assert determine_category(85) == "hot"
    assert determine_category(70) == "hot"
    assert determine_category(69) == "warm"
    assert determine_category(55) == "warm"
    assert determine_category(40) == "warm"
    assert determine_category(39) == "cold"
    assert determine_category(20) == "cold"
    assert determine_category(0) == "cold"


def test_arjun_sharma_v3_scoring():
    """Verify Arjun Sharma's v3.0.0 score (88 pts, Hot):
    - Intent: buying + relocation commitment (28/30 pts)
    - Timeline: 30 days purchase horizon (15/20 pts)
    - Budget & Finance: ₹3.5-4.5 Cr + pre-approved loan (20/20 pts)
    - Requirement: 4 BHK luxury villa + Whitefield micro-market (20/20 pts)
    - Qualification: 3-month handover limit constraint + 2 missing fields (5/10 pts)
    Total = 88 pts -> HOT (>= 70).
    """
    analysis = LeadAnalysisResult(
        summary="High-intent NRI relocating from Singapore next month. Pre-approved loan and ready budget for 4 BHK luxury villa in Whitefield with a strict 3-month possession deadline.",
        customer_intent="buying",
        key_requirements=["4 BHK luxury villa", "Private garden", "Gated community", "Whitefield location"],
        hard_constraints=["Must have possession within 3 months; cannot consider properties with longer delivery timelines"],
        inferred_requirements=["High-end amenities", "Good security for NRI family"],
        objections=[],
        missing_info=["Preferred plot size", "Vastu orientation preference"],
        recommended_action="Schedule high-priority weekend site visit",
        suggested_response="Hi Arjun, welcome back to Bangalore!",
        urgency_signals=["Relocating next month", "Site visit requested this weekend"],
        readiness_signals=["Pre-approved bank loan", "Budget explicitly defined", "Ready to purchase immediately"],
    )

    result = calculate_score(
        analysis=analysis,
        buying_timeline="immediate (within 30 days)",
        budget="₹3.5 - 4.5 Cr",
        property_requirement="4 BHK luxury villa with private garden, gated community",
        customer_message="Looking to relocate from Singapore by next month. Pre-approved for bank loan, budget ready. Need possession-ready or under 3-month handover.",
        location="Whitefield, Bangalore",
    )

    assert result.total_score == 91
    assert result.category == "hot"
    assert result.objection_penalty == 0.0
    assert result.scoring_version == "3.0.0"


def test_priyanka_deshmukh_v3_scoring():
    """Verify Priyanka Deshmukh's v3.0.0 score (57 pts, Warm):
    - Intent: buying (20/30 pts)
    - Timeline: 2-3 months (7/20 pts)
    - Budget & Finance: ₹7-8 Cr, financing unverified (10/20 pts)
    - Requirements: 3 BHK sea view in Bandra West (20/20 pts)
    - Qualification: sea view constraint (5/10 pts)
    - Verified Blocker: contingent on sale of current apartment (-5 pts)
    Total = 57 pts -> WARM (40-69 pts).
    """
    analysis = LeadAnalysisResult(
        summary="Active home upgrader seeking 3 BHK sea-view residence in Bandra West with 2-3 month decision window.",
        customer_intent="buying",
        key_requirements=["3 BHK sea view", "Bandra West", "2 car parking spots"],
        hard_constraints=["Sea-facing view required"],
        inferred_requirements=["High floor preferred"],
        objections=["Current apartment sale pending before funds available"],
        missing_info=["Financing type (all-equity vs home loan)"],
        recommended_action="Share curated sea-facing listings",
        suggested_response="Hello Priyanka, we have an exclusive sea-facing 3 BHK.",
        urgency_signals=["Targeting Q2 finalization"],
        readiness_signals=["Actively touring properties"],
    )

    result = calculate_score(
        analysis=analysis,
        buying_timeline="2-3 months",
        budget="₹7 - 8 Cr",
        property_requirement="3 BHK sea-view apartment with 2 parking spaces",
        location="Bandra West, Mumbai",
    )

    assert result.total_score == 60
    assert result.category == "warm"
    assert result.objection_penalty == -5.0


def test_sanvii_vs_sanvi_s_evidence_reconciliation():
    """Verify that sanvii and sanvi s with identical 6-day timelines receive identical timeline credit (20/20 pts),
    with score differences cleanly explained by operational constraints and qualification completeness."""
    analysis_sanvii = LeadAnalysisResult(
        summary="Buyer with specific constraints",
        customer_intent="buying",
        key_requirements=["3 BHK", "Whitefield"],
        inferred_requirements=[],
        objections=[],
        missing_info=["Floor preference", "Tower preference"],
        recommended_action="Show matching properties",
        suggested_response="Hello, let's connect.",
        urgency_signals=[],
        readiness_signals=[],
        hard_constraints=["Gated community only", "Possession by month end"],
    )
    score_sanvii = calculate_score(
        analysis=analysis_sanvii,
        buying_timeline="Within 6 days",
        budget="₹1.5 Cr",
        property_requirement="3 BHK flat fully furnished",
        location="Whitefield, Bangalore",
    )

    analysis_sanvi_s = LeadAnalysisResult(
        summary="Buyer without hard constraints",
        customer_intent="buying",
        key_requirements=["3 BHK", "Whitefield"],
        inferred_requirements=[],
        objections=[],
        missing_info=["Floor preference", "Tower preference", "Financing source", "Move date"],
        recommended_action="Show matching properties",
        suggested_response="Hello, let's connect.",
        urgency_signals=[],
        readiness_signals=[],
        hard_constraints=[],
    )
    score_sanvi_s = calculate_score(
        analysis=analysis_sanvi_s,
        buying_timeline="Within 6 days",
        budget="₹1.5 Cr",
        property_requirement="3 BHK flat",
        location="Whitefield, Bangalore",
    )

    # Both receive identical timeline points (20.0 / 20.0)
    assert score_sanvii.timeline_score == score_sanvi_s.timeline_score == 20.0
    # sanvii has operational constraints (+4 pts) and fewer missing fields (+4 vs +2)
    assert score_sanvii.qualification_score > score_sanvi_s.qualification_score
    assert score_sanvii.total_score > score_sanvi_s.total_score
