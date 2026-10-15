"""Lead management service — coordinates lead CRUD, analysis, and scoring."""

import json
from datetime import datetime, timezone

from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.db.models import Lead, LeadAnalysis
from app.db.repositories.lead_repo import LeadRepository
from app.db.repositories.analysis_repo import AnalysisRepository
from app.schemas.analysis import (
    AnalysisResponse,
    FactorScoreBreakdown,
    LeadAnalysisResult,
    ScoreBreakdownDetail,
    TimelineInfo,
)
from app.schemas.leads import LeadCreate, LeadDetailResponse, LeadResponse, LeadUpdate
from app.schemas.tasks import TaskResponse
from app.services.scoring_service import calculate_score
from app.services.timeline_service import normalize_timeline


def _get_normalized_timeline_for_lead(lead: Lead) -> str | None:
    """Resolve user-friendly normalized timeline label for a lead."""
    state = inspect(lead)
    if "analyses" in state.dict:
        try:
            analyses = state.dict["analyses"]
            if analyses and analyses[0].scoring_evidence:
                ev = json.loads(analyses[0].scoring_evidence)
                if isinstance(ev, dict) and ev.get("timeline_info"):
                    lbl = ev["timeline_info"].get("normalized_label")
                    if lbl and lbl != "Not specified":
                        return lbl
        except Exception:
            pass
    if lead.buying_timeline and lead.buying_timeline.strip():
        info = normalize_timeline(lead.buying_timeline)
        return info.normalized_label
    return None


def _extract_latest_analysis_response(lead: Lead) -> AnalysisResponse | None:
    """Extract latest analysis without triggering async lazy loading."""
    state = inspect(lead)
    if "analyses" in state.dict:
        analyses = state.dict["analyses"]
        if analyses:
            return _analysis_to_response(analyses[0], is_stale=lead.analysis_stale)
    return None


