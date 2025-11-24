"""
Módulo de rotas de perfis de usuário.
Agrega todos os sub-módulos de rotas relacionadas a perfis.
"""
from fastapi import APIRouter
from . import crud, avatar, delete

# Router principal que agrega todos os sub-routers
# Nota: prefix="/profiles" já está definido nos sub-routers, não precisa duplicar aqui
router = APIRouter(tags=["Perfis de Usuário"])

# Incluir todos os sub-routers
router.include_router(crud.router)
router.include_router(avatar.router)
router.include_router(delete.router)

__all__ = ["router"]

