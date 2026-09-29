import asyncio
import contextlib
import json
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Request, status
from fastapi.responses import StreamingResponse

from app.ai.agent import AgentEvent, TravelAgent
from app.ai.llm_client import get_llm_client
from app.api.deps import CurrentUser, DbSession, OptionalUser, RedisClient
from app.core.config import get_settings
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.core.rate_limit import client_ip, hit
from app.models import Conversation, MessageRole, User
from app.repositories.conversations import ConversationRepository
from app.schemas.chat import (
    ChatMessageRead,
    ConversationDetail,
    ConversationRead,
    SendMessageRequest,
)

router = APIRouter(prefix="/chat", tags=["chat"])
logger = get_logger(__name__)

HEARTBEAT_SECONDS = 15


async def _get_owned(
    repo: ConversationRepository, conversation_id: uuid.UUID, user: User | None
) -> Conversation:
    conversation = await repo.get(conversation_id)
    # Guest conversations (no owner) are reachable by their unguessable id only.
    if conversation is None or (
        conversation.user_id is not None and (user is None or conversation.user_id != user.id)
    ):
        raise NotFoundError("Conversation not found.")
    return conversation


@router.post("/conversations", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
async def create_conversation(db: DbSession, user: OptionalUser) -> ConversationRead:
    conversation = await ConversationRepository(db).create(user.id if user else None)
    return ConversationRead.model_validate(conversation)


@router.get("/conversations", response_model=list[ConversationRead])
async def list_conversations(db: DbSession, user: CurrentUser) -> list[ConversationRead]:
    rows = await ConversationRepository(db).list_for_user(user.id)
    return [ConversationRead.model_validate(c) for c in rows]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: uuid.UUID, db: DbSession, user: OptionalUser
) -> ConversationDetail:
    repo = ConversationRepository(db)
    conversation = await _get_owned(repo, conversation_id, user)
    messages = []
    for row in await repo.messages(conversation_id):
        if row.role == MessageRole.TOOL:
            ui = (row.tool_payload or {}).get("ui", [])
            if ui:
                messages.append(
                    ChatMessageRead(
                        id=row.id,
                        role=row.role,
                        content="",
                        tool_name=row.tool_name,
                        ui=ui,
                        created_at=row.created_at,
                    )
                )
        elif row.content.strip():
            messages.append(ChatMessageRead.model_validate(row))
    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=messages,
    )


def _sse(event: AgentEvent) -> str:
    return f"event: {event.event}\ndata: {json.dumps(event.data, default=str)}\n\n"


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: uuid.UUID,
    data: SendMessageRequest,
    request: Request,
    db: DbSession,
    redis: RedisClient,
    user: OptionalUser,
) -> StreamingResponse:
    """Send a message and stream the agent's reply as Server-Sent Events.

    Events: `thinking`, `text`, `tool_pending`, `tool_start`, `tool_end`, `flight_cards`,
    `weather`, `text_reset`, `done`, `error`.
    """
    settings = get_settings()
    await _get_owned(ConversationRepository(db), conversation_id, user)
    limiter_key = f"chat:user:{user.id}" if user else f"chat:ip:{client_ip(request)}"
    await hit(redis, limiter_key, settings.chat_rate_limit_per_hour, window_seconds=3600)
    llm = get_llm_client()
    agent = TravelAgent(llm, redis, conversation_id, user.id if user else None)

    async def stream() -> AsyncIterator[str]:
        queue: asyncio.Queue[AgentEvent | None] = asyncio.Queue()

        async def produce() -> None:
            try:
                async for event in agent.run(data.content):
                    await queue.put(event)
            except Exception:
                logger.exception("agent_failed", conversation_id=str(conversation_id))
                await queue.put(
                    AgentEvent(
                        "error", {"message": "Something went wrong on our side. Please try again."}
                    )
                )
            finally:
                await queue.put(None)

        task = asyncio.create_task(produce())
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_SECONDS)
                except TimeoutError:
                    yield ": keep-alive\n\n"  # stops proxies closing a quiet stream
                    continue
                if event is None:
                    break
                yield _sse(event)
        finally:
            # Client disconnected or pressed Stop: cancel the model call too.
            if not task.done():
                task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"},
    )
