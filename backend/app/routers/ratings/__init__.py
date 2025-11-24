"""
Módulo de rotas de avaliações (ratings).
Agrega todos os sub-módulos de rotas relacionadas a avaliações.
"""
from fastapi import APIRouter
from . import crud, user_ratings, reviews

# Router principal que agrega todos os sub-routers
router = APIRouter(tags=["ratings"])

# Incluir todos os sub-routers
router.include_router(crud.router)
router.include_router(user_ratings.router)
router.include_router(reviews.router)

__all__ = ["router"]

