"""Repository for Lead CRUD operations."""

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Lead


class LeadRepository:
    """Data-access layer for leads."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, lead: Lead) -> Lead:
        self.db.add(lead)
        await self.db.flush()
        await self.db.refresh(lead)
        return lead

    async def get_by_id(self, lead_id: str) -> Lead | None:
        stmt = (
            select(Lead)
            .where(Lead.id == lead_id)
            .options(
                selectinload(Lead.analyses),
                selectinload(Lead.tasks),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_leads(
        self,
        search: str | None = None,
        priority_category: str | None = None,
        followup_status: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> list[Lead]:
        stmt = select(Lead)

        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    Lead.customer_name.ilike(pattern),
                    Lead.location.ilike(pattern),
                    Lead.property_requirement.ilike(pattern),
                    Lead.customer_message.ilike(pattern),
                )
            )

        if priority_category:
            stmt = stmt.where(Lead.priority_category == priority_category)

        if followup_status:
            stmt = stmt.where(Lead.followup_status == followup_status)

        # Sorting
        sort_column = getattr(Lead, sort_by, Lead.created_at)
        if sort_order == "asc":
            stmt = stmt.order_by(sort_column.asc())
        else:
            stmt = stmt.order_by(sort_column.desc())

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, lead: Lead) -> Lead:
        await self.db.flush()
        await self.db.refresh(lead)
        return lead

    async def delete(self, lead: Lead) -> None:
        await self.db.delete(lead)
        await self.db.flush()

    async def count(self) -> int:
        from sqlalchemy import func

        stmt = select(func.count(Lead.id))
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def count_by_category(self) -> dict[str, int]:
        from sqlalchemy import func

        stmt = select(Lead.priority_category, func.count(Lead.id)).group_by(Lead.priority_category)
        result = await self.db.execute(stmt)
        return {row[0] or "unscored": row[1] for row in result.all()}
