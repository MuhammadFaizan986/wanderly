import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import BookingStatus


class Booking(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bookings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    duffel_order_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    booking_reference: Mapped[str | None] = mapped_column(String(16))
    status: Mapped[BookingStatus] = mapped_column(
        Enum(
            BookingStatus,
            native_enum=False,
            length=16,
            values_callable=lambda e: [m.value for m in e],
        ),
        default=BookingStatus.PENDING,
        server_default=BookingStatus.PENDING.value,
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3))
    origin: Mapped[str] = mapped_column(String(3))
    destination: Mapped[str] = mapped_column(String(3))
    departure_at: Mapped[datetime]
    return_at: Mapped[datetime | None]
    passengers: Mapped[list[dict[str, Any]]]
    raw_offer: Mapped[dict[str, Any]]
