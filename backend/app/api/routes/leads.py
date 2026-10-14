"""Lead API routes."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.leads import LeadCreate, LeadUpdate, LeadResponse, LeadDetailResponse
from app.schemas.analysis import AnalysisResponse
from app.services.lead_service import LeadService
from app.services.agent_service import AgentService
from app.db.repositories.lead_repo import LeadRepository

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
    lead_service = LeadService(db)
    lead_detail = await lead_service.get_lead(lead_id)

    # Get the ORM model for the agent
    lead_repo = LeadRepository(db)
    lead = await lead_repo.get_by_id(lead_id)

    agent_service = AgentService(db)
    analysis_result = await agent_service.analyze_lead(lead)

    # Save analysis and update score
    return await lead_service.save_analysis(lead_id, analysis_result)


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
