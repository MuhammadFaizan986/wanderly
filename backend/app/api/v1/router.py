from fastapi import APIRouter

from app.api.v1 import airports, auth, destinations, flights

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(airports.router)
api_router.include_router(destinations.router)
api_router.include_router(flights.router)

# Upcoming: bookings (week 4) · chat (week 5) · trips (week 6)
# alerts, admin (week 7)
