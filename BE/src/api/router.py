from fastapi import APIRouter
from BE.src.api.system import router as system_router
from BE.src.api.camera import router as camera_router
from BE.src.api.images import router as images_router
from BE.src.api.score import router as score_router
from BE.src.api.score_batch import router as score_batch_router

api_router = APIRouter()
api_router.include_router(system_router)
api_router.include_router(camera_router)
api_router.include_router(images_router)
api_router.include_router(score_router)
api_router.include_router(score_batch_router)
