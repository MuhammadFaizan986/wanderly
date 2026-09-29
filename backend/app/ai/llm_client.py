"""Provider abstraction for the chat agent.

The agent only talks to `LLMClient`. Conversation history is stored in a neutral
content-block shape (text / tool_use / tool_result, plus opaque provider blocks such as
thinking) that the Anthropic implementation sends as-is; another provider would translate
it in its own implementation.
"""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

import anthropic

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    input_schema: dict[str, Any]


@dataclass(frozen=True)
class ToolCall:
    id: str
    name: str
    input: Any


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0


# ---- Streamed events -----------------------------------------------------------------


@dataclass(frozen=True)
class TextDelta:
    text: str


@dataclass(frozen=True)
class ThinkingStarted:
    pass


@dataclass(frozen=True)
class ToolCallStarted:
    name: str


@dataclass(frozen=True)
class TurnRestarted:
    """The turn is being re-issued; discard any text streamed for it so far."""


@dataclass
class TurnResult:
    content: list[dict[str, Any]]  # assistant blocks to store and replay
    stop_reason: str | None
    tool_calls: list[ToolCall]
    usage: Usage
    model: str
    text: str = ""
    extra: dict[str, Any] = field(default_factory=dict)


LLMEvent = TextDelta | ThinkingStarted | ToolCallStarted | TurnRestarted | TurnResult


class LLMClient(ABC):
    provider: str
    model: str

    @abstractmethod
    def stream_turn(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[ToolSpec],
        allow_tools: bool = True,
    ) -> AsyncIterator[LLMEvent]:
        """Stream one model turn; the final yielded event is always a TurnResult."""


# ---- Anthropic ---------------------------------------------------------------------

FALLBACK_BETA = "server-side-fallback-2026-07-01"
MAX_JSON_RETRIES = 2


class AnthropicLLMClient(LLMClient):
    provider = "anthropic"

    def __init__(self) -> None:
        settings = get_settings()
        if settings.anthropic_api_key is None:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured")
        self.settings = settings
        self.model = settings.anthropic_model
        self.client = anthropic.AsyncAnthropic(
            api_key=settings.anthropic_api_key.get_secret_value(), max_retries=2, timeout=120.0
        )

    async def stream_turn(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        tools: list[ToolSpec],
        allow_tools: bool = True,
    ) -> AsyncIterator[LLMEvent]:
        params: dict[str, Any] = {
            "model": self.model,
            "max_tokens": self.settings.llm_max_tokens,
            "system": system,
            "messages": messages,
            "tools": [
                {
                    "name": t.name,
                    "description": t.description,
                    "input_schema": t.input_schema,
                    # Inputs stream as generated; the agent validates them before running.
                    "eager_input_streaming": True,
                }
                for t in tools
            ],
            "thinking": {"type": "adaptive"},
            "output_config": {"effort": self.settings.llm_effort},
            # System prompt + tools are identical across turns: cache the prefix.
            "cache_control": {"type": "ephemeral"},
        }
        if not allow_tools:
            params["tool_choice"] = {"type": "none"}
        if self.settings.llm_refusal_fallbacks:
            params["betas"] = [FALLBACK_BETA]
            params["fallbacks"] = "default"

        for attempt in range(MAX_JSON_RETRIES + 1):
            try:
                async with self.client.beta.messages.stream(**params) as stream:
                    async for event in stream:
                        if event.type == "content_block_start":
                            block = event.content_block
                            if block.type == "thinking":
                                yield ThinkingStarted()
                            elif block.type == "tool_use":
                                yield ToolCallStarted(block.name)
                        elif event.type == "text":
                            yield TextDelta(event.text)
                    final = await stream.get_final_message()
                break
            except ValueError:
                # Tool-input JSON the SDK could not parse at all; re-issue the turn.
                if attempt == MAX_JSON_RETRIES:
                    raise
                logger.warning("llm_tool_json_retry", attempt=attempt + 1)
                yield TurnRestarted()

        content = _replayable_blocks(
            [b.model_dump(mode="json", exclude_none=True) for b in final.content]
        )
        usage = final.usage
        yield TurnResult(
            content=content,
            stop_reason=final.stop_reason,
            tool_calls=[
                ToolCall(id=b["id"], name=b["name"], input=b.get("input"))
                for b in content
                if b["type"] == "tool_use"
            ],
            usage=Usage(
                input_tokens=usage.input_tokens or 0,
                output_tokens=usage.output_tokens or 0,
                cache_read_tokens=usage.cache_read_input_tokens or 0,
                cache_write_tokens=usage.cache_creation_input_tokens or 0,
            ),
            model=final.model,
            text="".join(b.get("text", "") for b in content if b["type"] == "text"),
        )


_REPLAYABLE = {"text", "thinking", "redacted_thinking", "tool_use"}


def _replayable_blocks(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep only blocks that can be sent back as history.

    After a mid-output refusal fallback, blocks before the last `fallback` marker came from
    the declined attempt: only its text is valid context, so thinking/tool_use are dropped.
    """
    last_fallback = max((i for i, b in enumerate(blocks) if b["type"] == "fallback"), default=-1)
    kept = []
    for i, block in enumerate(blocks):
        if block["type"] not in _REPLAYABLE:
            continue
        if i < last_fallback and block["type"] != "text":
            continue
        kept.append(block)
    return kept


def get_llm_client() -> LLMClient:
    settings = get_settings()
    if settings.llm_provider == "anthropic":
        return AnthropicLLMClient()
    raise RuntimeError(f"LLM provider {settings.llm_provider!r} is not implemented yet")
