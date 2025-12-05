"""
Módulo de rotas de livros.
Agrega todos os sub-módulos de rotas relacionadas a livros.
"""
from fastapi import APIRouter
from . import search, detail, genres, crud

# Router principal que agrega todos os sub-routers
router = APIRouter(tags=["books"])

# Incluir todos os sub-routers
router.include_router(search.router)
router.include_router(detail.router)
router.include_router(genres.router)
router.include_router(crud.router)

__all__ = ["router"]

