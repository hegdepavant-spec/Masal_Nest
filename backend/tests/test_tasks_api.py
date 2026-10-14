"""API tests for follow-up task CRUD and automatic completion date setting."""

from datetime import date
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_update_task(client: AsyncClient):
    """Test creating a task for a lead and marking it completed."""
    # First create a lead
    lead_res = await client.post(
        "/api/v1/leads",
        json={"customer_name": "Task Customer", "location": "Delhi"},
    )
    lead_id = lead_res.json()["id"]

    # Create task
    task_payload = {
        "lead_id": lead_id,
        "title": "Call customer to verify requirements",
        "description": "Ask about bedroom size and floor preference",
        "action_type": "call",
        "due_date": str(date.today()),
    }
    task_res = await client.post("/api/v1/tasks", json=task_payload)
    assert task_res.status_code == 201
    task_data = task_res.json()
    assert task_data["title"] == "Call customer to verify requirements"
    assert task_data["status"] == "pending"
    assert task_data["lead_id"] == lead_id
    task_id = task_data["id"]

    # Complete the task
    update_res = await client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"status": "completed"},
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["status"] == "completed"
    assert updated_data["completed_at"] is not None

    # List tasks
    list_res = await client.get(f"/api/v1/tasks?lead_id={lead_id}")
    assert list_res.status_code == 200
    tasks = list_res.json()
    assert len(tasks) == 1
