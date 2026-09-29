"""The travel agent loop: LLM <-> tools, streamed to the client as typed events."""

import asyncio
import json
import time
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from redis.asyncio import Redis

from app.ai.llm_client import (
    LLMClient,
    TextDelta,
    ThinkingStarted,
    ToolCall,
    ToolCallStarted,
    TurnRestarted,
    TurnResult,
)
from app.ai.pricing import cost_usd
from app.ai.prompts import system_prompt
from app.ai.tools import TOOL_SPECS, ToolContext, ToolOutput, run_tool, status_label
from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.models import LLMUsage, Message, MessageRole
from app.repositories.conversations import ConversationRepository

logger = get_logger(__name__)


@dataclass(frozen=True)
class AgentEvent:
    # text | thinking | tool_pending | tool_start | tool_end | flight_cards | weather
    # | text_reset | done | error
    event: str
    data: dict[str, Any]


def to_api_messages(rows: list[Message]) -> list[dict[str, Any]]:
    """Rebuild API history from stored rows, repairing turns that were cut off.

    If a stream was interrupted after the model asked for tools but before results were
    saved, answer those calls with an error so the history stays valid (append-only).
    """
    messages: list[dict[str, Any]] = []
    for index, row in enumerate(rows):
        if row.role == MessageRole.USER:
            messages.append({"role": "user", "content": row.content_blocks or row.content})
        elif row.role == MessageRole.ASSISTANT:
            if not row.content_blocks:
                continue
            messages.append({"role": "assistant", "content": row.content_blocks})
            tool_ids = [b["id"] for b in row.content_blocks if b.get("type") == "tool_use"]
            nxt = rows[index + 1] if index + 1 < len(rows) else None
            if tool_ids and (nxt is None or nxt.role != MessageRole.TOOL):
                messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_id,
                                "is_error": True,
                                "content": "Interrupted before the tool finished.",
                            }
                            for tool_id in tool_ids
                        ],
                    }
                )
        elif row.role == MessageRole.TOOL:
            messages.append({"role": "user", "content": row.content_blocks})
    return messages


class TravelAgent:
    def __init__(
        self,
        llm: LLMClient,
        redis: Redis,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID | None,
    ) -> None:
        self.llm = llm
        self.redis = redis
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.max_rounds = get_settings().llm_max_tool_rounds

    async def run(self, user_text: str) -> AsyncIterator[AgentEvent]:
        async with SessionLocal() as session:
            repo = ConversationRepository(session)
            conversation = await repo.get(self.conversation_id)
            if conversation is None:
                raise RuntimeError("conversation disappeared")
            if not conversation.title:
                conversation.title = user_text.strip()[:80]
            await repo.add_message(
                self.conversation_id,
                MessageRole.USER,
                content=user_text,
                content_blocks=[{"type": "text", "text": user_text}],
            )
            await session.commit()
            history = to_api_messages(list(await repo.messages(self.conversation_id)))

        system = system_prompt()
        totals = {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}
        last_message_id: str | None = None

        for round_index in range(self.max_rounds + 1):
            # After the tool-round cap, force a final written answer.
            allow_tools = round_index < self.max_rounds
            started = time.perf_counter()
            result: TurnResult | None = None
            async for event in self.llm.stream_turn(
                system=system, messages=history, tools=TOOL_SPECS, allow_tools=allow_tools
            ):
                if isinstance(event, TextDelta):
                    yield AgentEvent("text", {"text": event.text})
                elif isinstance(event, ThinkingStarted):
                    yield AgentEvent("thinking", {})
                elif isinstance(event, ToolCallStarted):
                    yield AgentEvent("tool_pending", {"name": event.name})
                elif isinstance(event, TurnRestarted):
                    yield AgentEvent("text_reset", {})
                elif isinstance(event, TurnResult):
                    result = event
            if result is None:
                raise RuntimeError("LLM stream ended without a result")
            latency_ms = int((time.perf_counter() - started) * 1000)

            cost = cost_usd(result.model, result.usage)
            totals["input_tokens"] += result.usage.input_tokens + result.usage.cache_read_tokens
            totals["output_tokens"] += result.usage.output_tokens
            totals["cost_usd"] += float(cost)

            async with SessionLocal() as session:
                repo = ConversationRepository(session)
                message = await repo.add_message(
                    self.conversation_id,
                    MessageRole.ASSISTANT,
                    content=result.text,
                    content_blocks=result.content,
                )
                session.add(
                    LLMUsage(
                        user_id=self.user_id,
                        conversation_id=self.conversation_id,
                        provider=self.llm.provider,
                        model=result.model,
                        purpose="chat",
                        input_tokens=result.usage.input_tokens
                        + result.usage.cache_read_tokens
                        + result.usage.cache_write_tokens,
                        output_tokens=result.usage.output_tokens,
                        cost_usd=cost,
                        latency_ms=latency_ms,
                    )
                )
                await session.commit()
                last_message_id = str(message.id)
            history.append({"role": "assistant", "content": result.content})

            if result.stop_reason == "refusal":
                yield AgentEvent(
                    "error",
                    {"message": "I can't help with that request. Try asking about a trip instead."},
                )
                break
            if result.stop_reason == "max_tokens" and result.tool_calls:
                yield AgentEvent(
                    "error", {"message": "That request was too large. Try asking in smaller steps."}
                )
                break
            if result.stop_reason != "tool_use" or not result.tool_calls:
                break

            for start_event in tool_start_events(result.tool_calls):
                yield start_event
            outputs = await self._run_tools(result.tool_calls)
            tool_results = []
            ui_payloads: list[dict[str, Any]] = []
            for call, output in zip(result.tool_calls, outputs, strict=True):
                for ui in output.ui:
                    ui_payloads.append(ui)
                    yield AgentEvent(ui["type"], ui)
                yield AgentEvent(
                    "tool_end", {"id": call.id, "name": call.name, "ok": not output.is_error}
                )
                content = (
                    output.content
                    if isinstance(output.content, str)
                    else json.dumps(output.content)
                )
                block: dict[str, Any] = {
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": content,
                }
                if output.is_error:
                    block["is_error"] = True
                tool_results.append(block)

            async with SessionLocal() as session:
                await ConversationRepository(session).add_message(
                    self.conversation_id,
                    MessageRole.TOOL,
                    content_blocks=tool_results,
                    tool_name=",".join(c.name for c in result.tool_calls),
                    tool_payload={"ui": ui_payloads} if ui_payloads else None,
                )
                await session.commit()
            # All results for one turn go back together in a single user message.
            history.append({"role": "user", "content": tool_results})

        yield AgentEvent(
            "done",
            {
                "message_id": last_message_id,
                "usage": {**totals, "cost_usd": round(totals["cost_usd"], 6)},
            },
        )

    async def _run_tools(self, calls: list[ToolCall]) -> list[ToolOutput]:
        async def one(call: ToolCall) -> ToolOutput:
            async with SessionLocal() as session:
                try:
                    return await run_tool(ToolContext(session, self.redis), call.name, call.input)
                except Exception:
                    logger.exception("tool_failed", tool=call.name)
                    return ToolOutput(
                        "The tool failed unexpectedly. Try again or continue without it.",
                        is_error=True,
                    )

        return list(await asyncio.gather(*(one(c) for c in calls)))


def tool_start_events(calls: list[ToolCall]) -> list[AgentEvent]:
    return [
        AgentEvent(
            "tool_start", {"id": c.id, "name": c.name, "label": status_label(c.name, c.input)}
        )
        for c in calls
    ]
