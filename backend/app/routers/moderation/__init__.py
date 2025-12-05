from fastapi import APIRouter
from .crud import router as crud_router

router = APIRouter(prefix="/moderation", tags=["moderation"])

router.include_router(crud_router)

__all__ = ["router"]
