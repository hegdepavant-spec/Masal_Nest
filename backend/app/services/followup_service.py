"""Follow-up task management service."""

from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.db.models import FollowupTask
from app.db.repositories.task_repo import TaskRepository
from app.db.repositories.lead_repo import LeadRepository
from app.schemas.tasks import TaskCreate, TaskResponse, TaskUpdate


class FollowupService:
    """Application service for follow-up task lifecycle."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.task_repo = TaskRepository(db)
        self.lead_repo = LeadRepository(db)

    async def create_task(self, data: TaskCreate) -> TaskResponse:
        # Verify the lead exists
        lead = await self.lead_repo.get_by_id(data.lead_id)
        if not lead:
            raise NotFoundError("Lead", data.lead_id)

        task = FollowupTask(**data.model_dump())
        task = await self.task_repo.create(task)

        # Update lead followup status if it's "new"
        if lead.followup_status == "new":
            lead.followup_status = "in_progress"
            await self.lead_repo.update(lead)

        return TaskResponse(
            id=task.id,
            lead_id=task.lead_id,
            lead_name=lead.customer_name,
            title=task.title,
            description=task.description,
            action_type=task.action_type,
            status=task.status,
            due_date=task.due_date,
            completed_at=task.completed_at,
            created_by=task.created_by,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    async def update_task(self, task_id: str, data: TaskUpdate) -> TaskResponse:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundError("Task", task_id)

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(task, field, value)

        # Auto-set completed_at when status changes to completed
        if data.status == "completed" and not task.completed_at:
            task.completed_at = date.today()
        elif data.status and data.status != "completed":
            task.completed_at = None

        lead_name = task.lead.customer_name if task.lead else None
        task = await self.task_repo.update(task)
        return TaskResponse(
            id=task.id,
            lead_id=task.lead_id,
            lead_name=lead_name,
            title=task.title,
            description=task.description,
            action_type=task.action_type,
            status=task.status,
            due_date=task.due_date,
            completed_at=task.completed_at,
            created_by=task.created_by,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    async def list_tasks(
        self,
        lead_id: str | None = None,
        status: str | None = None,
        due_before: date | None = None,
    ) -> list[TaskResponse]:
        tasks = await self.task_repo.list_tasks(
            lead_id=lead_id,
            status=status,
            due_before=due_before,
        )
        return [
            TaskResponse(
                id=t.id,
                lead_id=t.lead_id,
                lead_name=t.lead.customer_name if t.lead else None,
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
            for t in tasks
        ]

    async def get_task_metrics(self) -> dict:
        """Get task counts for dashboard."""
        status_counts = await self.task_repo.count_by_status()
        overdue = await self.task_repo.count_overdue()
        return {
            "pending": status_counts.get("pending", 0) + status_counts.get("in_progress", 0),
            "overdue": overdue,
            "completed": status_counts.get("completed", 0),
        }

    async def delete_task(self, task_id: str) -> None:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise NotFoundError("Task", task_id)
        await self.task_repo.delete(task)
