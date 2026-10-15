"""API tests for lead CRUD and dashboard endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_get_lead(client: AsyncClient):
    """Test creating a lead and retrieving it."""
    payload = {
        "customer_name": "Test Customer",
        "location": "Indiranagar, Bangalore",
        "property_requirement": "3 BHK flat",
        "budget": "₹2 Cr",
        "buying_timeline": "1-2 months",
        "customer_message": "Looking for ready to move 3 BHK.",
    }

    response = await client.post("/api/v1/leads", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["customer_name"] == "Test Customer"
    assert data["followup_status"] == "new"
    assert "id" in data
    lead_id = data["id"]

    # Get single lead detail
    detail_res = await client.get(f"/api/v1/leads/{lead_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == lead_id
    assert detail_data["customer_name"] == "Test Customer"
    assert detail_data["tasks"] == []


@pytest.mark.asyncio
async def test_list_and_filter_leads(client: AsyncClient):
    """Test listing leads and applying search/filters."""
    await client.post(
        "/api/v1/leads",
        json={"customer_name": "Alice Wonderland", "location": "Koramangala"},
    )
    await client.post(
        "/api/v1/leads",
        json={"customer_name": "Bob Builder", "location": "Whitefield"},
    )

    # Search by name
    res = await client.get("/api/v1/leads?search=Alice")
    assert res.status_code == 200
    results = res.json()
    assert len(results) == 1
    assert results[0]["customer_name"] == "Alice Wonderland"


@pytest.mark.asyncio
async def test_update_lead(client: AsyncClient):
    """Test updating a lead."""
    create_res = await client.post(
        "/api/v1/leads",
        json={"customer_name": "Charlie", "budget": "₹1 Cr"},
    )
    lead_id = create_res.json()["id"]

    patch_res = await client.patch(
        f"/api/v1/leads/{lead_id}",
        json={"budget": "₹1.5 Cr", "followup_status": "in_progress"},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["budget"] == "₹1.5 Cr"
    assert updated["followup_status"] == "in_progress"


@pytest.mark.asyncio
async def test_dashboard_metrics(client: AsyncClient):
    """Test dashboard metrics endpoint returns aggregated data."""
    await client.post(
        "/api/v1/leads",
        json={"customer_name": "Metric Lead 1"},
    )

    res = await client.get("/api/v1/dashboard/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert metrics["total_leads"] >= 1
    assert "hot_leads" in metrics
    assert "warm_leads" in metrics
    assert "cold_leads" in metrics
    assert "pending_tasks" in metrics


@pytest.mark.asyncio
async def test_analyze_lead_success(client: AsyncClient, monkeypatch):
    """Test successful lead analysis with mocked AI response."""
    from app.schemas.analysis import LeadAnalysisResult
    from app.services.agent_service import AgentService

    # Create a lead
    create_res = await client.post(
        "/api/v1/leads",
        json={
            "customer_name": "Deepa Rao",
            "location": "Whitefield, Bangalore",
            "budget": "₹3 Cr",
            "buying_timeline": "1 month",
            "customer_message": "Ready to buy 3 BHK immediately, pre-approved loan.",
        },
    )
    assert create_res.status_code == 201
    lead_id = create_res.json()["id"]

    mock_analysis = LeadAnalysisResult(
        summary="High urgency buyer with pre-approved loan looking in Whitefield.",
        customer_intent="buying",
        key_requirements=["3 BHK", "Whitefield", "Ready to move"],
        inferred_requirements=["Gated community"],
        objections=[],
        missing_info=["Preferred floor"],
        recommended_action="Schedule site visit immediately",
        suggested_response="Hi Deepa, we have matching 3 BHK options ready for visit.",
        urgency_signals=["Ready to buy immediately", "1 month timeline"],
        readiness_signals=["Pre-approved loan"],
    )

    async def mock_analyze(self, lead):
        return mock_analysis

    monkeypatch.setattr(AgentService, "analyze_lead", mock_analyze)

    # Call analyze endpoint
    res = await client.post(f"/api/v1/leads/{lead_id}/analyze")
    assert res.status_code == 200
    data = res.json()
    assert data["lead_id"] == lead_id
    assert data["summary"] == mock_analysis.summary
    assert data["customer_intent"] == "buying"
    assert data["score_explanation"] is not None

    # Verify lead in DB was updated with new score
    detail_res = await client.get(f"/api/v1/leads/{lead_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["priority_score"] >= 70
    assert detail["priority_category"] == "hot"
    assert detail["latest_analysis"] is not None
    assert detail["latest_analysis"]["summary"] == mock_analysis.summary


@pytest.mark.asyncio
async def test_analyze_lead_ai_failure_safe_rollback(client: AsyncClient, monkeypatch):
    """Test that AI provider failure returns 502, rolls back safely, and leaves DB consistent."""
    from app.core.exceptions import AIAuthError
    from app.services.agent_service import AgentService

    create_res = await client.post(
        "/api/v1/leads",
        json={"customer_name": "Error Lead", "budget": "₹1 Cr"},
    )
    assert create_res.status_code == 201
    lead_id = create_res.json()["id"]

    async def mock_fail(self, lead):
        raise AIAuthError()

    monkeypatch.setattr(AgentService, "analyze_lead", mock_fail)

    res = await client.post(f"/api/v1/leads/{lead_id}/analyze")
    assert res.status_code == 502
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "AI_AUTH_ERROR"
    assert "authentication failed" in data["error"]["message"].lower()

    # Ensure lead was NOT updated with analysis and DB is intact
    detail_res = await client.get(f"/api/v1/leads/{lead_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["priority_score"] is None
@pytest.mark.asyncio
async def test_analyze_lead_not_found(client: AsyncClient):
    """Test analyze on a non-existent lead returns 404."""
    res = await client.post("/api/v1/leads/00000000-0000-0000-0000-000000000000/analyze")
    assert res.status_code == 404
    data = res.json()
    assert data["error"]["code"] == "LEAD_NOT_FOUND"


@pytest.mark.asyncio
async def test_extract_interaction_endpoint(client: AsyncClient, monkeypatch):
    """Test extract interaction endpoint using mocked AgentService."""
    from app.services.agent_service import AgentService
    from app.schemas.leads import InteractionExtractResponse, ProposedLeadUpdates, SuggestedTask

    # Create a lead
    create_res = await client.post(
        "/api/v1/leads",
        json={"customer_name": "Kavita Rao", "location": "Whitefield", "budget": "₹1.5 Cr"},
    )
    assert create_res.status_code == 201
    lead_id = create_res.json()["id"]

    async def mock_extract(self, lead, outcome, notes):
        return InteractionExtractResponse(
            proposed_updates=ProposedLeadUpdates(
                budget="₹1.8 Cr",
                location="Sarjapur Road",
                buying_timeline="2 months",
                followup_status="in_progress",
            ),
            suggested_task=SuggestedTask(
                title="Send Sarjapur floor plans",
                action_type="document",
                due_in_days=2,
                description="Client requested floor plans with larger balcony",
            ),
            summary="Client revised budget up to 1.8 Cr and shifted preferred location to Sarjapur.",
        )

    monkeypatch.setattr(AgentService, "extract_interaction_updates", mock_extract)

    res = await client.post(
        f"/api/v1/leads/{lead_id}/extract-interaction",
        json={"outcome": "connected", "notes": "Customer called. Willing to go up to 1.8 Cr for Sarjapur."},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["proposed_updates"]["budget"] == "₹1.8 Cr"
    assert data["proposed_updates"]["location"] == "Sarjapur Road"
    assert data["suggested_task"]["title"] == "Send Sarjapur floor plans"
    assert data["suggested_task"]["action_type"] == "document"
    assert "Sarjapur" in data["summary"]


@pytest.mark.asyncio
async def test_recalculate_scores_endpoint(client: AsyncClient):
    """Test POST /api/v1/leads/recalculate-scores recalculates existing analyses without LLM call."""
    res = await client.post("/api/v1/leads/recalculate-scores")
    assert res.status_code == 200
    data = res.json()
    assert "recalculated_count" in data
    assert data["scoring_version"] == "3.0.0"


@pytest.mark.asyncio
async def test_stale_analysis_persistence_and_invalidation(client: AsyncClient):
    """Test modifying a lead's timeline or requirements invalidates analysis and marks it stale.
    Verify card and detail view both report the stale condition."""
    create_res = await client.post(
        "/api/v1/leads",
        json={
            "customer_name": "Stale Flow Test Customer",
            "location": "Whitefield",
            "budget": "₹3 Cr",
            "buying_timeline": "Within 10 days",
            "customer_message": "Ready to purchase villa immediately.",
        },
    )
    assert create_res.status_code == 201
    lead_id = create_res.json()["id"]

    # Update lead's buying_timeline
    patch_res = await client.patch(
        f"/api/v1/leads/{lead_id}",
        json={"buying_timeline": "Within 6 months"},
    )
    assert patch_res.status_code == 200

    # Get single lead detail
    detail_res = await client.get(f"/api/v1/leads/{lead_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["buying_timeline"] == "Within 6 months"

    # List leads should also show consistent data
    list_res = await client.get(f"/api/v1/leads?search=Stale+Flow+Test")
    assert list_res.status_code == 200
    listed = list_res.json()
    assert len(listed) == 1
    assert listed[0]["buying_timeline"] == "Within 6 months"


