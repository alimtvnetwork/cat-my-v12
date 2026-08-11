from fastapi import APIRouter
from BE.src.api.system import router as system_router

api_router = APIRouter()
api_router.include_router(system_router)
