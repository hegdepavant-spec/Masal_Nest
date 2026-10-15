"""Comprehensive unit tests for timeline normalization and urgency scoring."""

from datetime import date

import pytest

from app.services.timeline_service import (
    TimelineInfo,
    normalize_timeline,
)


def test_immediate_and_asap_timelines():
    for phrase in ["Immediately", "ASAP", "immediate", "urgent", "right now"]:
        info = normalize_timeline(phrase)
        assert info.timeline_status == "specified"
        assert info.urgency_level == "very_high"
        assert info.maximum_days in (0, 1)
        assert info.confidence >= 0.95


def test_this_week_and_seven_days():
    ref_date = date(2026, 10, 14)  # Wednesday (weekday 2)
    info_week = normalize_timeline("this week", reference_date=ref_date)
    assert info_week.timeline_status == "specified"
    assert info_week.urgency_level == "very_high"
    assert info_week.maximum_days == 5  # Wednesday to Sunday

    info_7 = normalize_timeline("within 7 days")
    assert info_7.timeline_status == "specified"
    assert info_7.urgency_level == "very_high"
    assert info_7.maximum_days == 7


def test_within_20_days_normalization():
    """Specific regression test for user problem: 'within 20 days'."""
    info = normalize_timeline("within 20 days")
    assert info.timeline_status == "specified"
    assert info.minimum_days == 1
    assert info.maximum_days == 20
    assert info.normalized_label == "Within 20 days"
    assert info.urgency_level == "high"
    assert info.confidence == 1.0


def test_in_three_weeks_word_number():
    info = normalize_timeline("in three weeks")
    assert info.timeline_status == "specified"
    assert info.maximum_days == 21
    assert info.normalized_label == "3 weeks"
    assert info.urgency_level == "high"


def test_by_end_of_this_month_calendar_aware():
    ref_date = date(2026, 10, 14)  # October has 31 days
    info = normalize_timeline("by the end of this month", reference_date=ref_date)
    assert info.timeline_status == "specified"
    assert info.maximum_days == 17  # 31 - 14 = 17 days remaining
    assert info.urgency_level == "high"  # 17 days <= 30
    assert "2026-10-31" in info.evidence


def test_next_month_calendar_aware():
    ref_date = date(2026, 10, 14)
    info = normalize_timeline("next month", reference_date=ref_date)
    assert info.timeline_status == "specified"
    # Next month is November (30 days): Nov 1 - Oct 14 = 18 days, Nov 30 - Oct 14 = 47 days
    assert info.minimum_days == 18
    assert info.maximum_days == 47
    assert info.urgency_level == "medium"
    assert "November" in info.evidence or "2026-11" in info.evidence


def test_range_preservation_two_to_three_months():
    """Verify ranges like '2-3 months' are preserved instead of reduced to single arbitrary number."""
    info = normalize_timeline("In 2–3 months")
    assert info.timeline_status == "specified"
    assert info.minimum_days == 60
    assert info.maximum_days == 90
    assert info.normalized_label == "2–3 months"
    assert info.urgency_level == "medium"
    assert info.confidence == 1.0


def test_within_ninety_days():
    info = normalize_timeline("within 90 days")
    assert info.timeline_status == "specified"
    assert info.maximum_days == 90
    assert info.urgency_level == "medium"


def test_six_months_and_one_year():
    info_6m = normalize_timeline("in 6 months")
    assert info_6m.timeline_status == "specified"
    assert info_6m.maximum_days == 180
    assert info_6m.urgency_level == "low"

    info_1y = normalize_timeline("after 1 year")
    assert info_1y.timeline_status == "specified"
    assert info_1y.minimum_days == 365
    assert info_1y.urgency_level == "low"


def test_next_year_calendar_aware():
    ref_date = date(2026, 10, 14)
    info = normalize_timeline("next year", reference_date=ref_date)
    assert info.timeline_status == "specified"
    assert info.minimum_days == (date(2027, 1, 1) - ref_date).days
    assert info.maximum_days == (date(2027, 12, 31) - ref_date).days
    assert info.urgency_level == "low"


def test_exploring_and_no_fixed_timeline():
    phrases = ["I'm just exploring", "not in a hurry", "no fixed timeline", "just exploring"]
    for phrase in phrases:
        info = normalize_timeline(phrase)
        assert info.timeline_status == "exploring"
        assert info.minimum_days is None
        assert info.maximum_days is None
        assert info.urgency_level == "low"
        assert info.confidence >= 0.9


