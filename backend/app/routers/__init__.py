"""
Módulo de rotas da aplicação.
Exporta todos os routers para facilitar a importação no main.py
"""
from .books import router as books_router
from .movies import router as movies_router
from .users import router as users_router
from .ratings import router as ratings_router
from .library import router as library_router
from .recommendations import router as recommendations_router
from .profile import router as profile_router

# Router principal que agrega todos os routers
from fastapi import APIRouter

router = APIRouter()

# Incluir todos os routers
# Nota: auth está incluído em users_router
router.include_router(books_router)
router.include_router(movies_router)
router.include_router(users_router)
router.include_router(ratings_router)
router.include_router(library_router)
router.include_router(recommendations_router)
router.include_router(profile_router)

__all__ = ["router"]

