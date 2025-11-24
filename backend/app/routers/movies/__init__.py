"""
Módulo de rotas de filmes.
Agrega todos os sub-módulos de rotas relacionadas a filmes.
"""
from fastapi import APIRouter
from . import search, detail, genres

# Router principal que agrega todos os sub-routers
router = APIRouter(tags=["movies"])

# Incluir todos os sub-routers
router.include_router(search.router)
router.include_router(detail.router)
router.include_router(genres.router)

__all__ = ["router"]

