"""SQLAlchemy ORM models for leads, analyses, follow-up tasks, and chat messages."""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    property_requirement: Mapped[str | None] = mapped_column(Text)
    budget: Mapped[str | None] = mapped_column(String(100))
    buying_timeline: Mapped[str | None] = mapped_column(String(100))
    customer_message: Mapped[str | None] = mapped_column(Text)
    priority_score: Mapped[int | None] = mapped_column(Integer, default=None)
    priority_category: Mapped[str | None] = mapped_column(String(10), default=None)
    followup_status: Mapped[str] = mapped_column(String(20), default="new")
    analysis_stale: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    # Relationships
    analyses: Mapped[list["LeadAnalysis"]] = relationship(
        back_populates="lead", cascade="all, delete-orphan", order_by="LeadAnalysis.created_at.desc()"
    )
    tasks: Mapped[list["FollowupTask"]] = relationship(
        back_populates="lead", cascade="all, delete-orphan", order_by="FollowupTask.created_at.desc()"
    )
    chat_messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="lead", cascade="all, delete-orphan", order_by="ChatMessage.created_at.asc()"
    )


class LeadAnalysis(Base):
    __tablename__ = "lead_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    customer_intent: Mapped[str | None] = mapped_column(String(50))
    key_requirements: Mapped[str | None] = mapped_column(Text)  # JSON string
    inferred_requirements: Mapped[str | None] = mapped_column(Text)  # JSON string
    objections: Mapped[str | None] = mapped_column(Text)  # JSON string
    missing_info: Mapped[str | None] = mapped_column(Text)  # JSON string
    recommended_action: Mapped[str | None] = mapped_column(Text)
    suggested_response: Mapped[str | None] = mapped_column(Text)
    urgency_signals: Mapped[str | None] = mapped_column(Text)  # JSON string
    readiness_signals: Mapped[str | None] = mapped_column(Text)  # JSON string
    scoring_evidence: Mapped[str | None] = mapped_column(Text)  # JSON string
    score_explanation: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    lead: Mapped["Lead"] = relationship(back_populates="analyses")


class FollowupTask(Base):
    __tablename__ = "followup_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    action_type: Mapped[str] = mapped_column(String(20), default="other")  # call|email|site_visit|document|other
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|in_progress|completed|cancelled
    due_date: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[date | None] = mapped_column(Date)
    created_by: Mapped[str] = mapped_column(String(10), default="user")  # ai|user
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    lead: Mapped["Lead"] = relationship(back_populates="tasks")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_id)
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(10), nullable=False)  # user|assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    lead: Mapped["Lead"] = relationship(back_populates="chat_messages")
