"""
Módulo de rotas de biblioteca do usuário.
Agrega todos os sub-módulos de rotas relacionadas à biblioteca.
"""
from fastapi import APIRouter
from . import books, movies

# Router principal que agrega todos os sub-routers
router = APIRouter(tags=["library"])

# Incluir todos os sub-routers
router.include_router(books.router)
router.include_router(movies.router)

__all__ = ["router"]

