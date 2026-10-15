"""Market Insights AI Service.

Invokes the existing Groq/LiteLLM integration to generate an indicative
property-price estimate for a given locality query.

Design decisions:
- Reuses the existing GroqLiteLLMClient and LiteLLM integration pattern.
- Does NOT use ADK agent/runner (no tools needed — simple text completion).
- Calls LiteLLM directly for lowest latency and simplest error surface.
- All credentials remain server-side.
- Results are never persisted (no live-data claims stored).
"""

import json
import logging
import re
from typing import Any

from litellm import acompletion

from app.agents.prompts import MARKET_INSIGHTS_PROMPT
from app.core.config import get_settings
from app.core.exceptions import AIServiceError, AIAuthError, AITimeoutError, AIRateLimitError
from app.schemas.market_insights import MarketInsightsRequest, MarketInsightsResponse

logger = logging.getLogger(__name__)


class MarketInsightsService:
    """Generates AI-based indicative property market estimates."""

    def __init__(self):
        self.settings = get_settings()

    async def analyze(self, req: MarketInsightsRequest) -> MarketInsightsResponse:
        """Invoke the LLM and return a structured MarketInsightsResponse.

        Args:
            req: Validated MarketInsightsRequest.

        Returns:
            MarketInsightsResponse with indicative estimates.

        Raises:
            AIServiceError, AIAuthError, AITimeoutError, AIRateLimitError.
        """
        prompt = MARKET_INSIGHTS_PROMPT.format(
            locality=req.locality,
            city=req.city,
            property_type=req.property_type,
            configuration=req.configuration or "Not specified",
            customer_budget=req.customer_budget or "Not specified",
            area_sqft=req.area_sqft or "Not specified",
        )

        messages = [
            {"role": "system", "content": "You are a helpful real estate market assistant. Respond only with valid JSON."},
            {"role": "user", "content": prompt},
        ]

        raw_text = await self._call_llm(messages)
        return self._parse_response(raw_text, req)

    async def _call_llm(self, messages: list[dict[str, Any]]) -> str:
        """Call LiteLLM directly (no ADK runner needed for simple JSON completion)."""
        model = self.settings.resolved_groq_model
        api_key = self.settings.groq_api_key

        if not api_key:
            logger.error("Market insights failed: GROQ_API_KEY is not configured.")
            raise AIAuthError()

        logger.info("Calling Groq model %s for market insights", model)

        try:
            response = await acompletion(
                model=model,
                messages=messages,
                api_key=api_key,
                custom_llm_provider="groq",
                timeout=self.settings.groq_timeout_seconds,
                max_tokens=1200,
                temperature=0.3,  # Lower temperature for more factual responses
            )
        except Exception as e:
            self._handle_error(e)
            raise  # unreachable, but satisfies type checker

        content = response.choices[0].message.content or ""
        if not content.strip():
            raise AIServiceError("AI returned an empty response for market insights.")

        return content

    def _parse_response(self, raw_text: str, req: MarketInsightsRequest) -> MarketInsightsResponse:
        """Parse the LLM's JSON output into a MarketInsightsResponse."""
        json_str = raw_text.strip()

        # Strip markdown code fences if present
        if "```" in json_str:
            match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", json_str, re.DOTALL)
            if match:
                json_str = match.group(1).strip()

        # Extract JSON object boundaries
        start = json_str.find("{")
        end = json_str.rfind("}") + 1
        if start >= 0 and end > start:
            json_str = json_str[start:end]
        else:
            logger.error("Market insights: no JSON object found in LLM response")
            raise AIServiceError("AI returned an unexpected response format. Please try again.")

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error("Market insights JSON parse error: %s | raw: %s", str(e)[:100], raw_text[:300])
            raise AIServiceError("AI returned invalid JSON. Please try again.")

        # Merge location context from the request (not from model output)
        data["locality"] = req.locality
        data["city"] = req.city
        data["property_type"] = req.property_type
        data["configuration"] = req.configuration
        data["data_status"] = "AI_INDICATIVE"  # always forced, never trusted from model

        # Normalize null-like strings from model to actual None
        for field in ("estimated_min_price", "estimated_max_price",
                      "estimated_price_per_sqft_min", "estimated_price_per_sqft_max"):
            val = data.get(field)
            if isinstance(val, str) and val.lower() in ("null", "none", "n/a", ""):
                data[field] = None
            elif val is not None:
                try:
                    data[field] = float(val)
                except (TypeError, ValueError):
                    data[field] = None

        # Ensure list fields are actual lists
        for list_field in ("assumptions", "price_factors", "questions_to_verify"):
            if not isinstance(data.get(list_field), list):
                data[list_field] = []

        # Ensure string fields are strings
        for str_field in ("market_overview", "confidence_note"):
            if not isinstance(data.get(str_field), str) or not data.get(str_field):
                data[str_field] = (
                    "Market estimate not available for this query. Please verify with local agents."
                    if str_field == "market_overview"
                    else "This is an AI-generated indicative estimate based on general knowledge. Not verified market data."
                )

        try:
            return MarketInsightsResponse.model_validate(data)
        except Exception as e:
            logger.error("Market insights schema validation failed: %s", str(e)[:200])
            raise AIServiceError("AI output did not match expected format. Please try again.")

    def _handle_error(self, error: Exception) -> None:
        """Map provider-level errors to application exceptions with safe, categorized logging."""
        err_str = str(error).lower()
        safe_msg = re.sub(r"gsk_[a-zA-Z0-9_-]{10,}", "[REDACTED_API_KEY]", str(error))

        if "timeout" in err_str or "timed out" in err_str:
            logger.warning("Market insights call timed out after %ds", self.settings.groq_timeout_seconds)
            raise AITimeoutError()
        elif "rate" in err_str and "limit" in err_str:
            logger.warning("Market insights call hit Groq rate limit (429)")
            raise AIRateLimitError()
        elif any(k in err_str for k in ("auth", "api key", "401", "invalid_api_key", "unauthorized")):
            logger.error("Market insights call failed authentication (401/Invalid API Key): %s", safe_msg[:120])
            raise AIAuthError()
        elif "model" in err_str and ("not found" in err_str or "not available" in err_str):
            logger.error("Market insights model not found or unavailable: %s", self.settings.resolved_groq_model)
            raise AIServiceError(
                "Configured AI model is not available. Check GROQ_MODEL_NAME setting.",
                code="AI_MODEL_UNAVAILABLE",
            )
        else:
            logger.error("Market insights unexpected error [%s]: %s", type(error).__name__, safe_msg[:150])
            raise AIServiceError(
                f"Market insights AI service error: {safe_msg[:120]}",
                code="AI_SERVICE_ERROR",
            )

