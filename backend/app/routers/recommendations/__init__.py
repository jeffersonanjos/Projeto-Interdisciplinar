"""
Módulo de rotas de recomendações.
Agrega todos os sub-módulos de rotas relacionadas a recomendações.
"""
from fastapi import APIRouter
from . import books, movies

# Router principal que agrega todos os sub-routers
router = APIRouter(tags=["recommendations"])

# Incluir todos os sub-routers
router.include_router(books.router)
router.include_router(movies.router)

__all__ = ["router"]

