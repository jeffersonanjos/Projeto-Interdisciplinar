"""
Rotas de busca de usuários.
"""
from fastapi import APIRouter, Depends
from typing import List
import logging

from sqlmodel import Session, select
from sqlalchemy import func
from core.models import User
from core.schemas import UserRead
from core.database import get_session
from core.auth import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["users"])


@router.get("/users/search", response_model=List[UserRead])
def search_users(
    consulta: str,
    limit: int = 10,
    session: Session = Depends(get_session),
    usuario_atual: User = Depends(get_current_active_user)
):
    """Busca usuários por username (parcial match)"""
    logger.info(f"Buscando usuários com consulta: {consulta}")
    if not consulta or not consulta.strip():
        return []
    
    consulta_limpa = consulta.strip()
    usuarios = session.exec(
        select(User)
        .where(func.lower(User.username).contains(consulta_limpa.lower()))
        .limit(limit)
    ).all()
    
    return usuarios

