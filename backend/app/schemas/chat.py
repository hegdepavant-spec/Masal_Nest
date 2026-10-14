"""Pydantic schemas for chat."""

from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request body for sending a chat message."""

    message: str = Field(..., min_length=1, max_length=5000, description="User message")


class ChatMessageResponse(BaseModel):
    """A single chat message."""

    id: str
    lead_id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    """Response from the chat endpoint — contains the assistant reply."""

    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse


class ChatHistoryResponse(BaseModel):
    """List of chat messages for a lead."""

    lead_id: str
    messages: list[ChatMessageResponse]
