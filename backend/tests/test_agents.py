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
    assert len(agent.tools) == 4
    tool_names = [t.name for t in agent.tools]
    assert "get_lead_context" in tool_names
    assert "create_followup_task" in tool_names
    assert "list_followup_tasks" in tool_names
    assert "update_task_status" in tool_names


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
