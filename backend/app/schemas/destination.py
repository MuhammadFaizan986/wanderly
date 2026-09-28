from app.schemas.common import ApiModel


class Photo(ApiModel):
    url: str
    blur_hash: str | None = None
    color: str | None = None
    alt: str | None = None
    photographer: str
    photographer_url: str
    unsplash_url: str


class Destination(ApiModel):
    slug: str
    city: str
    country: str
    country_code: str
    iata_code: str
    tagline: str
    best_months: str
    photo: Photo | None = None
