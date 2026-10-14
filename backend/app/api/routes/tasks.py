"""Task API routes."""

from datetime import date
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.tasks import TaskCreate, TaskUpdate, TaskResponse
from app.services.followup_service import FollowupService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(data: TaskCreate, db: AsyncSession = Depends(get_db)):
    """Create a follow-up task for a lead."""
    service = FollowupService(db)
    return await service.create_task(data)


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    lead_id: str | None = None,
    status: str | None = None,
    due_before: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List tasks with optional filters."""
    service = FollowupService(db)
    return await service.list_tasks(lead_id=lead_id, status=status, due_before=due_before)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, data: TaskUpdate, db: AsyncSession = Depends(get_db)):
    """Update task status or details."""
    service = FollowupService(db)
    return await service.update_task(task_id, data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a task."""
    service = FollowupService(db)
    await service.delete_task(task_id)
