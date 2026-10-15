"""Sales Follow-up Agent — answers questions and manages tasks via tools."""

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools import FunctionTool

from app.agents.groq_client import GroqLiteLLMClient
from app.agents.prompts import SALES_FOLLOWUP_INSTRUCTION
from app.agents.tools import (
    get_lead_context,
    create_followup_task,
    list_followup_tasks,
    update_task_status,
    reschedule_task,
    resolve_lead,
)
from app.core.config import get_settings


def create_sales_followup_agent() -> LlmAgent:
    """Create and return the Sales Follow-up Agent.

    This agent has real database-connected tools for:
    - Retrieving lead context
    - Creating follow-up tasks
    - Listing tasks
    - Updating task status
    - Rescheduling tasks
    - Resolving customer leads by name
    """
    settings = get_settings()
    model_name = settings.resolved_groq_model

    agent = LlmAgent(
        name="sales_followup_agent",
        description="LeadPilot — AI Sales Assistant for MasalNest. Helps salespeople with lead-specific qualification, drafting, and follow-up task management.",
        model=LiteLlm(
            model=model_name,
            api_key=settings.groq_api_key,
            llm_client=GroqLiteLLMClient(),
        ),
        instruction=SALES_FOLLOWUP_INSTRUCTION,
        tools=[
            FunctionTool(func=get_lead_context),
            FunctionTool(func=create_followup_task),
            FunctionTool(func=list_followup_tasks),
            FunctionTool(func=update_task_status),
            FunctionTool(func=reschedule_task),
            FunctionTool(func=resolve_lead),
        ],
    )

    return agent
