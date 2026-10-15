"""Tests for the Market Insights service and API route.

All LLM calls are mocked — no real Groq API key required for the test suite.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.market_insights import MarketInsightsRequest, MarketInsightsResponse
from app.services.market_insights_service import MarketInsightsService


# ──────────────────────────────────────────────
# FIXTURES
# ──────────────────────────────────────────────

VALID_RESPONSE_JSON = {
    "market_overview": "Whitefield is a well-established IT corridor in Bengaluru with consistent demand.",
    "estimated_min_price": 7_500_000,
    "estimated_max_price": 11_000_000,
    "currency": "INR",
    "estimated_price_per_sqft_min": 6200,
    "estimated_price_per_sqft_max": 9000,
    "assumptions": [
        "Mid-segment apartment in a gated community",
        "Ready-to-move or under-construction within 2 years",
    ],
    "price_factors": [
        "Floor number and views",
        "Builder reputation",
        "Proximity to IT parks",
        "Amenities (clubhouse, pool, gym)",
    ],
    "budget_assessment": "A ₹1.2 crore budget is at the lower end of the estimated range for a 3 BHK in Whitefield.",
    "questions_to_verify": [
        "Is the customer open to resale properties?",
        "What is their preferred possession timeline?",
        "Do they need a home loan?",
    ],
    "confidence_note": "This is a rough indicative estimate based on general training knowledge. Market prices may have changed.",
    "data_status": "AI_INDICATIVE",
}


def make_llm_response(content: str):
    """Create a mock LiteLLM response object."""
    mock_msg = MagicMock()
    mock_msg.content = content
    mock_choice = MagicMock()
    mock_choice.message = mock_msg
    mock_resp = MagicMock()
    mock_resp.choices = [mock_choice]
    return mock_resp


# ──────────────────────────────────────────────
# REQUEST SCHEMA VALIDATION
# ──────────────────────────────────────────────

class TestMarketInsightsRequest:
    def test_valid_minimal_request(self):
        req = MarketInsightsRequest(locality="Whitefield", city="Bengaluru", property_type="apartment")
        assert req.locality == "Whitefield"
        assert req.city == "Bengaluru"
        assert req.property_type == "apartment"
        assert req.configuration is None
        assert req.customer_budget is None
        assert req.area_sqft is None

    def test_valid_full_request(self):
        req = MarketInsightsRequest(
            locality="Sarjapur Road",
            city="Bengaluru",
            property_type="villa",
            configuration="3BHK",
            customer_budget="₹2.5 crore",
            area_sqft=2200,
        )
        assert req.configuration == "3BHK"
        assert req.area_sqft == 2200.0

    def test_invalid_property_type(self):
        import pytest
        with pytest.raises(Exception):
            MarketInsightsRequest(locality="Test", city="Test", property_type="bungalow")

    def test_invalid_configuration(self):
        with pytest.raises(Exception):
            MarketInsightsRequest(locality="Test", city="Test", property_type="apartment", configuration="studio")

    def test_missing_required_fields(self):
        with pytest.raises(Exception):
            MarketInsightsRequest(property_type="apartment")

    def test_area_sqft_bounds(self):
        with pytest.raises(Exception):
            MarketInsightsRequest(locality="X", city="Y", property_type="apartment", area_sqft=50)


# ──────────────────────────────────────────────
# SERVICE — PARSE RESPONSE
# ──────────────────────────────────────────────

class TestMarketInsightsServiceParse:
    def setup_method(self):
        self.service = MarketInsightsService()
        self.req = MarketInsightsRequest(
            locality="Whitefield",
            city="Bengaluru",
            property_type="apartment",
            configuration="3BHK",
            customer_budget="₹1.2 crore",
        )

    def test_parse_valid_json(self):
        result = self.service._parse_response(json.dumps(VALID_RESPONSE_JSON), self.req)
        assert isinstance(result, MarketInsightsResponse)
        assert result.locality == "Whitefield"
        assert result.city == "Bengaluru"
        assert result.data_status == "AI_INDICATIVE"
        assert result.estimated_min_price == 7_500_000
        assert result.estimated_max_price == 11_000_000

    def test_parse_json_with_markdown_fence(self):
        fenced = f"```json\n{json.dumps(VALID_RESPONSE_JSON)}\n```"
        result = self.service._parse_response(fenced, self.req)
        assert result.market_overview is not None

    def test_parse_null_estimates_from_model(self):
        data = dict(VALID_RESPONSE_JSON)
        data["estimated_min_price"] = None
        data["estimated_max_price"] = None
        data["estimated_price_per_sqft_min"] = None
        data["estimated_price_per_sqft_max"] = None
        result = self.service._parse_response(json.dumps(data), self.req)
        assert result.estimated_min_price is None
        assert result.estimated_max_price is None

    def test_parse_null_string_from_model(self):
        """Model sometimes returns 'null' as a string — should be normalized to None."""
        data = dict(VALID_RESPONSE_JSON)
        data["estimated_min_price"] = "null"
        data["estimated_max_price"] = "null"
        result = self.service._parse_response(json.dumps(data), self.req)
        assert result.estimated_min_price is None
        assert result.estimated_max_price is None

    def test_data_status_always_forced(self):
        """Even if the model returns something else, data_status must be AI_INDICATIVE."""
        data = dict(VALID_RESPONSE_JSON)
        data["data_status"] = "VERIFIED_LIVE_DATA"  # Model tried to claim this
        result = self.service._parse_response(json.dumps(data), self.req)
        assert result.data_status == "AI_INDICATIVE"

    def test_parse_invalid_json_raises(self):
        from app.core.exceptions import AIServiceError
        with pytest.raises(AIServiceError):
            self.service._parse_response("This is not JSON at all", self.req)

    def test_parse_no_json_object_raises(self):
        from app.core.exceptions import AIServiceError
        with pytest.raises(AIServiceError):
            self.service._parse_response("Here is my analysis without any braces", self.req)

    def test_empty_list_fields_default_to_empty(self):
        data = dict(VALID_RESPONSE_JSON)
        data["assumptions"] = None
        data["price_factors"] = None
        data["questions_to_verify"] = None
        result = self.service._parse_response(json.dumps(data), self.req)
        assert isinstance(result.assumptions, list)
        assert isinstance(result.price_factors, list)
        assert isinstance(result.questions_to_verify, list)


# ──────────────────────────────────────────────
# SERVICE — END-TO-END (MOCKED LLM)
# ──────────────────────────────────────────────

class TestMarketInsightsServiceAnalyze:
    def setup_method(self):
        self.service = MarketInsightsService()

    @pytest.mark.asyncio
    async def test_analyze_success(self):
        req = MarketInsightsRequest(
            locality="Whitefield",
            city="Bengaluru",
            property_type="apartment",
            configuration="3BHK",
            customer_budget="₹1.2 crore",
        )
        with patch(
            "app.services.market_insights_service.acompletion",
            new_callable=AsyncMock,
            return_value=make_llm_response(json.dumps(VALID_RESPONSE_JSON)),
        ), patch.object(self.service.settings, "groq_api_key", "gsk_test_key"):
            result = await self.service.analyze(req)

        assert isinstance(result, MarketInsightsResponse)
        assert result.locality == "Whitefield"
        assert result.city == "Bengaluru"
        assert result.data_status == "AI_INDICATIVE"
        assert result.estimated_min_price == 7_500_000

    @pytest.mark.asyncio
    async def test_analyze_no_api_key_raises(self):
        from app.core.exceptions import AIAuthError
        req = MarketInsightsRequest(locality="Unknown", city="Unknown City", property_type="apartment")
        with patch.object(self.service.settings, "groq_api_key", ""):
            with pytest.raises(AIAuthError):
                await self.service.analyze(req)

    @pytest.mark.asyncio
    async def test_analyze_with_null_price_estimates(self):
        """Service correctly handles models that return null for unknown localities."""
        data = dict(VALID_RESPONSE_JSON)
        data["estimated_min_price"] = None
        data["estimated_max_price"] = None
        data["estimated_price_per_sqft_min"] = None
        data["estimated_price_per_sqft_max"] = None
        data["market_overview"] = "Limited data available for this locality."
        data["confidence_note"] = "Insufficient data for a numerical estimate."

        req = MarketInsightsRequest(locality="Unknown Town", city="Unknown City", property_type="apartment")

        with patch(
            "app.services.market_insights_service.acompletion",
            new_callable=AsyncMock,
            return_value=make_llm_response(json.dumps(data)),
        ), patch.object(self.service.settings, "groq_api_key", "gsk_test_key"):
            result = await self.service.analyze(req)

        assert result.estimated_min_price is None
        assert result.estimated_max_price is None
        assert result.market_overview is not None

    @pytest.mark.asyncio
    async def test_analyze_budget_assessment_only_when_budget_provided(self):
        """Budget assessment should be None when no budget supplied."""
        data = dict(VALID_RESPONSE_JSON)
        data["budget_assessment"] = None

        req = MarketInsightsRequest(locality="Whitefield", city="Bengaluru", property_type="apartment")

        with patch(
            "app.services.market_insights_service.acompletion",
            new_callable=AsyncMock,
            return_value=make_llm_response(json.dumps(data)),
        ), patch.object(self.service.settings, "groq_api_key", "gsk_test_key"):
            result = await self.service.analyze(req)

        assert result.budget_assessment is None


# ──────────────────────────────────────────────
# RESPONSE SCHEMA
# ──────────────────────────────────────────────

class TestMarketInsightsResponse:
    def test_response_with_all_fields(self):
        resp = MarketInsightsResponse(**{
            **VALID_RESPONSE_JSON,
            "locality": "Whitefield",
            "city": "Bengaluru",
            "property_type": "apartment",
        })
        assert resp.currency == "INR"
        assert resp.data_status == "AI_INDICATIVE"
        assert len(resp.price_factors) > 0

    def test_response_with_null_prices(self):
        resp = MarketInsightsResponse(
            locality="X",
            city="Y",
            property_type="apartment",
            market_overview="No data",
            currency="INR",
            confidence_note="No estimate available",
            data_status="AI_INDICATIVE",
        )
        assert resp.estimated_min_price is None
        assert resp.estimated_max_price is None
        assert resp.assumptions == []
        assert resp.questions_to_verify == []
