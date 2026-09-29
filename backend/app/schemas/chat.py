import uuid
from datetime import datetime
from typing import Any

from pydantic import Field

from app.models.enums import MessageRole
from app.schemas.common import ApiModel


class ConversationRead(ApiModel):
    id: uuid.UUID
    title: str | None
    created_at: datetime
    updated_at: datetime


class ChatMessageRead(ApiModel):
    id: uuid.UUID
    role: MessageRole
    content: str
    tool_name: str | None = None
    ui: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime


class ConversationDetail(ConversationRead):
    messages: list[ChatMessageRead]


class SendMessageRequest(ApiModel):
    content: str = Field(min_length=1, max_length=2000)
