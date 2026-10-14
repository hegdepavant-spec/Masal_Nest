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
