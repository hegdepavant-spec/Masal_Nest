"""Dedicated, testable buying timeline normalization service.

Interprets natural-language buying timelines, normalizes them into structured
representations (TimelineInfo), and computes calendar-aware day ranges and
urgency levels.
"""

from __future__ import annotations

import calendar
import re
from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field

TimelineStatus = Literal["specified", "exploring", "undecided", "conditional", "conflicting"]
UrgencyLevel = Literal["very_high", "high", "medium", "low", "unknown"]
TimelineCategory = Literal[
    "immediate",      # 0-7 days
    "short_term",     # 8-30 days (~1 month)
    "medium_term",    # 31-90 days (1-3 months)
    "long_term",      # 91-180 days (3-6 months)
    "extended",       # 181+ days (6+ months / 1+ year)
    "flexible",       # flexible, no rush, exploring
    "conditional",    # depends on loan/sale of current property
    "undecided",      # not decided, unclear
    "unknown",        # not provided / cannot parse
]


class TimelineInfo(BaseModel):
    """Structured representation of a buying timeline and possession constraints."""

    timeline_status: TimelineStatus = Field(
        default="undecided",
        description="specified | exploring | undecided | conditional | conflicting",
    )
    timeline_category: TimelineCategory = Field(
        default="unknown",
        description="Categorical duration bucket",
    )
    original_text: str = Field(
        default="",
        description="The customer's original timeline phrase",
    )

    # Purchase decision timeline (when the customer commits/buys)
    purchase_min_days: int | None = Field(
        default=None,
        description="Minimum estimated days to purchase decision",
    )
    purchase_max_days: int | None = Field(
        default=None,
        description="Maximum estimated days to purchase decision",
    )
    purchase_timeline_label: str = Field(
        default="",
        description="Normalized label for purchase decision timeline",
    )

    # Possession / delivery constraint (when the customer needs handover)
    possession_min_days: int | None = Field(
        default=None,
        description="Minimum days until required property handover",
    )
    possession_max_days: int | None = Field(
        default=None,
        description="Maximum days until required property handover",
    )
    possession_deadline_days: int | None = Field(
        default=None,
        description="Maximum days until required property handover (alias/explicit)",
    )
    possession_constraint_label: str = Field(
        default="",
        description="Normalized label for delivery or possession constraint",
    )

    # General / primary bounds (for backward compatibility)
    minimum_days: int | None = Field(
        default=None,
        description="Minimum estimated days to transaction",
    )
    maximum_days: int | None = Field(
        default=None,
        description="Maximum estimated days to transaction",
    )
    normalized_label: str = Field(
        default="",
        description="A readable normalized timeline label",
    )
    urgency_level: UrgencyLevel = Field(
        default="unknown",
        description="very_high | high | medium | low | unknown",
    )

    # Hard constraints & conflict handling
    hard_constraints: list[str] = Field(
        default_factory=list,
        description="Non-negotiable customer constraints (e.g. strict handover window)",
    )
    has_conflicting_signals: bool = Field(
        default=False,
        description="Whether conflicting duration signals were detected in customer input",
    )
    conflict_details: str = Field(
        default="",
        description="Explanation of conflicting signals if present",
    )
    requires_confirmation: bool = Field(
        default=False,
        description="Whether salesperson must confirm timeline details with customer",
    )

    evidence: str = Field(
        default="",
        description="The exact statement or reasoning supporting the interpretation",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Validated confidence score between 0.0 and 1.0",
    )


# Mapping urgency levels to base scores for scoring service
URGENCY_LEVEL_MULTIPLIERS: dict[UrgencyLevel, float] = {
    "very_high": 1.0,  # 0-7 days
    "high": 0.8,       # 8-30 days (~1 month)
    "medium": 0.5,     # 31-90 days (1-3 months)
    "low": 0.2,        # 91+ days (3+ months)
    "unknown": 0.0,    # Undecided / missing
}

