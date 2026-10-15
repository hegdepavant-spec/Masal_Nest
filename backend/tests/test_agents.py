"""Tests for agent factory definitions and tools."""

import pytest
from app.agents.lead_intelligence import create_lead_intelligence_agent
from app.agents.sales_followup import create_sales_followup_agent
from app.agents.prompts import LEAD_INTELLIGENCE_INSTRUCTION, SALES_FOLLOWUP_INSTRUCTION, CALL_BRIEF_INSTRUCTION


def test_create_lead_intelligence_agent():
    """Verify Lead Intelligence Agent creation."""
    agent = create_lead_intelligence_agent()
    assert agent.name == "lead_intelligence_agent"
    assert agent.instruction is not None


def test_create_sales_followup_agent():
    """Verify Sales Followup Agent creation and attached FunctionTools."""
    agent = create_sales_followup_agent()
    assert agent.name == "sales_followup_agent"
    assert len(agent.tools) == 6
    tool_names = [t.name for t in agent.tools]
    assert "get_lead_context" in tool_names
    assert "create_followup_task" in tool_names
    assert "list_followup_tasks" in tool_names
    assert "update_task_status" in tool_names
    assert "reschedule_task" in tool_names
    assert "resolve_lead" in tool_names


def test_prompt_formatting():
    """Verify all prompt templates can be properly formatted."""
    p1 = LEAD_INTELLIGENCE_INSTRUCTION.format(
        customer_name="Test Customer",
        location="Bangalore",
        property_requirement="3 BHK",
        budget="₹2 Cr",
        buying_timeline="1 month",
        customer_message="Interested in site visit",
    )
    assert "Test Customer" in p1

    p2 = SALES_FOLLOWUP_INSTRUCTION.format(lead_id="test-lead-123")
    assert "test-lead-123" in p2

    p3 = CALL_BRIEF_INSTRUCTION.format(
        customer_name="Test Customer",
        location="Bangalore",
        property_requirement="3 BHK",
        budget="₹2 Cr",
        buying_timeline="1 month",
        customer_message="Interested",
        summary="Summary text",
        customer_intent="buying",
        key_requirements=["3 BHK"],
        objections=["Price"],
        missing_info=["Financing"],
        recommended_action="Call today",
    )
    assert "Test Customer" in p3


def test_agent_api_key_configured():
    """Verify both agent factories configure api_key on LiteLlm."""
    import os
    from app.core.config import get_settings

    settings = get_settings()
    lead_agent = create_lead_intelligence_agent()
    sales_agent = create_sales_followup_agent()

    assert lead_agent.model._additional_args.get("api_key") == settings.groq_api_key
    assert sales_agent.model._additional_args.get("api_key") == settings.groq_api_key
    assert os.environ.get("GROQ_API_KEY") == settings.groq_api_key
    assert "gpt-oss" in lead_agent.model.model.lower()


def test_handle_ai_error_redacts_api_key():
    """Verify _handle_ai_error masks API keys in error messages and maps 401 to AIAuthError."""
    from app.core.exceptions import AIAuthError, AIServiceError
    from app.services.agent_service import AgentService

    service = AgentService(db=None)

    # 401 or auth error raises AIAuthError
    with pytest.raises(AIAuthError):
        service._handle_ai_error(Exception("401 Unauthorized invalid_api_key"))

    # Generic error with API key in string must have key redacted
    with pytest.raises(AIServiceError) as exc_info:
        service._handle_ai_error(Exception("Unexpected failure with gsk_secretKey123456789ABCDEF while connecting"))

    assert "gsk_secretKey123456789ABCDEF" not in str(exc_info.value.message)
    assert "[REDACTED_API_KEY]" in str(exc_info.value.message)


def test_parse_analysis_response_with_thinking_tags():
    """Verify _parse_analysis_response extracts JSON despite thinking text and markdown blocks."""
    from app.services.agent_service import AgentService

    service = AgentService(db=None)

    raw_llm_output = (
        "<thought>\n"
        "The customer is looking for a 3 BHK in Bangalore with high urgency.\n"
        "</thought>\n"
        "```json\n"
        "{\n"
        '  "summary": "High urgency 3 BHK seeker",\n'
        '  "customer_intent": "buying",\n'
        '  "key_requirements": ["3 BHK", "Indiranagar"],\n'
        '  "inferred_requirements": [],\n'
        '  "objections": [],\n'
        '  "missing_info": [],\n'
        '  "recommended_action": "Call immediately",\n'
        '  "suggested_response": "Hello, we have 3 BHK ready.",\n'
        '  "urgency_signals": ["Immediate"],\n'
        '  "readiness_signals": ["Pre-approved"],\n'
        '  "score_explanation": "Great lead"\n'
        "}\n"
        "```\n"
    )

    result = service._parse_analysis_response(raw_llm_output)
    assert result.customer_intent == "buying"
    assert result.summary == "High urgency 3 BHK seeker"
    assert result.key_requirements == ["3 BHK", "Indiranagar"]


