"""Sales Follow-up Agent — answers questions and manages tasks via tools."""

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools import FunctionTool

from app.agents.prompts import SALES_FOLLOWUP_INSTRUCTION
from app.agents.tools import (
    get_lead_context,
    create_followup_task,
    list_followup_tasks,
    update_task_status,
)
from app.core.config import get_settings


def create_sales_followup_agent() -> LlmAgent:
    """Create and return the Sales Follow-up Agent.

    This agent has real database-connected tools for:
    - Retrieving lead context
    - Creating follow-up tasks
    - Listing tasks
    - Updating task status
    """
    settings = get_settings()
    model_name = f"groq/{settings.groq_model_name}"

    agent = LlmAgent(
        name="sales_followup_agent",
        description="Helps salespeople with lead-specific follow-up questions, call preparation, and task management.",
        model=LiteLlm(model=model_name),
        instruction=SALES_FOLLOWUP_INSTRUCTION,
        tools=[
            FunctionTool(fn=get_lead_context),
            FunctionTool(fn=create_followup_task),
            FunctionTool(fn=list_followup_tasks),
            FunctionTool(fn=update_task_status),
        ],
    )

    return agent
