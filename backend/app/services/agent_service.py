"""Agent orchestration service — invokes ADK agents and handles responses.

This service is the single integration point between the application layer
and Google ADK. It handles:
- Agent creation and configuration
- Session management (ephemeral, per-request)
- Running agents and collecting responses
- Parsing structured output from the Lead Intelligence Agent
- Error handling for AI failures
"""

import json
import logging
import re
import uuid

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.lead_intelligence import create_lead_intelligence_agent
from app.agents.sales_followup import create_sales_followup_agent
from app.agents.prompts import (
    LEAD_INTELLIGENCE_INSTRUCTION,
    SALES_FOLLOWUP_INSTRUCTION,
    CALL_BRIEF_INSTRUCTION,
)
from app.agents import tools as agent_tools
from app.core.config import get_settings
from app.core.exceptions import AIServiceError, AITimeoutError, AIRateLimitError, AIAuthError
from app.db.models import Lead, LeadAnalysis
from app.db.repositories.analysis_repo import AnalysisRepository
from app.schemas.analysis import LeadAnalysisResult

logger = logging.getLogger(__name__)


class AgentService:
    """Orchestrates ADK agent invocations for analysis and chat."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    async def analyze_lead(self, lead: Lead) -> LeadAnalysisResult:
        """Run the Lead Intelligence Agent to analyze a lead.

        Args:
            lead: The Lead ORM model with customer information.

        Returns:
            Validated LeadAnalysisResult from AI analysis.

        Raises:
            AIServiceError on any AI failure.
        """
        # Format the instruction with lead data
        instruction = LEAD_INTELLIGENCE_INSTRUCTION.format(
            customer_name=lead.customer_name or "Not provided",
            location=lead.location or "Not provided",
            property_requirement=lead.property_requirement or "Not provided",
            budget=lead.budget or "Not provided",
            buying_timeline=lead.buying_timeline or "Not provided",
            customer_message=lead.customer_message or "Not provided",
        )

        agent = create_lead_intelligence_agent()
        # Override instruction with filled template
        agent.instruction = instruction

        response_text = await self._run_agent(
            agent=agent,
            user_message="Analyze this lead and provide the structured JSON output.",
            session_prefix="analysis",
        )

        # Parse the JSON response
        return self._parse_analysis_response(response_text)

    async def chat_with_lead_context(
        self,
        lead_id: str,
        user_message: str,
        chat_history: list[dict] | None = None,
    ) -> str:
        """Run the Sales Follow-up Agent for a contextual chat message.

        Args:
            lead_id: The lead this chat is about.
            user_message: The salesperson's question or instruction.
            chat_history: Optional recent chat history for context.

        Returns:
            The assistant's response text.
        """
        # Inject DB session into tool functions
        agent_tools.set_db_session(self.db)

        instruction = SALES_FOLLOWUP_INSTRUCTION.format(lead_id=lead_id)
        agent = create_sales_followup_agent()
        agent.instruction = instruction

        # Build context message with recent history
        context_parts = []
        if chat_history:
            context_parts.append("Recent conversation context:")
            for msg in chat_history[-6:]:  # Last 6 messages for context window
                role = msg.get("role", "user")
                content = msg.get("content", "")
                context_parts.append(f"  {role}: {content}")
            context_parts.append("")

        context_parts.append(f"Salesperson's message: {user_message}")
        full_message = "\n".join(context_parts)

        response_text = await self._run_agent(
            agent=agent,
            user_message=full_message,
            session_prefix="chat",
        )

        return response_text

    async def generate_call_brief(self, lead: Lead) -> str:
        """Generate a call preparation brief for a lead.

        Uses the Lead Intelligence Agent (no tools needed) with
        the call brief prompt template.
        """
        # Get latest analysis
        analysis_repo = AnalysisRepository(self.db)
        analysis = await analysis_repo.get_latest_for_lead(lead.id)

        instruction = CALL_BRIEF_INSTRUCTION.format(
            customer_name=lead.customer_name or "Not provided",
            location=lead.location or "Not provided",
            property_requirement=lead.property_requirement or "Not provided",
            budget=lead.budget or "Not provided",
            buying_timeline=lead.buying_timeline or "Not provided",
            customer_message=lead.customer_message or "Not provided",
            summary=analysis.summary if analysis else "No analysis available",
            customer_intent=analysis.customer_intent if analysis else "Unknown",
            key_requirements=json.loads(analysis.key_requirements or "[]") if analysis else [],
            objections=json.loads(analysis.objections or "[]") if analysis else [],
            missing_info=json.loads(analysis.missing_info or "[]") if analysis else [],
            recommended_action=analysis.recommended_action if analysis else "Analyze the lead first",
        )

        agent = create_lead_intelligence_agent()
        agent.instruction = instruction

        response_text = await self._run_agent(
            agent=agent,
            user_message="Generate the call brief.",
            session_prefix="brief",
        )

        return response_text

    async def _run_agent(
        self,
        agent: LlmAgent,
        user_message: str,
        session_prefix: str,
    ) -> str:
        """Run an ADK agent and collect the final text response.

        Uses ephemeral InMemorySessionService — each invocation is independent.
        """
        session_service = InMemorySessionService()

        runner = Runner(
            agent=agent,
            session_service=session_service,
        )

        user_id = "masal-ai-backend"
        session_id = f"{session_prefix}-{uuid.uuid4().hex[:8]}"

        # Create session
        session = await session_service.create_session(
            app_name=agent.name,
            user_id=user_id,
        )

        # Build the user message content
        content = types.Content(
            role="user",
            parts=[types.Part(text=user_message)],
        )

        # Run the agent and collect responses
        final_text_parts = []
        try:
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session.id,
                new_message=content,
            ):
                # Collect text from final response events
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            final_text_parts.append(part.text)

        except Exception as e:
            self._handle_ai_error(e)

        if not final_text_parts:
            raise AIServiceError("AI agent returned no response.")

        return "\n".join(final_text_parts)

    def _parse_analysis_response(self, response_text: str) -> LeadAnalysisResult:
        """Parse the Lead Intelligence Agent's JSON response into a validated schema.

        Handles common LLM output quirks:
        - Markdown code blocks around JSON
        - Extra text before/after JSON
        - Missing fields (filled with defaults)
        """
        # Try to extract JSON from the response
        json_str = response_text.strip()

        # Remove markdown code blocks if present
        if "```" in json_str:
            match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", json_str, re.DOTALL)
            if match:
                json_str = match.group(1).strip()

        # Try to find JSON object boundaries
        if not json_str.startswith("{"):
            start = json_str.find("{")
            end = json_str.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = json_str[start:end]

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error("Failed to parse AI analysis JSON: %s", str(e)[:200])
            logger.debug("Raw response: %s", response_text[:500])
            raise AIServiceError(
                f"AI returned invalid JSON. Please try again.",
                code="AI_INVALID_OUTPUT",
            )

        # Validate through Pydantic — missing fields get defaults
        try:
            return LeadAnalysisResult.model_validate(data)
        except Exception as e:
            logger.error("AI output failed schema validation: %s", str(e)[:200])
            raise AIServiceError(
                "AI output did not match expected format. Please try again.",
                code="AI_INVALID_OUTPUT",
            )

    def _handle_ai_error(self, error: Exception) -> None:
        """Map provider errors to application exceptions."""
        error_str = str(error).lower()

        if "timeout" in error_str or "timed out" in error_str:
            raise AITimeoutError()
        elif "rate" in error_str and "limit" in error_str:
            raise AIRateLimitError()
        elif "auth" in error_str or "api key" in error_str or "401" in error_str:
            raise AIAuthError()
        elif "model" in error_str and ("not found" in error_str or "not available" in error_str):
            raise AIServiceError(
                f"Configured AI model is not available. Check GROQ_MODEL_NAME setting.",
                code="AI_MODEL_UNAVAILABLE",
            )
        else:
            logger.error("AI service error: %s", str(error)[:300])
            raise AIServiceError(
                "AI service encountered an error. Please try again.",
                code="AI_SERVICE_ERROR",
            )