class LeadService:
    """Application service for lead lifecycle management."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.lead_repo = LeadRepository(db)
        self.analysis_repo = AnalysisRepository(db)

    async def create_lead(self, data: LeadCreate) -> LeadResponse:
        lead = Lead(**data.model_dump())
        lead = await self.lead_repo.create(lead)
        resp = LeadResponse.model_validate(lead)
        resp.normalized_timeline = _get_normalized_timeline_for_lead(lead)
        resp.latest_analysis = _extract_latest_analysis_response(lead)
        return resp

    async def get_lead(self, lead_id: str) -> LeadDetailResponse:
        lead = await self.lead_repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError("Lead", lead_id)

        # Build response with latest analysis and tasks
        latest_analysis = _extract_latest_analysis_response(lead)

        tasks = [
            TaskResponse(
                id=t.id,
                lead_id=t.lead_id,
                lead_name=lead.customer_name,
                title=t.title,
                description=t.description,
                action_type=t.action_type,
                status=t.status,
                due_date=t.due_date,
                completed_at=t.completed_at,
                created_by=t.created_by,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in lead.tasks
        ]

        norm_tl = _get_normalized_timeline_for_lead(lead)

        return LeadDetailResponse(
            id=lead.id,
            customer_name=lead.customer_name,
            location=lead.location,
            property_requirement=lead.property_requirement,
            budget=lead.budget,
            buying_timeline=lead.buying_timeline,
            customer_message=lead.customer_message,
            priority_score=lead.priority_score,
            priority_category=lead.priority_category,
            followup_status=lead.followup_status,
            analysis_stale=lead.analysis_stale,
            normalized_timeline=norm_tl,
            created_at=lead.created_at,
            updated_at=lead.updated_at,
            latest_analysis=latest_analysis,
            tasks=tasks,
        )

    async def list_leads(
        self,
        search: str | None = None,
        priority_category: str | None = None,
        followup_status: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> list[LeadResponse]:
        # Validate sort_by to prevent injection
        allowed_sort = {"created_at", "updated_at", "priority_score", "customer_name"}
        if sort_by not in allowed_sort:
            sort_by = "created_at"
        if sort_order not in ("asc", "desc"):
            sort_order = "desc"

        leads = await self.lead_repo.list_leads(
            search=search,
            priority_category=priority_category,
            followup_status=followup_status,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        result_list = []
        for lead in leads:
            resp = LeadResponse.model_validate(lead)
            resp.normalized_timeline = _get_normalized_timeline_for_lead(lead)
            resp.latest_analysis = _extract_latest_analysis_response(lead)
            result_list.append(resp)
        return result_list

    async def update_lead(self, lead_id: str, data: LeadUpdate) -> LeadResponse:
        lead = await self.lead_repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError("Lead", lead_id)

        update_data = data.model_dump(exclude_unset=True)
        has_meaningful_change = False

        # Fields that should invalidate analysis when changed
        analysis_relevant_fields = {
            "customer_name", "location", "property_requirement",
            "budget", "buying_timeline", "customer_message",
        }

        for field, value in update_data.items():
            current_value = getattr(lead, field, None)
            if current_value != value:
                setattr(lead, field, value)
                if field in analysis_relevant_fields:
                    has_meaningful_change = True

        state = inspect(lead)
        has_analysis = (lead.priority_score is not None) or ("analyses" in state.dict and bool(state.dict.get("analyses")))
        if has_meaningful_change and has_analysis:
            lead.analysis_stale = True

        lead = await self.lead_repo.update(lead)
        resp = LeadResponse.model_validate(lead)
        resp.normalized_timeline = _get_normalized_timeline_for_lead(lead)
        resp.latest_analysis = _extract_latest_analysis_response(lead)
        return resp

    async def recalculate_lead_score(self, lead_id: str) -> LeadDetailResponse:
        """Recalculate lead score and breakdown using the deterministic v2.0 formula without re-running LLM."""
        lead = await self.lead_repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError("Lead", lead_id)

        if not lead.analyses:
            return await self.get_lead(lead_id)

        analysis = lead.analyses[0]
        hard_constraints = []
        if analysis.scoring_evidence:
            try:
                ev = json.loads(analysis.scoring_evidence)
                if isinstance(ev, dict):
                    hard_constraints = ev.get("hard_constraints", [])
            except Exception:
                pass

        def _safe_json_loads(val: str | None) -> list:
            if not val:
                return []
            try:
                parsed = json.loads(val)
                return parsed if isinstance(parsed, list) else [parsed]
            except Exception:
                return []

        result = LeadAnalysisResult(
            summary=analysis.summary or "",
            customer_intent=analysis.customer_intent or "Exploring",
            key_requirements=_safe_json_loads(analysis.key_requirements),
            inferred_requirements=_safe_json_loads(analysis.inferred_requirements),
            objections=_safe_json_loads(analysis.objections),
            missing_info=_safe_json_loads(analysis.missing_info),
            recommended_action=analysis.recommended_action or "",
            suggested_response=analysis.suggested_response or "",
            urgency_signals=_safe_json_loads(analysis.urgency_signals),
            readiness_signals=_safe_json_loads(analysis.readiness_signals),
            hard_constraints=hard_constraints,
        )

        score_breakdown = calculate_score(
            analysis=result,
            buying_timeline=lead.buying_timeline,
            budget=lead.budget,
            property_requirement=lead.property_requirement,
            customer_message=lead.customer_message,
            location=lead.location,
        )

        if not hard_constraints and score_breakdown.timeline_info:
            hard_constraints = score_breakdown.timeline_info.hard_constraints

        # Build scoring evidence JSON
        scoring_evidence = {
            "timeline_score": score_breakdown.timeline_score,
            "intent_score": score_breakdown.intent_score,
            "financial_score": score_breakdown.financial_score,
            "clarity_score": score_breakdown.clarity_score,
            "qualification_score": score_breakdown.qualification_score,
            "next_steps_score": score_breakdown.next_steps_score,
            "objection_penalty": score_breakdown.objection_penalty,
            "total_score": score_breakdown.total_score,
            "category": score_breakdown.category,
            "factors": score_breakdown.factors,
            "timeline_info": score_breakdown.timeline_info.model_dump() if score_breakdown.timeline_info else None,
            "scoring_version": score_breakdown.scoring_version,
            "known_features": score_breakdown.known_features,
            "unknown_features": score_breakdown.unknown_features,
            "hard_constraints": hard_constraints,
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        }

        analysis.scoring_evidence = json.dumps(scoring_evidence)
        analysis.score_explanation = score_breakdown.explanation
        await self.analysis_repo.update(analysis)

        lead.priority_score = score_breakdown.total_score
        lead.priority_category = score_breakdown.category
        await self.lead_repo.update(lead)

        return await self.get_lead(lead_id)

    async def recalculate_all_scores(self) -> int:
        """Recalculate scores for all leads in the database."""
        leads = await self.lead_repo.list_leads()
        count = 0
        for l in leads:
            if l.analyses:
                await self.recalculate_lead_score(l.id)
                count += 1
        return count

    async def delete_lead(self, lead_id: str) -> None:
        lead = await self.lead_repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError("Lead", lead_id)
        await self.lead_repo.delete(lead)

    async def save_analysis(
        self,
        lead_id: str,
        result: LeadAnalysisResult,
    ) -> AnalysisResponse:
        """Persist an AI analysis result and update the lead's score."""
        lead = await self.lead_repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError("Lead", lead_id)

        # Calculate deterministic score
        score_breakdown = calculate_score(
            analysis=result,
            buying_timeline=lead.buying_timeline,
            budget=lead.budget,
            property_requirement=lead.property_requirement,
            customer_message=lead.customer_message,
            location=lead.location,
        )

        hard_constraints = getattr(result, "hard_constraints", [])
        if not hard_constraints and score_breakdown.timeline_info:
            hard_constraints = score_breakdown.timeline_info.hard_constraints

        # Build scoring evidence JSON
        scoring_evidence = {
            "timeline_score": score_breakdown.timeline_score,
            "intent_score": score_breakdown.intent_score,
            "financial_score": score_breakdown.financial_score,
            "clarity_score": score_breakdown.clarity_score,
            "qualification_score": score_breakdown.qualification_score,
            "next_steps_score": score_breakdown.next_steps_score,
            "objection_penalty": score_breakdown.objection_penalty,
            "total_score": score_breakdown.total_score,
            "category": score_breakdown.category,
            "factors": score_breakdown.factors,
            "timeline_info": score_breakdown.timeline_info.model_dump() if score_breakdown.timeline_info else None,
            "scoring_version": score_breakdown.scoring_version,
            "known_features": score_breakdown.known_features,
            "unknown_features": score_breakdown.unknown_features,
            "hard_constraints": hard_constraints,
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Create analysis record
        analysis = LeadAnalysis(
            lead_id=lead_id,
            summary=result.summary,
            customer_intent=result.customer_intent,
            key_requirements=json.dumps(result.key_requirements),
            inferred_requirements=json.dumps(result.inferred_requirements),
            objections=json.dumps(result.objections),
            missing_info=json.dumps(result.missing_info),
            recommended_action=result.recommended_action,
            suggested_response=result.suggested_response,
            urgency_signals=json.dumps(result.urgency_signals),
            readiness_signals=json.dumps(result.readiness_signals),
            scoring_evidence=json.dumps(scoring_evidence),
            score_explanation=score_breakdown.explanation,
        )
        analysis = await self.analysis_repo.create(analysis)

        # Update lead score and clear stale flag
        lead.priority_score = score_breakdown.total_score
        lead.priority_category = score_breakdown.category
        lead.analysis_stale = False
        await self.lead_repo.update(lead)

        return _analysis_to_response(analysis, is_stale=False)


def _analysis_to_response(analysis: LeadAnalysis, is_stale: bool = False) -> AnalysisResponse:
    """Convert a LeadAnalysis ORM model to an AnalysisResponse schema."""
    score_breakdown = None
    timeline_info = None
    scoring_version = "2.0.0"
    known_features: list[str] = []
    unknown_features: list[str] = []
    hard_constraints: list[str] = []
    analysis_ts = analysis.created_at

    if analysis.scoring_evidence:
        try:
            ev_data = json.loads(analysis.scoring_evidence)
            if isinstance(ev_data, dict):
                scoring_version = ev_data.get("scoring_version", "2.0.0")
                known_features = ev_data.get("known_features", [])
                unknown_features = ev_data.get("unknown_features", [])
                hard_constraints = ev_data.get("hard_constraints", [])
                if ev_data.get("analysis_timestamp"):
                    try:
                        analysis_ts = datetime.fromisoformat(ev_data["analysis_timestamp"])
                    except Exception:
                        pass

                if ev_data.get("timeline_info"):
                    try:
                        timeline_info = TimelineInfo.model_validate(ev_data["timeline_info"])
                    except Exception:
                        timeline_info = None

                factors_raw = ev_data.get("factors")
                if factors_raw:
                    factors = [FactorScoreBreakdown(**f) for f in factors_raw]
                    score_breakdown = ScoreBreakdownDetail(
                        scoring_version=scoring_version,
                        total_score=ev_data.get("total_score", 0),
                        category=ev_data.get("category", "cold"),
                        factors=factors,
                        timeline_info=timeline_info,
                        analysis_timestamp=analysis_ts,
                        is_stale=is_stale,
                        known_features=known_features,
                        unknown_features=unknown_features,
                    )
                else:
                    # Backward compatibility for existing rows before factors were added
                    timeline_val = float(ev_data.get("timeline_score", ev_data.get("timeline", 0.0)))
                    intent_val = float(ev_data.get("intent_score", ev_data.get("intent", 0.0)))
                    clarity_val = float(ev_data.get("clarity_score", ev_data.get("clarity", 0.0)))
                    next_steps_val = float(ev_data.get("next_steps_score", ev_data.get("next_steps", 0.0)))
                    objection_val = float(ev_data.get("objection_penalty", 0.0))

                    factors = [
                        FactorScoreBreakdown(
                            factor="Purchase Intent",
                            weight=25.0,
                            max_points=25.0,
                            awarded_points=round(intent_val, 1),
                            evidence=f"Declared intent: '{analysis.customer_intent or 'unspecified'}'",
                        ),
                        FactorScoreBreakdown(
                            factor="Buying Timeline Urgency",
                            weight=25.0,
                            max_points=25.0,
                            awarded_points=round(timeline_val, 1),
                            evidence="Timeline and urgency signals",
                        ),
                        FactorScoreBreakdown(
                            factor="Requirement & Budget Specificity",
                            weight=20.0,
                            max_points=20.0,
                            awarded_points=round(clarity_val, 1),
                            evidence="Extracted requirements, budget, and property specifications",
                        ),
                        FactorScoreBreakdown(
                            factor="Verified Customer Engagement",
                            weight=20.0,
                            max_points=20.0,
                            awarded_points=round(next_steps_val, 1),
                            evidence="Identified readiness signals and customer actions",
                        ),
                        FactorScoreBreakdown(
                            factor="Hard Constraints & Feasibility",
                            weight=10.0,
                            max_points=10.0,
                            awarded_points=5.0,
                            evidence="Standard qualification criteria",
                        ),
                    ]
                    raw_total = timeline_val + intent_val + clarity_val + next_steps_val + objection_val
                    tot = max(0, min(100, round(raw_total)))
                    cat = "hot" if tot >= 70 else ("warm" if tot >= 40 else "cold")
                    score_breakdown = ScoreBreakdownDetail(
                        scoring_version=scoring_version,
                        total_score=tot,
                        category=cat,
                        factors=factors,
                        timeline_info=timeline_info,
                        analysis_timestamp=analysis_ts,
                        is_stale=is_stale,
                        known_features=known_features,
                        unknown_features=unknown_features,
                    )
        except Exception:
            score_breakdown = None

    return AnalysisResponse(
        id=analysis.id,
        lead_id=analysis.lead_id,
        summary=analysis.summary,
        customer_intent=analysis.customer_intent,
        key_requirements=json.loads(analysis.key_requirements or "[]"),
        inferred_requirements=json.loads(analysis.inferred_requirements or "[]"),
        objections=json.loads(analysis.objections or "[]"),
        missing_info=json.loads(analysis.missing_info or "[]"),
        recommended_action=analysis.recommended_action,
        suggested_response=analysis.suggested_response,
        urgency_signals=json.loads(analysis.urgency_signals or "[]"),
        readiness_signals=json.loads(analysis.readiness_signals or "[]"),
        hard_constraints=hard_constraints,
        score_explanation=analysis.score_explanation,
        score_breakdown=score_breakdown,
        timeline_info=timeline_info,
        scoring_version=scoring_version,
        is_stale=is_stale,
        created_at=analysis.created_at,
    )