def test_undecided_timeline():
    info = normalize_timeline("I haven't decided yet")
    assert info.timeline_status == "undecided"
    assert info.minimum_days is None
    assert info.maximum_days is None
    assert info.urgency_level == "unknown"


def test_conditional_timeline_loan_approval():
    info = normalize_timeline("timeline depends on loan approval")
    assert info.timeline_status == "conditional"
    assert info.minimum_days is None
    assert info.maximum_days is None
    assert info.urgency_level == "medium"
    assert "loan" in info.normalized_label.lower()


def test_arjun_sharma_exact_constraint_statement():
    """Verify that Arjun Sharma's exact constraint statement correctly:
    1. Interprets 3-month as approximately 90 days, NOT 30 days.
    2. Identifies it as a possession/delivery constraint rather than immediate purchase intent.
    3. Detects the parenthetical (30-day) conflict without blindly converting 90 days to 30 days.
    4. Sets requires_confirmation and has_conflicting_signals.
    5. Preserves the strict delivery cutoff as a hard constraint.
    """
    statement = (
        "Must have possession within a strict 3-month (30-day) handover window; "
        "cannot consider properties with longer delivery timelines."
    )
    info = normalize_timeline(statement)

    assert info.timeline_status == "specified"
    assert info.possession_max_days == 90
    assert info.maximum_days == 90
    assert info.possession_max_days != 30
    assert info.maximum_days != 30
    assert info.urgency_level == "medium"
    assert info.urgency_level != "very_high"  # Not immediate!
    assert info.has_conflicting_signals is True
    assert info.requires_confirmation is True
    assert len(info.hard_constraints) > 0
    assert "90 days" in info.hard_constraints[0] or "3 months" in info.hard_constraints[0]
    assert "3 months" in info.normalized_label
    assert "90 days" in info.normalized_label


def test_standard_timeline_durations_coverage():
    """Verify exact days and urgency for all common prompt expressions."""
    cases = [
        ("Immediately", 1, "very_high"),
        ("as soon as possible", 1, "very_high"),
        ("within 5 days", 5, "very_high"),
        ("within 10 days", 10, "very_high"),
        ("within 20 days", 20, "high"),
        ("within 30 days", 30, "high"),
        ("within 45 days", 45, "medium"),
        ("within 2 months", 60, "medium"),
        ("within 3 months", 90, "medium"),
        ("within 6 months", 180, "low"),
        ("within 1 year", 365, "low"),
    ]
    for text, expected_max_days, expected_urgency in cases:
        info = normalize_timeline(text)
        assert info.maximum_days == expected_max_days, f"Failed for '{text}': got {info.maximum_days}, expected {expected_max_days}"
        assert info.urgency_level == expected_urgency, f"Failed urgency for '{text}': got {info.urgency_level}, expected {expected_urgency}"


def test_flexible_and_undecided_timelines():
    info_flex = normalize_timeline("flexible timeline")
    assert info_flex.timeline_status == "exploring"
    assert info_flex.urgency_level == "low"
    assert info_flex.maximum_days is None
    assert "flexible" in info_flex.normalized_label.lower()

    info_undecided = normalize_timeline("undecided")
    assert info_undecided.timeline_status == "undecided"
    assert info_undecided.urgency_level == "unknown"
    assert info_undecided.maximum_days is None


def test_cannot_consider_possession_later_than_three_months():
    statement = "cannot consider possession later than 3 months"
    info = normalize_timeline(statement)
    assert info.possession_max_days == 90
    assert info.maximum_days == 90
    assert info.urgency_level == "medium"
    assert len(info.hard_constraints) > 0
    assert "cannot consider possession" in info.hard_constraints[0].lower()


def test_purchase_immediately_possession_three_months_separation():
    """Verify that purchase decision urgency and possession requirement are cleanly separated."""
    statement = "purchase immediately, possession in 3 months"
    info = normalize_timeline(statement)

    assert info.purchase_max_days == 1
    assert info.urgency_level == "very_high"  # Immediate purchase intent
    assert info.possession_max_days == 90     # 3-month possession requirement
    assert "Immediate purchase" in info.normalized_label
    assert "3 months" in info.normalized_label
    assert "90 days" in info.normalized_label


def test_conflicting_purchase_timelines_no_fabricated_value():
    """Verify that directly contradictory purchase timelines do not fabricate an arbitrary day count."""
    statement = "immediate but looking in 6 months"
    info = normalize_timeline(statement)

    assert info.timeline_status == "conflicting"
    assert info.has_conflicting_signals is True
    assert info.requires_confirmation is True
    assert info.minimum_days is None
    assert info.maximum_days is None
    assert info.urgency_level == "unknown"

