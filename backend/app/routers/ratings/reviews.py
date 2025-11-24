"""
Rotas relacionadas a reviews (avaliações enriquecidas).
Este módulo mantém compatibilidade com código legado que usa /reviews.
A lógica real está consolidada em user_ratings.py.
"""
from fastapi import APIRouter, Depends
from typing import List, Dict, Any
import logging

from sqlmodel import Session
from core.database import get_session
from .user_ratings import get_user_ratings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["reviews"])


@router.get("/users/{user_id}/reviews", response_model=List[Dict[str, Any]])
async def get_user_reviews(user_id: int, session: Session = Depends(get_session)):
    """
    Obtém avaliações do usuário com detalhes completos (book/movie objects).
    Este endpoint é um wrapper que chama get_user_ratings com include_details=True
    para manter compatibilidade com código legado.
    """
    logger.info(f"Obtendo avaliações (reviews) para o usuário: {user_id}")
    # Reutilizar a lógica consolidada de ratings com include_details=True
    return await get_user_ratings(user_id, include_details=True, session=session)

