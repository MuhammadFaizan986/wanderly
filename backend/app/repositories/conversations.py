import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Conversation, Message, MessageRole


class ConversationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, user_id: uuid.UUID | None) -> Conversation:
        conversation = Conversation(user_id=user_id)
        self.session.add(conversation)
        await self.session.flush()
        await self.session.refresh(conversation)
        return conversation

    async def get(self, conversation_id: uuid.UUID) -> Conversation | None:
        return await self.session.get(Conversation, conversation_id)

    async def list_for_user(self, user_id: uuid.UUID, limit: int = 30) -> Sequence[Conversation]:
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def messages(self, conversation_id: uuid.UUID) -> Sequence[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at, Message.id)
        )
        return result.scalars().all()

    async def add_message(
        self,
        conversation_id: uuid.UUID,
        role: MessageRole,
        *,
        content: str = "",
        content_blocks: list[dict[str, Any]] | None = None,
        tool_name: str | None = None,
        tool_payload: dict[str, Any] | None = None,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            content_blocks=content_blocks or [],
            tool_name=tool_name,
            tool_payload=tool_payload,
            # Explicit timestamps keep ordering exact within one transaction.
            created_at=datetime.now(UTC),
        )
        self.session.add(message)
        await self.session.flush()
        return message
