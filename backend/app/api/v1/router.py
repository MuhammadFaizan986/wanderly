from fastapi import APIRouter

from app.api.v1 import airports, auth, bookings, chat, destinations, flights, trips

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(airports.router)
api_router.include_router(destinations.router)
api_router.include_router(flights.router)
api_router.include_router(bookings.router)
api_router.include_router(chat.router)
api_router.include_router(trips.router)
api_router.include_router(trips.public_router)

# Upcoming: alerts, admin (week 7)
