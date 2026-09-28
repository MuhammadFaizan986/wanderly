import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PriceAlert(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "price_alerts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    origin: Mapped[str] = mapped_column(String(3))
    destination: Mapped[str] = mapped_column(String(3))
    departure_date: Mapped[date]
    return_date: Mapped[date | None]
    adults: Mapped[int] = mapped_column(default=1, server_default="1")
    cabin_class: Mapped[str] = mapped_column(
        String(16), default="economy", server_default="economy"
    )
    target_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    last_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="USD", server_default="USD")
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true", index=True)
    last_checked_at: Mapped[datetime | None]
