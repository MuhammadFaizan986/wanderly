from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Airport(Base):
    __tablename__ = "airports"

    iata_code: Mapped[str] = mapped_column(String(3), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(120))
    country: Mapped[str] = mapped_column(String(120))
    country_code: Mapped[str] = mapped_column(String(2), index=True)
    lat: Mapped[float]
    lng: Mapped[float]
    is_major: Mapped[bool] = mapped_column(default=False, server_default="false")

    __table_args__ = (
        # Trigram indexes power fuzzy "lah" -> Lahore autocomplete (pg_trgm).
        Index(
            "ix_airports_city_trgm",
            "city",
            postgresql_using="gin",
            postgresql_ops={"city": "gin_trgm_ops"},
        ),
        Index(
            "ix_airports_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"},
        ),
    )
