"""Tests for Sales Copilot contextual chat API and multi-turn conversation."""

import os
from unittest.mock import patch, AsyncMock
import pytest
from httpx import AsyncClient

from app.agents.groq_client import sanitize_messages_for_groq
from app.core.config import get_settings


def test_sanitize_messages_removes_reasoning_content_regression():
    """Regression test for Issue A.
    
    Verifies that Google ADK LiteLlm outgoing messages containing reasoning_content
    in assistant message (messages.2) have reasoning_content stripped before sending to Groq.
    """
    outgoing_messages = [
        {"role": "system", "content": "You are a helpful real estate assistant."},
        {"role": "user", "content": "What is the status of this lead?"},
        {
            "role": "assistant",
            "content": "",
            "reasoning_content": "The user is asking about the lead. I should call get_lead_context.",
            "tool_calls": [
                {
                    "id": "call_123",
                    "type": "function",
                    "function": {"name": "get_lead_context", "arguments": '{"lead_id": "lead-1"}'},
                }
            ],
        },
        {
            "role": "tool",
            "tool_call_id": "call_123",
            "content": '{"customer_name": "Pavan", "priority_score": 63}',
        },
    ]

    sanitized = sanitize_messages_for_groq(outgoing_messages)

    assert len(sanitized) == 4
    # Check messages.2 (index 2)
    assistant_msg = sanitized[2]
    assert assistant_msg["role"] == "assistant"
    assert "reasoning_content" not in assistant_msg
    assert "thought" not in assistant_msg
    assert assistant_msg["tool_calls"][0]["function"]["name"] == "get_lead_context"


@pytest.mark.asyncio
async def test_contextual_chat_endpoint_mocked(client: AsyncClient):
    """Test POST /api/v1/leads/{lead_id}/chat with mocked agent."""
    # 1. Create a lead first
    lead_res = await client.post(
        "/api/v1/leads",
        json={
            "customer_name": "Rohan Mehta",
            "location": "Koramangala, Bangalore",
            "property_requirement": "3 BHK Luxury",
            "budget": "₹3 Cr",
            "buying_timeline": "1 month",
        },
    )
    assert lead_res.status_code == 201
    lead_id = lead_res.json()["id"]

    # 2. Mock AgentService.chat_with_lead_context
    mock_response = "Rohan is looking for a 3 BHK in Koramangala within 1 month. I recommend booking a site visit."
    with patch(
        "app.services.agent_service.AgentService.chat_with_lead_context",
        new_callable=AsyncMock,
        return_value=mock_response,
    ) as mock_chat:
        # Send first message
        chat_res = await client.post(
            f"/api/v1/leads/{lead_id}/chat",
            json={"message": "What should I focus on when calling Rohan?"},
        )
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert data["user_message"]["content"] == "What should I focus on when calling Rohan?"
        assert data["assistant_message"]["content"] == mock_response
        assert mock_chat.called

        # Send second message (multi-turn)
        mock_chat.return_value = "Here is a follow-up action plan."
        chat_res_2 = await client.post(
            f"/api/v1/leads/{lead_id}/chat",
            json={"message": "Draft a WhatsApp follow-up for him."},
        )
        assert chat_res_2.status_code == 200
        data_2 = chat_res_2.json()
        assert data_2["user_message"]["content"] == "Draft a WhatsApp follow-up for him."
        assert data_2["assistant_message"]["content"] == "Here is a follow-up action plan."

        # Verify chat history retrieval
        hist_res = await client.get(f"/api/v1/leads/{lead_id}/chat/history")
        assert hist_res.status_code == 200
        history = hist_res.json()
        assert len(history["messages"]) == 4  # 2 user + 2 assistant messages


