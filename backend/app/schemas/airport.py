from app.schemas.common import ApiModel


class AirportRead(ApiModel):
    iata_code: str
    name: str
    city: str
    country: str
    country_code: str
    lat: float
    lng: float
    is_major: bool
