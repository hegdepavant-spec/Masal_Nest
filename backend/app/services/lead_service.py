"""Lead management service — coordinates lead CRUD, analysis, and scoring."""

import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.db.models import Lead, LeadAnalysis
from app.db.repositories.lead_repo import LeadRepository
from app.db.repositories.analysis_repo import AnalysisRepository
from app.schemas.analysis import AnalysisResponse, LeadAnalysisResult
from app.schemas.leads import LeadCreate, LeadDetailResponse, LeadResponse, LeadUpdate
from app.schemas.tasks import TaskResponse
from app.services.scoring_service import calculate_score


class LeadService:
    """Application service for lead lifecycle management."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.lead_repo = LeadRepository(db)
        self.analysis_repo = AnalysisRepository(db)

    async def create_lead(self, data: LeadCreate) -> LeadResponse:
        lead = Lead(**data.model_dump())
        lead = await self.lead_repo.create(lead)
        return LeadResponse.model_validate(lead)

    async def get_lead(self, lead_id: str) -> LeadDetailResponse:
        lead = await self.lead_repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError("Lead", lead_id)

        # Build response with latest analysis and tasks
        latest_analysis = None
        if lead.analyses:
            latest_analysis = _analysis_to_response(lead.analyses[0])

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
        return [LeadResponse.model_validate(lead) for lead in leads]

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

        if has_meaningful_change and lead.analyses:
            lead.analysis_stale = True

        lead = await self.lead_repo.update(lead)
        return LeadResponse.model_validate(lead)

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
        )

        # Build scoring evidence JSON
        scoring_evidence = {
            "timeline_score": score_breakdown.timeline_score,
            "intent_score": score_breakdown.intent_score,
            "clarity_score": score_breakdown.clarity_score,
            "next_steps_score": score_breakdown.next_steps_score,
            "objection_penalty": score_breakdown.objection_penalty,
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

        return _analysis_to_response(analysis)


def _analysis_to_response(analysis: LeadAnalysis) -> AnalysisResponse:
    """Convert a LeadAnalysis ORM model to an AnalysisResponse schema."""
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
        score_explanation=analysis.score_explanation,
        created_at=analysis.created_at,
    )
