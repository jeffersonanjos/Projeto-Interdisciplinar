"""
Módulo de rotas de usuários.
Agrega todos os sub-módulos de rotas relacionadas a usuários.
"""
from fastapi import APIRouter
from . import auth, crud, search, follow, activities, user_reviews, timeline

# Router principal que agrega todos os sub-routers
router = APIRouter(tags=["users"])

# Incluir todos os sub-routers
router.include_router(auth.router)
router.include_router(crud.router)
router.include_router(search.router)
router.include_router(follow.router)
router.include_router(activities.router)
router.include_router(user_reviews.router)
router.include_router(timeline.router)

__all__ = ["router"]