# Number words to integer mapping
_WORD_TO_NUMBER: dict[str, int] = {
    "a": 1,
    "an": 1,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "fifteen": 15,
    "twenty": 20,
    "thirty": 30,
    "forty": 40,
    "forty-five": 45,
    "sixty": 60,
    "ninety": 90,
}


def _parse_num(token: str) -> int | None:
    """Parse integer from digit string or number word."""
    token = token.strip().lower()
    if token.isdigit():
        return int(token)
    return _WORD_TO_NUMBER.get(token)


def normalize_timeline(
    timeline_text: str | None,
    reference_date: date | datetime | None = None,
) -> TimelineInfo:
    """Normalize a natural-language buying timeline and possession constraints into structured TimelineInfo.

    Distinguishes:
      - Purchase decision timeline (when customer commits to transaction)
      - Possession / handover requirement (when customer needs property delivery)
      - Hard customer constraints (non-negotiable delivery bounds)
      - Conflicting statements (flags for salesperson confirmation without fabricating precision)

    Args:
        timeline_text: Raw timeline string from customer form or message.
        reference_date: Reference calendar date (defaults to current UTC date).

    Returns:
        TimelineInfo with validated status, category, bounds, labels, urgency, and constraints.
    """
    if not timeline_text or not timeline_text.strip():
        return TimelineInfo(
            timeline_status="undecided",
            timeline_category="unknown",
            original_text="",
            minimum_days=None,
            maximum_days=None,
            normalized_label="Not specified",
            urgency_level="unknown",
            evidence="No buying timeline provided",
            confidence=0.0,
        )

    raw_text = timeline_text.strip()
    clean = raw_text.lower().replace("–", "-").replace("—", "-")
    clean = re.sub(r"\s+", " ", clean)

    # Resolve reference date
    if reference_date is None:
        ref_d = datetime.now(timezone.utc).date()
    elif isinstance(reference_date, datetime):
        ref_d = reference_date.date()
    else:
        ref_d = reference_date

    # -------------------------------------------------------------------------
    # 0. Check Compound Purchase Timeline + Possession/Handover Separation
    # e.g., "within 6 days; possession in 6 months", "Within 1 month (relocation); 3-month handover limit"
    # -------------------------------------------------------------------------
    has_poss_keyword = bool(re.search(r"\b(?:possession|handover|delivery)\b", clean))
    if has_poss_keyword and any(sep in clean for sep in [";", ",", " but ", " and ", " with "]):
        parts = [p.strip() for p in re.split(r"[;,]|\b(?:and|but|with)\b", clean) if p.strip()]
        poss_parts = [p for p in parts if re.search(r"\b(?:possession|handover|delivery)\b", p)]
        purch_parts = [p for p in parts if not re.search(r"\b(?:possession|handover|delivery)\b", p)]

        if poss_parts and purch_parts:
            poss_text = " ".join(poss_parts)
            poss_num_match = re.search(r"(\d+|one|two|three|four|five|six|nine|twelve)\s*-?\s*(months?|days?)", poss_text)
            poss_days = None
            poss_label = ""
            if poss_num_match:
                p_num = _parse_num(poss_num_match.group(1)) or 1
                p_unit = poss_num_match.group(2)
                poss_days = p_num * 30 if "month" in p_unit else p_num
                poss_label = f"Possession within {p_num} {p_unit} (~{poss_days} days)"

            purch_text = " ".join(purch_parts)
            if not re.search(r"\b(?:possession|handover|delivery)\b", purch_text):
                purch_info = normalize_timeline(purch_text, reference_date=ref_d)
                if purch_info.timeline_status != "undecided" or purch_info.urgency_level != "unknown":
                    purch_info.original_text = raw_text
                    purch_info.possession_min_days = max(1, poss_days - 30) if poss_days and poss_days > 30 else 1
                    purch_info.possession_max_days = poss_days
                    purch_info.possession_deadline_days = poss_days
                    purch_info.possession_constraint_label = poss_label
                    if "immediate" in purch_text or "asap" in purch_text:
                        purch_info.purchase_min_days = 0
                        purch_info.purchase_max_days = 1
                        purch_info.purchase_timeline_label = "Immediate purchase decision (0–1 days)"
                        if poss_label:
                            purch_info.normalized_label = f"Immediate purchase · Possession in {p_num} {p_unit} (~{poss_days} days)"
                    else:
                        purch_info.purchase_min_days = purch_info.minimum_days
                        purch_info.purchase_max_days = purch_info.maximum_days
                        purch_info.purchase_timeline_label = purch_info.normalized_label

                    if poss_label and poss_label not in purch_info.hard_constraints:
                        purch_info.hard_constraints.append(poss_label)
                    purch_info.evidence = f"Distinguished purchase decision timeline '{purch_info.normalized_label}' from possession constraint '{poss_label}'"
                    return purch_info

    # -------------------------------------------------------------------------
    # 1. Check Conditional Timelines (e.g. loan approval, property sale)
    # -------------------------------------------------------------------------
    loan_cond_patterns = [
        r"depend(?:s|ing)? on (?:loan|financing|mortgage|approval)",
        r"(?:subject|contingent) to (?:loan|financing|mortgage|approval)",
        r"(?:waiting for|pending) (?:loan|financing|mortgage|approval)",
        r"timeline depends on",
        r"once loan is approved",
    ]
    if any(re.search(pat, clean) for pat in loan_cond_patterns):
        return TimelineInfo(
            timeline_status="conditional",
            timeline_category="conditional",
            original_text=raw_text,
            minimum_days=None,
            maximum_days=None,
            normalized_label="Conditional on loan approval / financing",
            urgency_level="medium",
            evidence=f"Customer indicated timeline depends on loan or external approval: '{raw_text}'",
            confidence=0.92,
        )

    # -------------------------------------------------------------------------
    # 2. Check Exploring / Casual / Flexible / No Fixed Timeline
    # -------------------------------------------------------------------------
    exploring_patterns = [
        r"\b(?:just|merely|only)\s+exploring\b",
        r"\bexploring\b",
        r"\bnot in a hurry\b",
        r"\bno (?:fixed|rush|strict|specific) timeline\b",
        r"\bcasual(?:ly)? (?:looking|browsing)\b",
        r"\bwindow shopping\b",
        r"\bjust looking\b",
        r"\bflexible(?: timeline)?\b",
        r"\bwhenever\b",
    ]
    if any(re.search(pat, clean) for pat in exploring_patterns):
        is_flex = "flexible" in clean
        label = "Flexible timeline" if is_flex else "Exploring (no fixed timeline)"
        return TimelineInfo(
            timeline_status="exploring",
            timeline_category="flexible",
            original_text=raw_text,
            minimum_days=None,
            maximum_days=None,
            normalized_label=label,
            urgency_level="low",
            evidence=f"Customer indicated flexible/exploratory phase: '{raw_text}'",
            confidence=0.95,
        )

    # -------------------------------------------------------------------------
    # 3. Check Undecided / Uncertain
    # -------------------------------------------------------------------------
    undecided_patterns = [
        r"\bhave(?:n't| not) decided(?: yet)?\b",
        r"\bnot decided\b",
        r"\bundecided\b",
        r"\bnot sure\b",
        r"\bno idea\b",
        r"\bunclear\b",
    ]
    if any(re.search(pat, clean) for pat in undecided_patterns):
        return TimelineInfo(
            timeline_status="undecided",
            timeline_category="undecided",
            original_text=raw_text,
            minimum_days=None,
            maximum_days=None,
            normalized_label="Undecided",
            urgency_level="unknown",
            evidence=f"Customer expressed undecided or uncertain timeline: '{raw_text}'",
            confidence=0.90,
        )

    # -------------------------------------------------------------------------
    # 4. Check for Explicit Hard Constraints & Possession / Handover Requirements
    # -------------------------------------------------------------------------
    # Keywords indicating delivery/possession/handover rather than purchase decision
    possession_keywords = ["possession", "handover", "delivery", "possession-ready", "ready to move"]
    has_possession_context = any(kw in clean for kw in possession_keywords)

    # A: Check for customer constraints with parenthetical or conflicting notations
    # Example: "Must have possession within a strict 3-month (30-day) handover window; cannot consider properties with longer delivery timelines."
    handover_conflict_match = re.search(
        r"(?:possession|handover|delivery).*?(\d+|one|two|three|four|five|six|nine|twelve)\s*-?\s*months?\s*\(\s*(\d+)\s*-?\s*days?\s*\)",
        clean,
    )
    if handover_conflict_match:
        m_num = _parse_num(handover_conflict_match.group(1)) or 3
        d_num = int(handover_conflict_match.group(2))
        expected_days = m_num * 30
        hard_constraint_desc = f"Must have possession within {m_num} months (~{expected_days} days); properties with longer delivery timelines excluded"
        return TimelineInfo(
            timeline_status="specified",
            timeline_category="medium_term",
            original_text=raw_text,
            possession_min_days=1,
            possession_max_days=expected_days,
            possession_constraint_label=f"Possession within {m_num} months (~{expected_days} days; handover window)",
            minimum_days=1,
            maximum_days=expected_days,
            normalized_label=f"Possession within {m_num} months (~{expected_days} days; confirmation noted)",
            urgency_level="medium",
            hard_constraints=[hard_constraint_desc],
            has_conflicting_signals=True,
            conflict_details=(
                f"Customer specified a {m_num}-month (~{expected_days} days) possession window with a "
                f"conflicting parenthetical '({d_num}-day)'. Meaningful constraint is {m_num} months "
                f"(~{expected_days} days); salesperson should clarify parenthetical notation."
            ),
            requires_confirmation=True,
            evidence=f"Extracted strict {m_num}-month (~{expected_days} days) possession delivery constraint with parenthetical {d_num}-day notation from '{raw_text}'",
            confidence=0.95,
        )

    # B: Explicit customer constraint: "cannot consider possession later than X months"
    cannot_consider_match = re.search(
        r"cannot consider (?:properties with )?(?:possession|handover|delivery)?\s*(?:later than|longer than|beyond)?\s*(\d+|one|two|three|four|six)\s*-?\s*months?",
        clean,
    )
    if cannot_consider_match:
        m_num = _parse_num(cannot_consider_match.group(1)) or 3
        max_days = m_num * 30
        hard_constraint_desc = f"Cannot consider possession later than {m_num} months (~{max_days} days)"
        return TimelineInfo(
            timeline_status="specified",
            timeline_category="medium_term" if max_days <= 90 else "long_term",
            original_text=raw_text,
            possession_min_days=1,
            possession_max_days=max_days,
            possession_constraint_label=f"Possession strictly within {m_num} months (~{max_days} days)",
            minimum_days=1,
            maximum_days=max_days,
            normalized_label=f"Possession within {m_num} months (~{max_days} days)",
            urgency_level="medium" if max_days <= 90 else "low",
            hard_constraints=[hard_constraint_desc],
            evidence=f"Customer stated strict delivery cutoff: cannot consider possession beyond {m_num} months ({max_days} days)",
            confidence=0.98,
        )

    # C: Combined purchase urgency + separate possession requirement
    # Example: "purchase immediately, possession in 3 months" or "immediate purchase, 3 months handover"
    immediate_with_future_possession = re.search(
        r"(?:purchase|buy|close)\s+(?:immediately|asap|urgent|now).*?(?:possession|handover|delivery)\s+(?:in|within)?\s*(\d+|one|two|three|four|six)\s*-?\s*months?",
        clean,
    ) or re.search(
        r"(?:immediately|asap).*?(?:possession|handover|delivery)\s+(?:in|within)?\s*(\d+|one|two|three|four|six)\s*-?\s*months?",
        clean,
    )
    if immediate_with_future_possession:
        m_num = _parse_num(immediate_with_future_possession.group(1)) or 3
        poss_days = m_num * 30
        return TimelineInfo(
            timeline_status="specified",
            timeline_category="immediate",
            original_text=raw_text,
            purchase_min_days=0,
            purchase_max_days=1,
            purchase_timeline_label="Immediate purchase decision (0–1 days)",
            possession_min_days=poss_days - 30,
            possession_max_days=poss_days,
            possession_constraint_label=f"Possession within {m_num} months (~{poss_days} days)",
            minimum_days=0,
            maximum_days=1,
            normalized_label=f"Immediate purchase · Possession in {m_num} months (~{poss_days} days)",
            urgency_level="very_high",
            evidence=f"Distinguished immediate purchase urgency from {m_num}-month ({poss_days} days) possession constraint: '{raw_text}'",
            confidence=0.98,
        )

    # D: Dedicated possession deadline without separate purchase urgency
    # Example: "under 3-month handover", "possession within 3 months", "possession in 60 days"
    possession_only_match = re.search(
        r"(?:possession|handover|delivery|possession-ready)\s*(?:ready|within|in|under)?\s*(\d+|one|two|three|four|five|six|nine|twelve)\s*-?\s*(months?|days?)",
        clean,
    ) or re.search(
        r"(?:under|within)\s*(\d+|one|two|three|four|five|six)\s*-?\s*month\s*handover",
        clean,
    )
    if possession_only_match and not any(kw in clean for kw in ["buying", "purchase", "transact"]):
        num_str = possession_only_match.group(1)
        unit = possession_only_match.group(2) if len(possession_only_match.groups()) >= 2 else "months"
        num = _parse_num(num_str) or 3
        max_days = (num * 30) if "month" in (unit or "months") else num
        min_days = max(1, max_days - 30) if "month" in (unit or "months") and num > 1 else 1

        urgency: UrgencyLevel = "high" if max_days <= 30 else ("medium" if max_days <= 90 else "low")
        cat: TimelineCategory = "short_term" if max_days <= 30 else ("medium_term" if max_days <= 90 else "long_term")

        return TimelineInfo(
            timeline_status="specified",
            timeline_category=cat,
            original_text=raw_text,
            possession_min_days=min_days,
            possession_max_days=max_days,
            possession_deadline_days=max_days,
            possession_constraint_label=f"Possession within {num} {unit} (~{max_days} days)",
            minimum_days=min_days,
            maximum_days=max_days,
            normalized_label=f"Possession within {num} {unit} (~{max_days} days)",
            urgency_level=urgency,
            evidence=f"Parsed possession delivery requirement: {num} {unit} (up to {max_days} days) from '{raw_text}'",
            confidence=0.95,
        )

    # -------------------------------------------------------------------------
    # 5. Check for Conflicting Purchase Statements (e.g. "immediate but 6 months")
    # -------------------------------------------------------------------------
    immediate_terms = [
        r"\b(?:immediately|immediate|asap|as soon as possible|urgent|urgently|right now|at once)\b"
    ]
    long_terms = [r"\b(?:6|six|12|twelve)\s*months?\b", r"\b(?:1|one|2|two)\s*years?\b", r"\bnext year\b"]
    has_imm = any(re.search(p, clean) for p in immediate_terms)
    has_long = any(re.search(p, clean) for p in long_terms)
    if has_imm and has_long and not has_possession_context:
        return TimelineInfo(
            timeline_status="conflicting",
            timeline_category="unknown",
            original_text=raw_text,
            minimum_days=None,
            maximum_days=None,
            normalized_label="Conflicting timeline (requires confirmation)",
            urgency_level="unknown",
            has_conflicting_signals=True,
            conflict_details=f"Customer input contains contradictory timeline expressions: immediate vs long-term horizon ('{raw_text}')",
            requires_confirmation=True,
            evidence=f"Detected conflicting urgency statements in '{raw_text}'; requires agent clarification.",
            confidence=0.90,
        )

    # -------------------------------------------------------------------------
    # 6. Calendar-Dependent Expressions
    # -------------------------------------------------------------------------
    # "by the end of this month" / "end of the month"
    end_of_month_match = re.search(r"\b(?:by (?:the )?)?end of (?:this )?month\b", clean)
    if end_of_month_match:
        _, last_day = calendar.monthrange(ref_d.year, ref_d.month)
        end_date = date(ref_d.year, ref_d.month, last_day)
        days_rem = max(1, (end_date - ref_d).days)
        urgency: UrgencyLevel = "very_high" if days_rem <= 10 else ("high" if days_rem <= 30 else "medium")
        return TimelineInfo(
            timeline_status="specified",
            timeline_category="immediate" if days_rem <= 7 else "short_term",
            original_text=raw_text,
            purchase_min_days=1,
            purchase_max_days=days_rem,
            purchase_timeline_label=f"By end of this month (~{days_rem} days)",
            minimum_days=1,
            maximum_days=days_rem,
            normalized_label=f"By end of this month (~{days_rem} days)",
            urgency_level=urgency,
            evidence=f"Calendar reference {ref_d.isoformat()} to end of month {end_date.isoformat()} ({days_rem} days remaining)",
            confidence=0.95,
        )

    # "next month"
    next_month_match = re.search(r"\bnext month\b", clean)
    if next_month_match and not re.search(r"\b(\d+)\s+next month\b", clean):
        next_month = ref_d.month + 1 if ref_d.month < 12 else 1
        next_year = ref_d.year if ref_d.month < 12 else ref_d.year + 1
        first_of_next = date(next_year, next_month, 1)
        _, last_day_next = calendar.monthrange(next_year, next_month)
        end_of_next = date(next_year, next_month, last_day_next)

        min_days = max(1, (first_of_next - ref_d).days)
        max_days = max(min_days, (end_of_next - ref_d).days)
        urgency: UrgencyLevel = "high" if max_days <= 30 else "medium"
        return TimelineInfo(
            timeline_status="specified",
            timeline_category="short_term" if max_days <= 30 else "medium_term",
            original_text=raw_text,
            purchase_min_days=min_days,
            purchase_max_days=max_days,
            purchase_timeline_label=f"Next month (~{min_days}–{max_days} days)",
            minimum_days=min_days,
            maximum_days=max_days,
            normalized_label=f"Next month (~{min_days}–{max_days} days)",
            urgency_level=urgency,
            evidence=f"Calendar reference {ref_d.isoformat()} to next month ({first_of_next.isoformat()} to {end_of_next.isoformat()})",
            confidence=0.95,
        )

    # "next year"
    next_year_match = re.search(r"\bnext year\b", clean)
    if next_year_match and not re.search(r"\b(\d+)\s+next year\b", clean):
        target_year = ref_d.year + 1
        first_of_year = date(target_year, 1, 1)
        end_of_year = date(target_year, 12, 31)
        min_days = max(1, (first_of_year - ref_d).days)
        max_days = max(min_days, (end_of_year - ref_d).days)
        return TimelineInfo(
            timeline_status="specified",
            timeline_category="extended",
            original_text=raw_text,
            purchase_min_days=min_days,
            purchase_max_days=max_days,
            purchase_timeline_label=f"Next year (~{min_days}–{max_days} days)",
            minimum_days=min_days,
            maximum_days=max_days,
            normalized_label=f"Next year (~{min_days}–{max_days} days)",
            urgency_level="low",
            evidence=f"Calendar reference {ref_d.isoformat()} to next year {target_year}",
            confidence=0.95,
        )

    # "this week"
    this_week_match = re.search(r"\bthis week\b", clean)
    if this_week_match:
        days_rem = max(1, 7 - ref_d.weekday())
        return TimelineInfo(
            timeline_status="specified",
            timeline_category="immediate",
            original_text=raw_text,
            purchase_min_days=1,
            purchase_max_days=days_rem,
            purchase_timeline_label="This week",
            minimum_days=1,
            maximum_days=days_rem,
            normalized_label="This week",
            urgency_level="very_high",
            evidence=f"Identified 'this week' (~{days_rem} days remaining from {ref_d.isoformat()})",
            confidence=1.0,
        )

    # -------------------------------------------------------------------------
    # 7. Day Durations: e.g. "within 5 days", "within 10 days", "within 20 days", "within 30 days", "within 45 days"
    # -------------------------------------------------------------------------
    # Note: Explicitly guard against matching parentheticals when preceded by months
    days_match = re.search(
        r"(?:within|in|under)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty-five|forty|sixty|ninety)\s*days?\b",
        clean,
    )
    if days_match and not re.search(r"months?.*?\(\s*\d+\s*-?\s*days?\s*\)", clean):
        num = _parse_num(days_match.group(1))
        if num is not None:
            min_days = 0 if has_imm else 1
            max_days = num
            urgency: UrgencyLevel
            cat: TimelineCategory
            if num <= 10:
                urgency = "very_high"
                cat = "immediate"
            elif num <= 30:
                urgency = "high"
                cat = "short_term"
            elif num <= 90:
                urgency = "medium"
                cat = "medium_term"
            elif num <= 180:
                urgency = "low"
                cat = "long_term"
            else:
                urgency = "low"
                cat = "extended"

            return TimelineInfo(
                timeline_status="specified",
                timeline_category=cat,
                original_text=raw_text,
                purchase_min_days=min_days,
                purchase_max_days=max_days,
                purchase_timeline_label=f"Within {num} days",
                minimum_days=min_days,
                maximum_days=max_days,
                normalized_label=f"Within {num} days",
                urgency_level=urgency,
                evidence=f"Parsed relative day duration of {num} days from '{raw_text}'",
                confidence=1.0,
            )

    # -------------------------------------------------------------------------
    # 8. Weeks patterns: e.g. "in three weeks", "2 weeks", "within 3 weeks"
    # -------------------------------------------------------------------------
    weeks_match = re.search(
        r"(?:within|in|under)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*weeks?\b",
        clean,
    )
    if weeks_match:
        num = _parse_num(weeks_match.group(1))
        if num is not None:
            max_days = num * 7
            min_days = max(1, (num - 1) * 7) if num > 1 else 1
            urgency: UrgencyLevel = "very_high" if max_days <= 7 else ("high" if max_days <= 30 else "medium")
            cat: TimelineCategory = "immediate" if max_days <= 7 else ("short_term" if max_days <= 30 else "medium_term")

            return TimelineInfo(
                timeline_status="specified",
                timeline_category=cat,
                original_text=raw_text,
                purchase_min_days=min_days,
                purchase_max_days=max_days,
                purchase_timeline_label=f"{num} week{'s' if num != 1 else ''}",
                minimum_days=min_days,
                maximum_days=max_days,
                normalized_label=f"{num} week{'s' if num != 1 else ''}",
                urgency_level=urgency,
                evidence=f"Parsed week duration: {num} week(s) ({min_days}–{max_days} days)",
                confidence=0.98,
            )

    # -------------------------------------------------------------------------
    # 9. Month ranges: e.g. "2-3 months", "in 2–3 months", "3 to 6 months"
    # -------------------------------------------------------------------------
    range_match = re.search(
        r"(\d+|one|two|three|four|five|six)\s*(?:-|to|–|and)\s*(\d+|two|three|four|five|six|nine|twelve)\s*months?\b",
        clean,
    )
    if range_match:
        n1 = _parse_num(range_match.group(1))
        n2 = _parse_num(range_match.group(2))
        if n1 is not None and n2 is not None:
            start_m, end_m = min(n1, n2), max(n1, n2)
            min_days = start_m * 30
            max_days = end_m * 30
            urgency: UrgencyLevel = "high" if max_days <= 30 else ("medium" if max_days <= 90 else "low")
            cat: TimelineCategory = "short_term" if max_days <= 30 else ("medium_term" if max_days <= 90 else "long_term")

            return TimelineInfo(
                timeline_status="specified",
                timeline_category=cat,
                original_text=raw_text,
                purchase_min_days=min_days,
                purchase_max_days=max_days,
                purchase_timeline_label=f"{start_m}–{end_m} months",
                minimum_days=min_days,
                maximum_days=max_days,
                normalized_label=f"{start_m}–{end_m} months",
                urgency_level=urgency,
                evidence=f"Preserved month range {start_m}–{end_m} months ({min_days}–{max_days} days)",
                confidence=1.0,
            )

    # -------------------------------------------------------------------------
    # 10. Single month duration: e.g. "within 1 month", "in 2 months", "within 3 months", "within 6 months"
    # -------------------------------------------------------------------------
    single_month_match = re.search(
        r"(?:within|in|under)?\s*(\d+|one|two|three|four|five|six|nine|twelve)\s*months?\b",
        clean,
    )
    if single_month_match:
        num = _parse_num(single_month_match.group(1))
        if num is not None:
            max_days = num * 30
            min_days = (num - 1) * 30 if num > 1 else 1
            urgency: UrgencyLevel
            cat: TimelineCategory
            if max_days <= 30:
                urgency = "high"
                cat = "short_term"
            elif max_days <= 90:
                urgency = "medium"
                cat = "medium_term"
            elif max_days <= 180:
                urgency = "low"
                cat = "long_term"
            else:
                urgency = "low"
                cat = "extended"

            return TimelineInfo(
                timeline_status="specified",
                timeline_category=cat,
                original_text=raw_text,
                purchase_min_days=min_days,
                purchase_max_days=max_days,
                purchase_timeline_label=f"{num} month{'s' if num != 1 else ''}",
                minimum_days=min_days,
                maximum_days=max_days,
                normalized_label=f"{num} month{'s' if num != 1 else ''}",
                urgency_level=urgency,
                evidence=f"Parsed month duration: {num} month(s) (approx {max_days} days)",
                confidence=0.98,
            )

    # -------------------------------------------------------------------------
    # 11. Year patterns: e.g. "within 1 year", "after 1 year", "1+ year", "in 2 years"
    # -------------------------------------------------------------------------
    year_match = re.search(
        r"(?:within|after|in|over)?\s*(\d+|one|two|three)\+?\s*years?\b",
        clean,
    )
    if year_match:
        num = _parse_num(year_match.group(1))
        if num is not None:
            min_days = 180 if num == 1 and "within" in clean else num * 365
            max_days = num * 365 if "within" in clean else None
            return TimelineInfo(
                timeline_status="specified",
                timeline_category="extended",
                original_text=raw_text,
                purchase_min_days=min_days,
                purchase_max_days=max_days,
                purchase_timeline_label=f"{num}+ year{'s' if num != 1 else ''}",
                minimum_days=min_days,
                maximum_days=max_days,
                normalized_label=f"{num} year{'s' if num != 1 else ''}" if "within" in clean else f"{num}+ year{'s' if num != 1 else ''}",
                urgency_level="low",
                evidence=f"Parsed long-term horizon: {num} year(s)",
                confidence=0.95,
            )

    # -------------------------------------------------------------------------
    # 12. If immediate/asap was detected without a specific number
    # -------------------------------------------------------------------------
    if has_imm:
        return TimelineInfo(
            timeline_status="specified",
            timeline_category="immediate",
            original_text=raw_text,
            purchase_min_days=0,
            purchase_max_days=1,
            purchase_timeline_label="Immediate (ASAP)",
            minimum_days=0,
            maximum_days=1,
            normalized_label="Immediate (ASAP)",
            urgency_level="very_high",
            evidence=f"Detected immediate urgency term from '{raw_text}'",
            confidence=1.0,
        )

    # -------------------------------------------------------------------------
    # 13. Fallback for unclassified text without fabricating precision
    # -------------------------------------------------------------------------
    return TimelineInfo(
        timeline_status="undecided",
        timeline_category="unknown",
        original_text=raw_text,
        minimum_days=None,
        maximum_days=None,
        normalized_label="Timeline needs clarification",
        urgency_level="unknown",
        evidence=f"Could not conclusively extract structured timeline duration from '{raw_text}'",
        confidence=0.2,
    )
