"""Repository for FollowupTask CRUD operations."""

from datetime import date

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import FollowupTask


class TaskRepository:
    """Data-access layer for follow-up tasks."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, task: FollowupTask) -> FollowupTask:
        self.db.add(task)
        await self.db.flush()
        await self.db.refresh(task, attribute_names=["lead"])
        return task

    async def get_by_id(self, task_id: str) -> FollowupTask | None:
        stmt = select(FollowupTask).where(FollowupTask.id == task_id).options(selectinload(FollowupTask.lead))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_tasks(
        self,
        lead_id: str | None = None,
        status: str | None = None,
        due_before: date | None = None,
    ) -> list[FollowupTask]:
        stmt = select(FollowupTask).options(selectinload(FollowupTask.lead))

        if lead_id:
            stmt = stmt.where(FollowupTask.lead_id == lead_id)
        if status:
            stmt = stmt.where(FollowupTask.status == status)
        if due_before:
            stmt = stmt.where(FollowupTask.due_date <= due_before)

        stmt = stmt.order_by(FollowupTask.due_date.asc().nullslast(), FollowupTask.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, task: FollowupTask) -> FollowupTask:
        await self.db.flush()
        return task

    async def count_by_status(self) -> dict[str, int]:
        stmt = select(FollowupTask.status, func.count(FollowupTask.id)).group_by(FollowupTask.status)
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    async def count_overdue(self, as_of: date | None = None) -> int:
        target_date = as_of or date.today()
        stmt = select(func.count(FollowupTask.id)).where(
            FollowupTask.due_date < target_date,
            FollowupTask.status.in_(["pending", "in_progress"]),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def count_due_today(self, as_of: date | None = None) -> int:
        target_date = as_of or date.today()
        stmt = select(func.count(FollowupTask.id)).where(
            FollowupTask.due_date == target_date,
            FollowupTask.status.in_(["pending", "in_progress"]),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def delete(self, task: FollowupTask) -> None:
        await self.db.delete(task)
        await self.db.flush()
