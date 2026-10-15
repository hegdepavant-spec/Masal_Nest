"""ADK FunctionTool definitions for the Sales Follow-up Agent.

Each function is a real tool that reads from or writes to the database.
They receive a ToolContext from ADK but we use a module-level DB session
injected before agent invocation.
"""

import json
from datetime import date, timedelta

from app.db.models import FollowupTask, Lead
from app.db.repositories.lead_repo import LeadRepository
from app.db.repositories.analysis_repo import AnalysisRepository
from app.db.repositories.task_repo import TaskRepository

# Module-level session reference, set before each agent invocation
_db_session = None


def set_db_session(session):
    """Set the database session for tool functions. Called before agent invocation."""
    global _db_session
    _db_session = session


def _get_db():
    if _db_session is None:
        raise RuntimeError("Database session not set. Call set_db_session() before invoking agent.")
    return _db_session


async def get_lead_context(lead_id: str) -> dict:
    """Retrieve full context for a lead including customer details, latest AI analysis, and follow-up tasks.

    Args:
        lead_id: The UUID of the lead to retrieve.

    Returns:
        A dictionary containing the lead's customer information, AI analysis, and tasks.
    """
    db = _get_db()
    lead_repo = LeadRepository(db)
    analysis_repo = AnalysisRepository(db)
    task_repo = TaskRepository(db)

    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        return {"error": f"Lead {lead_id} not found"}

    # Get latest analysis
    analysis = await analysis_repo.get_latest_for_lead(lead_id)
    analysis_data = {}
    if analysis:
        analysis_data = {
            "summary": analysis.summary,
            "customer_intent": analysis.customer_intent,
            "key_requirements": json.loads(analysis.key_requirements or "[]"),
            "objections": json.loads(analysis.objections or "[]"),
            "missing_info": json.loads(analysis.missing_info or "[]"),
            "recommended_action": analysis.recommended_action,
            "suggested_response": analysis.suggested_response,
            "score_explanation": analysis.score_explanation,
        }

    # Get tasks
    tasks = await task_repo.list_tasks(lead_id=lead_id)
    task_list = [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "action_type": t.action_type,
            "due_date": str(t.due_date) if t.due_date else None,
        }
        for t in tasks
    ]

    return {
        "lead": {
            "id": lead.id,
            "customer_name": lead.customer_name,
            "location": lead.location,
            "property_requirement": lead.property_requirement,
            "budget": lead.budget,
            "buying_timeline": lead.buying_timeline,
            "customer_message": lead.customer_message,
            "priority_score": lead.priority_score,
            "priority_category": lead.priority_category,
            "followup_status": lead.followup_status,
        },
        "analysis": analysis_data,
        "tasks": task_list,
    }


async def create_followup_task(
    lead_id: str,
    title: str,
    description: str = "",
    action_type: str = "other",
    days_until_due: int = 3,
) -> dict:
    """Create a new follow-up task for a lead.

    Args:
        lead_id: The UUID of the lead this task belongs to.
        title: Short title describing the task.
        description: Detailed description of what to do.
        action_type: Type of action — one of: call, email, site_visit, document, other.
        days_until_due: Number of days from now until the task is due. Default 3.

    Returns:
        The created task details.
    """
    db = _get_db()
    task_repo = TaskRepository(db)
    lead_repo = LeadRepository(db)

    # Verify lead exists
    lead = await lead_repo.get_by_id(lead_id)
    if not lead:
        return {"error": f"Lead {lead_id} not found"}

    # Validate action_type
    valid_types = {"call", "email", "site_visit", "document", "other"}
    if action_type not in valid_types:
        action_type = "other"

    clean_title = title.strip()
    due = date.today() + timedelta(days=max(0, days_until_due))

    # Duplicate protection: check if identical incomplete task exists
    existing_tasks = await task_repo.list_tasks(lead_id=lead_id)
    for t in existing_tasks:
        if (
            t.status in ("pending", "in_progress")
            and t.title.strip().lower() == clean_title.lower()
            and t.due_date == due
        ):
            return {
                "task_id": t.id,
                "title": t.title,
                "action_type": t.action_type,
                "due_date": str(t.due_date),
                "status": t.status,
                "message": f"Task '{clean_title}' is already scheduled for {lead.customer_name} (due {t.due_date}).",
            }

    task = FollowupTask(
        lead_id=lead_id,
        title=clean_title,
        description=description,
        action_type=action_type,
        due_date=due,
        created_by="ai",
    )
    task = await task_repo.create(task)

    # Update lead status
    if lead.followup_status == "new":
        lead.followup_status = "in_progress"
        await lead_repo.update(lead)

    return {
        "task_id": task.id,
        "title": task.title,
        "lead_id": lead.id,
        "lead_name": lead.customer_name,
        "action_type": task.action_type,
        "due_date": str(task.due_date),
        "status": task.status,
        "message": f"Task '{clean_title}' created successfully for {lead.customer_name}, due {task.due_date}",
    }