@pytest.mark.asyncio
async def test_live_groq_real_call():
    """Integration test to verify real Groq API connectivity and response format.
    
    Can be run when GROQ_API_KEY is configured.
    """
    import os
    from app.core.config import get_settings
    from app.db.models import Lead
    from app.services.agent_service import AgentService

    settings = get_settings()
    if not settings.groq_api_key or settings.groq_api_key.startswith("gsk_placeholder"):
        pytest.skip("No real GROQ_API_KEY configured")

    lead = Lead(
        id="test-lead-live",
        customer_name="Pooja Sharma",
        location="Indiranagar, Bangalore",
        property_requirement="3 BHK premium apartment",
        budget="₹2.5 Cr",
        buying_timeline="Within 30 days",
        customer_message="Looking for immediate possession flat in Indiranagar. Budget flexible.",
    )

    service = AgentService(db=None)
    result = await service.analyze_lead(lead)

    assert result is not None
    assert result.summary != ""
    assert result.customer_intent in ["buying", "renting", "investing", "selling", "browsing"]
    assert len(result.key_requirements) > 0


def test_handle_ai_error_timeout_mapping():
    """Verify _handle_ai_error maps asyncio.TimeoutError and TimeoutError to AITimeoutError."""
    import asyncio
    from app.core.exceptions import AITimeoutError
    from app.services.agent_service import AgentService

    service = AgentService(db=None)

    with pytest.raises(AITimeoutError):
        service._handle_ai_error(asyncio.TimeoutError())

    with pytest.raises(AITimeoutError):
        service._handle_ai_error(TimeoutError("Socket read timed out"))

    with pytest.raises(AITimeoutError):
        service._handle_ai_error(Exception("Client network connection timed out"))


@pytest.mark.asyncio
async def test_analyze_lead_preflight_missing_key(monkeypatch):
    """Verify analyze_lead raises AIAuthError immediately without invoking network when key is missing."""
    from app.core.exceptions import AIAuthError
    from app.db.models import Lead
    from app.services.agent_service import AgentService

    lead = Lead(id="test-lead-preflight", customer_name="No Key Lead")
    service = AgentService(db=None)
    monkeypatch.setattr(service.settings, "groq_api_key", "")

    with pytest.raises(AIAuthError):
        await service.analyze_lead(lead)

    monkeypatch.setattr(service.settings, "groq_api_key", "your-groq-api-key-here")
    with pytest.raises(AIAuthError):
        await service.analyze_lead(lead)


def test_cors_origins_parsing_flexibility():
    """Verify Settings parses JSON array, comma-separated strings, and strips trailing slashes."""
    from app.core.config import Settings

    s1 = Settings(cors_origins='["https://masal-nest.vercel.app/"]')
    assert s1.cors_origins == ["https://masal-nest.vercel.app"]

    s2 = Settings(cors_origins="https://masal-nest.vercel.app/, http://localhost:5173")
    assert s2.cors_origins == ["https://masal-nest.vercel.app", "http://localhost:5173"]

    s3 = Settings(cors_origins=["https://masal-nest.vercel.app/"])
    assert s3.cors_origins == ["https://masal-nest.vercel.app"]


def test_obsolete_groq_model_fallback():
    """Verify that obsolete llama-4-scout safely falls back to openai/gpt-oss-120b."""
    from app.core.config import Settings

    s = Settings(groq_model_name="meta-llama/llama-4-scout-17b-16e-instruct")
    assert s.resolved_groq_model == "groq/openai/gpt-oss-120b"


@pytest.mark.asyncio
async def test_bounded_timeout_in_run_agent(monkeypatch):
    """Verify that _run_agent enforces bounded timeout via asyncio.wait_for and raises AITimeoutError."""
    import asyncio
    from unittest.mock import MagicMock
    from app.core.exceptions import AITimeoutError
    from app.services.agent_service import AgentService

    service = AgentService(db=None)
    # Set timeout very low for fast testing
    monkeypatch.setattr(service.settings, "groq_timeout_seconds", 0.05)

    mock_agent = MagicMock()
    mock_agent.name = "mock_agent"

    # Mock runner.run_async to simulate a hanging async generator
    class HangingRunner:
        def __init__(self, **kwargs):
            pass

        async def run_async(self, **kwargs):
            await asyncio.sleep(0.5)  # Hangs beyond 0.05s timeout
            yield MagicMock()

    class MockSessionService:
        async def create_session(self, **kwargs):
            session = MagicMock()
            session.id = "session-123"
            return session

    monkeypatch.setattr("google.adk.runners.Runner", HangingRunner)
    monkeypatch.setattr("google.adk.sessions.InMemorySessionService", MockSessionService)

    with pytest.raises(AITimeoutError):
        await service._run_agent(
            agent=mock_agent,
            user_message="Analyze",
            session_prefix="test",
        )

