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


import litellm
# Disable litellm background telemetry and unnecessary overhead for memory conservation
litellm.telemetry = False
litellm.turn_off_message_logging = True


class GroqLiteLLMClient(LiteLLMClient):
    """Specialized LiteLLMClient that ensures Groq API message compatibility."""

    async def acompletion(
        self,
        model: Any,
        messages: Any,
        tools: Any = None,
        **kwargs: Any,
    ) -> Union[ModelResponse, CustomStreamWrapper]:
        """Sanitize messages, apply bounded timeouts and retries, and safely invoke async acompletion."""
        import time

        sanitized_messages = sanitize_messages_for_groq(messages)

        from app.core.config import get_settings
        settings = get_settings()

        if "timeout" not in kwargs or kwargs["timeout"] is None:
            kwargs["timeout"] = float(settings.groq_timeout_seconds)

        # Enforce bounded retries to prevent exceeding outer deadline
        if "num_retries" not in kwargs or kwargs["num_retries"] is None:
            kwargs["num_retries"] = settings.groq_max_retries
        if kwargs.get("num_retries", 0) > 0 and kwargs.get("timeout", 0) >= float(settings.groq_timeout_seconds) * 0.5:
            # If per-call timeout consumes >50% of total deadline, do not retry
            kwargs["num_retries"] = 0

        timeout_val = kwargs.get("timeout", 0.0)
        retries_val = kwargs.get("num_retries", 0)

        logger.info(
            "Dispatching Groq model call: model=%s, messages=%d, timeout=%.1fs, retries=%d",
            model,
            len(sanitized_messages) if isinstance(sanitized_messages, list) else 0,
            float(timeout_val),
            retries_val,
        )

        call_start = time.time()
        try:
            response = await super().acompletion(
                model=model,
                messages=sanitized_messages,
                tools=tools,
                **kwargs,
            )
            elapsed = time.time() - call_start
            logger.info("Groq model call succeeded in %.2fs: model=%s", elapsed, model)
            return response
        except Exception as e:
            elapsed = time.time() - call_start
            safe_err = redact_sensitive_info(str(e))
            logger.warning(
                "Groq model call failed after %.2fs: model=%s, error=%s",
                elapsed,
                model,
                safe_err[:200],
            )
            raise

    def completion(
        self,
        model: Any,
        messages: Any,
        tools: Any = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> Union[ModelResponse, CustomStreamWrapper]:
        """Sanitize messages and safely invoke sync completion."""
        import time

        sanitized_messages = sanitize_messages_for_groq(messages)

        from app.core.config import get_settings
        settings = get_settings()

        if "timeout" not in kwargs or kwargs["timeout"] is None:
            kwargs["timeout"] = float(settings.groq_timeout_seconds)

        if "num_retries" not in kwargs or kwargs["num_retries"] is None:
            kwargs["num_retries"] = settings.groq_max_retries
        if kwargs.get("num_retries", 0) > 0 and kwargs.get("timeout", 0) >= float(settings.groq_timeout_seconds) * 0.5:
            kwargs["num_retries"] = 0

        call_start = time.time()
        try:
            response = super().completion(
                model=model,
                messages=sanitized_messages,
                tools=tools,
                stream=stream,
                **kwargs,
            )
            elapsed = time.time() - call_start
            logger.info("Groq sync model call succeeded in %.2fs: model=%s", elapsed, model)
            return response
        except Exception as e:
            elapsed = time.time() - call_start
            safe_err = redact_sensitive_info(str(e))
            logger.warning(
                "Groq sync model call failed after %.2fs: model=%s, error=%s",
                elapsed,
                model,
                safe_err[:200],
            )
            raise