@pytest.mark.asyncio
async def test_live_groq_contextual_chat_real_call(client: AsyncClient):
    """Test contextual chat against real Groq API to verify no GroqException occurs."""
    settings = get_settings()
    if not settings.groq_api_key or settings.groq_api_key.startswith("gsk_placeholder"):
        pytest.skip("No real GROQ_API_KEY configured")

    lead_res = await client.post(
        "/api/v1/leads",
        json={
            "customer_name": "Live Test Buyer",
            "location": "Indiranagar",
            "property_requirement": "2 BHK",
            "budget": "₹1.5 Cr",
            "buying_timeline": "Immediate",
        },
    )
    assert lead_res.status_code == 201
    lead_id = lead_res.json()["id"]

    # Real call to /chat
    res = await client.post(
        f"/api/v1/leads/{lead_id}/chat",
        json={"message": "Summarize what this buyer needs in one sentence."},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["assistant_message"]["content"] != ""
    assert len(data["assistant_message"]["content"]) > 10


def test_clean_assistant_response_sanitizes_prompt_echo_and_tool_instructions():
    """Verify clean_assistant_response strips tool commands, internal planning, and prompt echos."""
    from app.services.agent_service import clean_assistant_response

    raw_leaked_output = (
        "Must first retrieve lead context.\n"
        "Use get_lead_context with lead_id.\n"
        "The user wants a friendly WhatsApp invitation for a property site visit.\n\n"
        "**WhatsApp Draft — Friendly & Professional**\n\n"
        "Hi Shobha! 😊\n\n"
        "Hope you're doing well! Would you be free for a visit tomorrow?"
    )

    cleaned = clean_assistant_response(raw_leaked_output)

    assert "Must first retrieve" not in cleaned
    assert "get_lead_context" not in cleaned
    assert "The user wants" not in cleaned
    assert cleaned.startswith("**WhatsApp Draft — Friendly & Professional**")
    assert "Hi Shobha!" in cleaned


@pytest.mark.asyncio
async def test_adk_runner_filters_intermediate_tool_events_and_preserves_final_response():
    """Verify that _run_agent rejects intermediate tool events and extracts only final response."""
    from google.adk.events import Event
    from google.genai import types
    from app.services.agent_service import AgentService
    from app.agents.sales_followup import create_sales_followup_agent

    fc = types.FunctionCall(name="get_lead_context", args={"lead_id": "test-lead-1"})
    event_1 = Event(
        author="agent",
        content=types.Content(
            role="assistant",
            parts=[types.Part(text="Must first retrieve lead context."), types.Part(function_call=fc)],
        ),
    )

    fr = types.FunctionResponse(name="get_lead_context", response={"customer_name": "Shobha"})
    event_2 = Event(
        author="agent",
        content=types.Content(role="tool", parts=[types.Part(function_response=fr)]),
    )

    event_3 = Event(
        author="agent",
        content=types.Content(
            role="assistant",
            parts=[
                types.Part(
                    text="**WhatsApp Draft — Friendly & Professional**\n\nHi Shobha! 😊\n\nLooking forward to showing you the property."
                )
            ],
        ),
    )

    async def mock_run_async(*args, **kwargs):
        yield event_1
        yield event_2
        yield event_3

    service = AgentService(db=None)
    agent = create_sales_followup_agent()

    with patch("google.adk.runners.Runner.run_async", side_effect=mock_run_async):
        response = await service._run_agent(
            agent=agent,
            user_message="Draft a friendly WhatsApp invitation for a property site visit.",
            session_prefix="test",
        )

    assert "Must first retrieve lead context" not in response
    assert "get_lead_context" not in response
    assert response.startswith("**WhatsApp Draft — Friendly & Professional**")
    assert "Hi Shobha!" in response


@pytest.mark.asyncio
async def test_lead_context_isolation_between_leads(client: AsyncClient):
    """Verify that switching leads keeps contexts isolated and passes correct lead IDs."""
    # Create Lead 1
    res1 = await client.post(
        "/api/v1/leads",
        json={"customer_name": "Customer One", "budget": "50L", "property_requirement": "2 BHK"},
    )
    lead1_id = res1.json()["id"]

    # Create Lead 2
    res2 = await client.post(
        "/api/v1/leads",
        json={"customer_name": "Customer Two", "budget": "2 Cr", "property_requirement": "Villa"},
    )
    lead2_id = res2.json()["id"]

    with patch(
        "app.services.agent_service.AgentService.chat_with_lead_context",
        new_callable=AsyncMock,
    ) as mock_chat:
        mock_chat.return_value = "Response grounded in lead context."

        await client.post(f"/api/v1/leads/{lead1_id}/chat", json={"message": "What is their budget?"})
        assert mock_chat.call_args_list[-1].kwargs["lead_id"] == lead1_id

        await client.post(f"/api/v1/leads/{lead2_id}/chat", json={"message": "What is their budget?"})
        assert mock_chat.call_args_list[-1].kwargs["lead_id"] == lead2_id

