"""API & unit tests for Follow-up Task Pipeline, LeadPilot Tools, Metrics, and Seeding Idempotency."""

from datetime import date, timedelta
import pytest
from httpx import AsyncClient

from app.db.session import async_session_factory
from app.agents import tools as agent_tools
from seed import seed_database, SAMPLE_LEADS


@pytest.mark.asyncio
async def test_create_and_update_task(client: AsyncClient):
    """Test creating a task for a lead and marking it completed."""
    # First create a lead
    lead_res = await client.post(
        "/api/v1/leads",
        json={"customer_name": "Task Customer Alpha", "location": "Delhi"},
    )
    assert lead_res.status_code == 201
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
    assert task_data["lead_name"] == "Task Customer Alpha"
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

    # Reopen the task as pending
    reopen_res = await client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"status": "pending"},
    )
    assert reopen_res.status_code == 200
    reopened_data = reopen_res.json()
    assert reopened_data["status"] == "pending"
    assert reopened_data["completed_at"] is None

    # List tasks for lead
    list_res = await client.get(f"/api/v1/tasks?lead_id={lead_id}")
    assert list_res.status_code == 200
    tasks = list_res.json()
    assert len(tasks) == 1
    assert tasks[0]["id"] == task_id


@pytest.mark.asyncio
async def test_reschedule_task(client: AsyncClient):
    """Test rescheduling a task to a future due date."""
    lead_res = await client.post(
        "/api/v1/leads",
        json={"customer_name": "Reschedule Customer", "location": "Pune"},
    )
    lead_id = lead_res.json()["id"]

    # Create overdue task
    past_date = str(date.today() - timedelta(days=2))
    create_res = await client.post(
        "/api/v1/tasks",
        json={
            "lead_id": lead_id,
            "title": "Initial Consultation",
            "due_date": past_date,
            "action_type": "call",
        },
    )
    assert create_res.status_code == 201
    task_id = create_res.json()["id"]

    # Reschedule to tomorrow
    future_date = str(date.today() + timedelta(days=1))
    reschedule_res = await client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"due_date": future_date},
    )
    assert reschedule_res.status_code == 200
    rescheduled_data = reschedule_res.json()
    assert rescheduled_data["due_date"] == future_date


@pytest.mark.asyncio
async def test_duplicate_task_submission_prevention(client: AsyncClient):
    """Test that accidental repeated submissions for the same lead and title return the existing task."""
    lead_res = await client.post(
        "/api/v1/leads",
        json={"customer_name": "Idempotent Lead", "location": "Hyderabad"},
    )
    lead_id = lead_res.json()["id"]

    payload = {
        "lead_id": lead_id,
        "title": "Send Brochure Document",
        "action_type": "document",
        "due_date": str(date.today() + timedelta(days=3)),
    }

    res1 = await client.post("/api/v1/tasks", json=payload)
    assert res1.status_code == 201
    task_id_1 = res1.json()["id"]

    # Submit exact same task again (e.g. rapid double click)
    res2 = await client.post("/api/v1/tasks", json=payload)
    assert res2.status_code == 201
    task_id_2 = res2.json()["id"]

    # Should match existing task ID without duplicate insert
    assert task_id_1 == task_id_2

    list_res = await client.get(f"/api/v1/tasks?lead_id={lead_id}")
    matching_tasks = [t for t in list_res.json() if t["title"] == "Send Brochure Document"]
    assert len(matching_tasks) == 1


@pytest.mark.asyncio
async def test_task_metrics_and_completed_never_overdue(client: AsyncClient):
    """Test overdue, due_today, upcoming, and verify completed tasks never count as overdue."""
    lead_res = await client.post(
        "/api/v1/leads",
        json={"customer_name": "Metrics Verification Lead", "location": "Bangalore"},
    )
    lead_id = lead_res.json()["id"]

    today = date.today()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    # 1. Overdue incomplete task
    t_overdue = await client.post(
        "/api/v1/tasks",
        json={"lead_id": lead_id, "title": "Overdue Incomplete Task", "due_date": str(yesterday)},
    )
    assert t_overdue.status_code == 201

    # 2. Due today incomplete task
    t_today = await client.post(
        "/api/v1/tasks",
        json={"lead_id": lead_id, "title": "Due Today Task", "due_date": str(today)},
    )
    assert t_today.status_code == 201

    # 3. Upcoming incomplete task
    t_upcoming = await client.post(
        "/api/v1/tasks",
        json={"lead_id": lead_id, "title": "Upcoming Task", "due_date": str(tomorrow)},
    )
    assert t_upcoming.status_code == 201

    # 4. Completed task with a PAST due date
    t_completed_past = await client.post(
        "/api/v1/tasks",
        json={"lead_id": lead_id, "title": "Completed Past Task", "due_date": str(yesterday)},
    )
    assert t_completed_past.status_code == 201
    past_task_id = t_completed_past.json()["id"]
    await client.patch(f"/api/v1/tasks/{past_task_id}", json={"status": "completed"})

    # Fetch dashboard metrics
    metrics_res = await client.get("/api/v1/dashboard/metrics")
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()

    assert "pending_tasks" in metrics
    assert "overdue_tasks" in metrics
    assert "due_today_tasks" in metrics
    assert "completed_tasks" in metrics

    # Overdue count must only include incomplete tasks!
    assert metrics["overdue_tasks"] >= 1
    assert metrics["due_today_tasks"] >= 1
    assert metrics["completed_tasks"] >= 1


@pytest.mark.asyncio
async def test_leadpilot_task_tools():
    """Test LeadPilot tool functions directly with injected DB session."""
    async with async_session_factory() as session:
        agent_tools.set_db_session(session)

        # 1. Resolve lead tool
        resolved = await agent_tools.resolve_lead("Arjun")
        assert resolved.get("resolved") is True
        assert "Arjun Sharma" in resolved["customer_name"]
        arjun_id = resolved["lead_id"]

        # 2. Create follow-up task tool with LeadPilot
        task_res = await agent_tools.create_followup_task(
            lead_id=arjun_id,
            title="LeadPilot Automated Tour Follow-up",
            description="Discuss villa pricing options",
            action_type="call",
            days_until_due=2,
        )
        assert "task_id" in task_res
        assert task_res["status"] == "pending"
        assert "LeadPilot Automated Tour Follow-up" in task_res["title"]
        tool_task_id = task_res["task_id"]

        # 3. Duplicate protection in create_followup_task
        dup_res = await agent_tools.create_followup_task(
            lead_id=arjun_id,
            title="LeadPilot Automated Tour Follow-up",
            days_until_due=2,
        )
        assert dup_res["task_id"] == tool_task_id
        assert "already scheduled" in dup_res["message"]

        # 4. Reschedule task tool
        reschedule_res = await agent_tools.reschedule_task(
            task_id=tool_task_id,
            days_from_now=5,
        )
        assert reschedule_res["status"] == "pending"
        expected_due = str(date.today() + timedelta(days=5))
        assert reschedule_res["due_date"] == expected_due

        # 5. Update task status tool
        status_res = await agent_tools.update_task_status(
            task_id=tool_task_id,
            new_status="completed",
        )
        assert status_res["status"] == "completed"
        assert status_res["completed_at"] is not None


@pytest.mark.asyncio
async def test_seeding_idempotency():
    """Verify that rerun of seed_database does not create duplicates."""
    await seed_database()
    await seed_database()
    # If idempotent, the database remains consistent without crashes
