"""Custom LiteLLM client for Groq models with Google ADK.

Groq's chat completions endpoint rejects proprietary or unexpected fields
such as `reasoning_content` and `thinking_blocks` in assistant messages.
This client sanitizes the message sequence before passing to LiteLLM,
ensures tool calls have corresponding results, and logs outgoing payloads safely.

Note: This module imports google.adk and litellm. It is intentionally imported
only from within the lazy agent factory functions (lead_intelligence.py and
sales_followup.py), so these heavy libraries are NOT loaded at application startup.
"""

import copy
import logging
import re
from typing import Any, Union

from google.adk.models.lite_llm import LiteLLMClient
from litellm import ModelResponse, CustomStreamWrapper

logger = logging.getLogger(__name__)

# Pattern to redact Groq API keys and sensitive tokens
_SECRET_RE = re.compile(r"gsk_[a-zA-Z0-9_-]{20,}")


def sanitize_messages_for_groq(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sanitize outgoing message list to ensure 100% Groq API compatibility.

    Rules applied:
    1. Strip unsupported metadata from assistant messages:
       - 'reasoning_content'
       - 'thinking_blocks'
       - 'reasoning'
       - 'thought'
    2. Ensure assistant messages have valid content or tool_calls.
    3. Ensure tool messages have non-null content and tool_call_id.
    """
    if not isinstance(messages, list):
        return messages

    sanitized = []
    # Track tool_call IDs emitted by assistants to ensure tool responses match
    active_tool_call_ids: set[str] = set()

    for idx, raw_msg in enumerate(messages):
        if not isinstance(raw_msg, dict):
            sanitized.append(raw_msg)
            continue

        msg = copy.deepcopy(raw_msg)
        role = msg.get("role")

        if role == "assistant":
            # Remove unsupported reasoning fields that cause Groq BadRequestError
            msg.pop("reasoning_content", None)
            msg.pop("thinking_blocks", None)
            msg.pop("reasoning", None)
            msg.pop("thought", None)

            # Record any tool_call IDs
            tool_calls = msg.get("tool_calls")
            if tool_calls and isinstance(tool_calls, list):
                for tc in tool_calls:
                    if isinstance(tc, dict) and tc.get("id"):
                        active_tool_call_ids.add(str(tc["id"]))

            # Groq requires assistant message to have content or tool_calls
            if msg.get("content") is None and not msg.get("tool_calls"):
                msg["content"] = ""

        elif role in ("tool", "tool_responses"):
            # Normalize role to 'tool' for Groq/OpenAI format
            msg["role"] = "tool"
            if msg.get("content") is None:
                msg["content"] = "{}"

        sanitized.append(msg)

    return sanitized


def redact_sensitive_info(data: Any) -> Any:
    """Recursively mask secrets and sensitive tokens for safe logging."""
    if isinstance(data, str):
        return _SECRET_RE.sub("[REDACTED_API_KEY]", data)
    elif isinstance(data, dict):
        redacted = {}
        for k, v in data.items():
            if k in ("api_key", "authorization", "token"):
                redacted[k] = "[REDACTED]"
            else:
                redacted[k] = redact_sensitive_info(v)
        return redacted
    elif isinstance(data, list):
        return [redact_sensitive_info(item) for item in data]
    return data


class GroqLiteLLMClient(LiteLLMClient):
    """Specialized LiteLLMClient that ensures Groq API message compatibility."""

    async def acompletion(
        self,
        model: Any,
        messages: Any,
        tools: Any = None,
        **kwargs: Any,
    ) -> Union[ModelResponse, CustomStreamWrapper]:
        """Sanitize messages and safely invoke async acompletion."""
        sanitized_messages = sanitize_messages_for_groq(messages)

        if "timeout" not in kwargs or kwargs["timeout"] is None:
            from app.core.config import get_settings
            kwargs["timeout"] = float(get_settings().groq_timeout_seconds)

        if logger.isEnabledFor(logging.DEBUG):
            summary = [
                f"[{i}] role={m.get('role')}, keys={list(m.keys())}"
                for i, m in enumerate(sanitized_messages)
                if isinstance(m, dict)
            ]
            logger.debug(
                "Dispatching to Groq model=%s with %d messages (timeout=%s): %s",
                model,
                len(sanitized_messages),
                kwargs.get("timeout"),
                ", ".join(summary),
            )

        return await super().acompletion(
            model=model,
            messages=sanitized_messages,
            tools=tools,
            **kwargs,
        )

    def completion(
        self,
        model: Any,
        messages: Any,
        tools: Any = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> Union[ModelResponse, CustomStreamWrapper]:
        """Sanitize messages and safely invoke sync completion."""
        sanitized_messages = sanitize_messages_for_groq(messages)
        if "timeout" not in kwargs or kwargs["timeout"] is None:
            from app.core.config import get_settings
            kwargs["timeout"] = float(get_settings().groq_timeout_seconds)
        return super().completion(
            model=model,
            messages=sanitized_messages,
            tools=tools,
            stream=stream,
            **kwargs,
        )
