"""Import every model here so `Base.metadata` is complete for Alembic autogenerate."""

from app.models.airport import Airport
from app.models.booking import Booking
from app.models.conversation import Conversation, Message
from app.models.enums import BookingStatus, MessageRole, UserRole
from app.models.llm_usage import LLMUsage
from app.models.price_alert import PriceAlert
from app.models.trip import Trip
from app.models.user import User

__all__ = [
    "Airport",
    "Booking",
    "BookingStatus",
    "Conversation",
    "LLMUsage",
    "Message",
    "MessageRole",
    "PriceAlert",
    "Trip",
    "User",
    "UserRole",
]
