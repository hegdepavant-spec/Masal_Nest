"""Repository for LeadAnalysis persistence."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import LeadAnalysis


class AnalysisRepository:
    """Data-access layer for lead analyses."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, analysis: LeadAnalysis) -> LeadAnalysis:
        self.db.add(analysis)
        await self.db.flush()
        await self.db.refresh(analysis)
        return analysis

    async def get_latest_for_lead(self, lead_id: str) -> LeadAnalysis | None:
        stmt = (
            select(LeadAnalysis)
            .where(LeadAnalysis.lead_id == lead_id)
            .order_by(LeadAnalysis.created_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_lead(self, lead_id: str) -> list[LeadAnalysis]:
        stmt = (
            select(LeadAnalysis)
            .where(LeadAnalysis.lead_id == lead_id)
            .order_by(LeadAnalysis.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, analysis: LeadAnalysis) -> LeadAnalysis:
        await self.db.flush()
        await self.db.refresh(analysis)
        return analysis