async def list_followup_tasks(lead_id: str) -> dict:
    """List all follow-up tasks for a specific lead.

    Args:
        lead_id: The UUID of the lead.

    Returns:
        A list of tasks with their status and due dates.
    """
    db = _get_db()
    task_repo = TaskRepository(db)

    tasks = await task_repo.list_tasks(lead_id=lead_id)
    return {
        "lead_id": lead_id,
        "total_tasks": len(tasks),
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "action_type": t.action_type,
                "status": t.status,
                "due_date": str(t.due_date) if t.due_date else None,
                "created_by": t.created_by,
            }
            for t in tasks
        ],
    }


async def update_task_status(
    task_id: str,
    new_status: str,
) -> dict:
    """Update the status of a follow-up task.

    Args:
        task_id: The UUID of the task to update.
        new_status: The new status — one of: pending, in_progress, completed, cancelled.

    Returns:
        The updated task details.
    """
    db = _get_db()
    task_repo = TaskRepository(db)

    valid_statuses = {"pending", "in_progress", "completed", "cancelled"}
    if new_status not in valid_statuses:
        return {"error": f"Invalid status '{new_status}'. Must be one of: {valid_statuses}"}

    task = await task_repo.get_by_id(task_id)
    if not task:
        return {"error": f"Task {task_id} not found"}

    task.status = new_status
    if new_status == "completed":
        task.completed_at = date.today()
    else:
        task.completed_at = None

    task = await task_repo.update(task)

    return {
        "task_id": task.id,
        "title": task.title,
        "status": task.status,
        "completed_at": str(task.completed_at) if task.completed_at else None,
        "message": f"Task '{task.title}' status updated to {new_status}",
    }


async def reschedule_task(
    task_id: str,
    days_from_now: int = 1,
    new_due_date: str = "",
) -> dict:
    """Reschedule an existing follow-up task to a new due date.

    Args:
        task_id: The UUID of the task to reschedule.
        days_from_now: Number of days from today for the new due date (default 1).
        new_due_date: Optional explicit ISO date string (YYYY-MM-DD). If provided, overrides days_from_now.

    Returns:
        The updated task details.
    """
    db = _get_db()
    task_repo = TaskRepository(db)

    task = await task_repo.get_by_id(task_id)
    if not task:
        return {"error": f"Task {task_id} not found"}

    if new_due_date and new_due_date.strip():
        try:
            target_date = date.fromisoformat(new_due_date.strip())
        except ValueError:
            target_date = date.today() + timedelta(days=max(0, days_from_now))
    else:
        target_date = date.today() + timedelta(days=max(0, days_from_now))

    task.due_date = target_date
    if task.status == "completed":
        task.status = "pending"
        task.completed_at = None

    task = await task_repo.update(task)

    return {
        "task_id": task.id,
        "title": task.title,
        "due_date": str(task.due_date),
        "status": task.status,
        "message": f"Task '{task.title}' rescheduled to {task.due_date}",
    }


async def resolve_lead(name_query: str) -> dict:
    """Find and resolve a customer lead by name or query keyword.

    Args:
        name_query: Customer name or keyword to search for (e.g. 'Shobha', 'Arjun').

    Returns:
        A dictionary with the resolved lead details or a list if ambiguous.
    """
    db = _get_db()
    lead_repo = LeadRepository(db)

    leads = await lead_repo.list_leads(search=name_query.strip())
    if not leads:
        return {
            "resolved": False,
            "error": f"No customer lead found matching '{name_query}'.",
        }

    if len(leads) == 1:
        lead = leads[0]
        return {
            "resolved": True,
            "lead_id": lead.id,
            "customer_name": lead.customer_name,
            "location": lead.location,
            "property_requirement": lead.property_requirement,
            "priority_category": lead.priority_category,
        }

    # Multiple leads found — ambiguous!
    return {
        "resolved": False,
        "ambiguous": True,
        "message": f"Multiple leads found matching '{name_query}'. Ask the salesperson to clarify which customer they mean.",
        "matches": [
            {
                "lead_id": l.id,
                "customer_name": l.customer_name,
                "location": l.location,
                "property_requirement": l.property_requirement,
            }
            for l in leads[:5]
        ],
    }
