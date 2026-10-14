"""Chat service — manages lead-specific conversations with AI."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.db.models import ChatMessage
from app.db.repositories.chat_repo import ChatRepository
from app.db.repositories.lead_repo import LeadRepository
from app.schemas.chat import ChatMessageResponse, ChatResponse, ChatHistoryResponse
from app.services.agent_service import AgentService


class ChatService:
    """Manages lead-specific chat conversations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.chat_repo = ChatRepository(db)
        self.lead_repo = LeadRepository(db)
        self.agent_service = AgentService(db)

    async def send_message(self, lead_id: str, user_text: str) -> ChatResponse:
        """Send a message in the context of a specific lead.

        1. Verify the lead exists
        2. Save the user message
        3. Retrieve recent chat history for context
        4. Invoke the Sales Follow-up Agent with lead context
        5. Save and return the assistant response
        """
        # Verify lead exists
        lead = await self.lead_repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError("Lead", lead_id)

        # Save user message
        user_msg = ChatMessage(
            lead_id=lead_id,
            role="user",
            content=user_text,
        )
        user_msg = await self.chat_repo.create(user_msg)

        # Get recent history for context
        recent_messages = await self.chat_repo.list_for_lead(lead_id, limit=20)
        chat_history = [
            {"role": msg.role, "content": msg.content}
            for msg in recent_messages[:-1]  # Exclude the message we just added
        ]

        # Invoke agent
        response_text = await self.agent_service.chat_with_lead_context(
            lead_id=lead_id,
            user_message=user_text,
            chat_history=chat_history,
        )

        # Save assistant response
        assistant_msg = ChatMessage(
            lead_id=lead_id,
            role="assistant",
            content=response_text,
        )
        assistant_msg = await self.chat_repo.create(assistant_msg)

        return ChatResponse(
            user_message=ChatMessageResponse.model_validate(user_msg),
            assistant_message=ChatMessageResponse.model_validate(assistant_msg),
        )

    async def get_history(self, lead_id: str, limit: int = 50) -> ChatHistoryResponse:
        """Retrieve chat history for a lead."""
        # Verify lead exists
        lead = await self.lead_repo.get_by_id(lead_id)
        if not lead:
            raise NotFoundError("Lead", lead_id)

        messages = await self.chat_repo.list_for_lead(lead_id, limit=limit)
        return ChatHistoryResponse(
            lead_id=lead_id,
            messages=[ChatMessageResponse.model_validate(m) for m in messages],
        )
