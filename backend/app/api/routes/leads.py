"""Lead API routes."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.leads import (
    LeadCreate,
    LeadUpdate,
    LeadResponse,
    LeadDetailResponse,
    InteractionExtractRequest,
    InteractionExtractResponse,
)
from app.schemas.analysis import AnalysisResponse
from app.services.lead_service import LeadService
from app.services.agent_service import AgentService
from app.db.repositories.lead_repo import LeadRepository

import logging
import time

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(data: LeadCreate, db: AsyncSession = Depends(get_db)):
    """Create a new customer lead."""
    service = LeadService(db)
    return await service.create_lead(data)


@router.get("", response_model=list[LeadResponse])
async def list_leads(
    search: str | None = None,
    priority: str | None = None,
    status_filter: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
):
    """List all leads with optional search, filtering, and sorting."""
    service = LeadService(db)
    return await service.list_leads(
        search=search,
        priority_category=priority,
        followup_status=status_filter,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/{lead_id}", response_model=LeadDetailResponse)
async def get_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Get a lead's full details including analysis and tasks."""
    service = LeadService(db)
    return await service.get_lead(lead_id)


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, data: LeadUpdate, db: AsyncSession = Depends(get_db)):
    """Update a lead. Marks analysis as stale if relevant fields change."""
    service = LeadService(db)
    return await service.update_lead(lead_id, data)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a lead and all associated data."""
    service = LeadService(db)
    await service.delete_lead(lead_id)


@router.post("/{lead_id}/analyze", response_model=AnalysisResponse)
async def analyze_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Run or re-run AI analysis on a lead. Returns structured analysis with priority score."""
    from app.core.exceptions import NotFoundError
    req_start = time.time()

    lead_repo = LeadRepository(db)
    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        raise NotFoundError("Lead", lead_id)

    logger.info("Incoming analyze request for lead_id=%s, customer='%s'", lead_id, lead.customer_name)

    agent_service = AgentService(db)
    try:
        analysis_result = await agent_service.analyze_lead(lead)
    except Exception as e:
        elapsed = time.time() - req_start
        logger.error(
            "AI lead analysis failed for lead_id=%s after %.2fs: %s",
            lead_id, elapsed, e,
        )
        await db.rollback()
        raise

    # Save analysis and update score
    lead_service = LeadService(db)
    response = await lead_service.save_analysis(lead_id, analysis_result)
    elapsed = time.time() - req_start
    logger.info(
        "AI lead analysis request completed successfully for lead_id=%s in %.2fs (score=%s)",
        lead_id,
        elapsed,
        response.score_breakdown.total_score if response.score_breakdown else "N/A",
    )
    return response


@router.post("/{lead_id}/brief")
async def generate_call_brief(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Generate a call preparation brief for a lead."""
    from app.core.exceptions import NotFoundError

    lead_repo = LeadRepository(db)
    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        raise NotFoundError("Lead", lead_id)

    agent_service = AgentService(db)
    brief = await agent_service.generate_call_brief(lead)
    return {"lead_id": lead_id, "call_brief": brief}


@router.post("/{lead_id}/extract-interaction", response_model=InteractionExtractResponse)
async def extract_interaction(
    lead_id: str,
    data: InteractionExtractRequest,
    db: AsyncSession = Depends(get_db),
):
    """Use LeadPilot to extract proposed customer updates from interaction notes."""
    from app.core.exceptions import NotFoundError

    lead_repo = LeadRepository(db)
    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        raise NotFoundError("Lead", lead_id)

    agent_service = AgentService(db)
    return await agent_service.extract_interaction_updates(lead, data.outcome, data.notes)


@router.post("/recalculate-scores")
async def recalculate_all_scores(db: AsyncSession = Depends(get_db)):
    """Recalculate lead scores for all leads using the deterministic v3.0 formula without re-invoking LLM."""
    service = LeadService(db)
    count = await service.recalculate_all_scores()
    return {"message": f"Successfully recalculated scores for {count} leads", "recalculated_count": count, "scoring_version": "3.0.0"}


@router.post("/{lead_id}/recalculate-score", response_model=LeadDetailResponse)
async def recalculate_lead_score(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Recalculate single lead score using deterministic v3.0 formula without re-invoking LLM."""
    service = LeadService(db)
    return await service.recalculate_lead_score(lead_id)


