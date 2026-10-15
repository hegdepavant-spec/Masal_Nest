"""Market Insights API route.

Endpoint: POST /api/v1/market-insights/analyze

Accepts a locality query, invokes the MarketInsightsService,
and returns a structured indicative price estimate.

All Groq API calls are server-side. No credentials are exposed.
"""

import logging

from fastapi import APIRouter, HTTPException, status

from app.core.exceptions import AppError
from app.schemas.market_insights import MarketInsightsRequest, MarketInsightsResponse
from app.services.market_insights_service import MarketInsightsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market-insights", tags=["market-insights"])


@router.post(
    "/analyze",
    response_model=MarketInsightsResponse,
    summary="Get AI-generated indicative property market estimate",
    description=(
        "Returns an indicative, AI-generated property price estimate for the supplied locality. "
        "This is NOT verified live market data. Always disclose this limitation to customers."
    ),
)
async def analyze_market(request: MarketInsightsRequest) -> MarketInsightsResponse:
    """Return an indicative market estimate for the given locality and property type."""
    service = MarketInsightsService()
    try:
        result = await service.analyze(request)
        logger.info(
            "Market insights generated for %s, %s (%s)",
            request.locality,
            request.city,
            request.property_type,
        )
        return result
    except AppError:
        raise  # Re-raised — FastAPI's AppError handler will format the response
    except Exception as e:
        logger.exception("Unexpected error in market insights: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred generating market insights.",
        )
