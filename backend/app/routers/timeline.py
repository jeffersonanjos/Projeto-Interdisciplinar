"""
Rotas relacionadas à timeline da comunidade.
"""
from fastapi import APIRouter, Depends
from typing import List, Dict, Any
import logging

from sqlmodel import Session, select
from core.models import User, Rating, Book as DBBook, Movie as DBMovie, Follow, UserProfile as DBUserProfile
from core.database import get_session
from core.auth import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["timeline"])


@router.get("/timeline", response_model=List[Dict[str, Any]])
def get_community_timeline(
    limit: int = 20,
    only_following: bool = False,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Buscar timeline da comunidade (atividades de todos os usuários ou apenas dos seguidos)"""
    logger.info(f"Obtendo timeline da comunidade para o usuário {current_user.id}, apenas_seguindo={only_following}")
    
    if only_following:
        follows = session.exec(
            select(Follow)
            .where(Follow.follower_id == current_user.id)
        ).all()
        following_ids = [f.following_id for f in follows]
        
        if not following_ids:
            return []
        
        ratings = session.exec(
            select(Rating)
            .where(Rating.user_id.in_(following_ids))
            .order_by(Rating.created_at.desc())
            .limit(limit)
        ).all()
    else:
        ratings = session.exec(
            select(Rating)
            .where(Rating.user_id != current_user.id)
            .order_by(Rating.created_at.desc())
            .limit(limit)
        ).all()
    
    timeline = []
    for rating in ratings:
        rating_user = session.get(User, rating.user_id)
        if not rating_user:
            continue
        
        user_profile = session.exec(
            select(DBUserProfile)
            .where(DBUserProfile.user_id == rating.user_id)
        ).first()
        
        activity = {
            "id": rating.id,
            "user_id": rating.user_id,
            "username": rating_user.username,
            "avatar": user_profile.avatar_url if user_profile else None,
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
        
        timeline.append(activity)
    
    return timeline

