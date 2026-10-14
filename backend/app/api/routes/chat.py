"""Chat API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.chat import ChatRequest, ChatResponse, ChatHistoryResponse
from app.services.chat_service import ChatService

router = APIRouter(prefix="/leads/{lead_id}/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def send_chat_message(
    lead_id: str,
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI assistant in the context of a specific lead.

    The assistant uses the lead's persisted information, AI analysis,
    and follow-up tasks to provide contextual responses.
    """
    service = ChatService(db)
    return await service.send_message(lead_id, data.message)


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    lead_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve chat history for a lead."""
    service = ChatService(db)
    return await service.get_history(lead_id, limit=min(limit, 200))
