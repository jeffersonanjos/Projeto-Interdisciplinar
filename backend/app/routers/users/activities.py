"""
Rotas relacionadas às atividades dos usuários.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging

from sqlmodel import Session, select
from core.models import User
from core.database import get_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["users"])


@router.get("/users/{user_id}/activities", response_model=List[dict])
def get_user_activities(
    user_id: int,
    limit: int = 10,
    session: Session = Depends(get_session)
):
    """Buscar atividades recentes de um usuário (avaliações)"""
    logger.info(f"Obtendo atividades para o usuário {user_id}")
    
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    from core.models import Rating, Book as DBBook, Movie as DBMovie
    
    ratings = session.exec(
        select(Rating)
        .where(Rating.user_id == user_id)
        .order_by(Rating.created_at.desc())
        .limit(limit)
    ).all()
    
    activities = []
    for rating in ratings:
        activity = {
            "id": rating.id,
            "type": "rating",
            "action": "avaliou",
            "rating": rating.score,
            "comment": rating.comment,
            "created_at": rating.created_at.isoformat() if rating.created_at else None,
        }
        
        if rating.book_id:
            book = session.get(DBBook, rating.book_id)
            if book:
                activity["highlight"] = book.title
                activity["book_id"] = book.id
        elif rating.movie_id:
            movie = session.get(DBMovie, rating.movie_id)
            if movie:
                activity["highlight"] = movie.title
                activity["movie_id"] = movie.id
        
        activities.append(activity)
    
    return activities

