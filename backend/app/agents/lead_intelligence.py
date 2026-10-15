"""Lead Intelligence Agent — analyzes customer information via Groq/LiteLlm."""

from __future__ import annotations

from app.core.config import get_settings


def create_lead_intelligence_agent():
    """Create and return the Lead Intelligence Agent.

    This agent analyzes customer inquiry data and produces structured
    intelligence (intent, requirements, objections, etc.) as JSON.
    It has no tools — it's a pure analysis agent.

    ADK and LiteLLM are imported lazily here so they are only loaded
    when an AI operation is actually triggered (not at application startup).
    """
    # Lazy imports — google.adk ~27 MB, litellm ~111 MB
    from google.adk.agents import LlmAgent
    from google.adk.models.lite_llm import LiteLlm

    from app.agents.groq_client import GroqLiteLLMClient
    from app.agents.prompts import LEAD_INTELLIGENCE_INSTRUCTION

    settings = get_settings()
    model_name = settings.resolved_groq_model

    agent = LlmAgent(
        name="lead_intelligence_agent",
        description="Analyzes customer lead information and extracts structured intelligence for sales prioritization.",
        model=LiteLlm(
            model=model_name,
            api_key=settings.groq_api_key,
            llm_client=GroqLiteLLMClient(),
        ),
        instruction=LEAD_INTELLIGENCE_INSTRUCTION,
    )

    return agent
