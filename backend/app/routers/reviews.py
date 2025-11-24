"""
Rotas relacionadas a reviews (avaliações enriquecidas).
"""
from fastapi import APIRouter, Depends
from typing import List, Dict, Any
import logging

from sqlmodel import Session, select
from core.models import Rating, Book as DBBook, Movie as DBMovie
from core.database import get_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["reviews"])


@router.get("/users/{user_id}/reviews", response_model=List[Dict[str, Any]])
async def get_user_reviews(user_id: int, session: Session = Depends(get_session)):
    logger.info(f"Obtendo avaliações para o usuário: {user_id}")
    ratings = session.exec(select(Rating).where(Rating.user_id == user_id)).all()
    reviews_with_external = []
    for rating in ratings:
        review_dict = {
            "id": rating.id,
            "user_id": rating.user_id,
            "book_id": rating.book_id,
            "movie_id": rating.movie_id,
            "score": rating.score,
            "rating": rating.score,
            "comment": rating.comment,
            "created_at": rating.created_at,
            "book_external_id": None,
            "movie_external_id": None,
            "book": None,
            "movie": None,
        }
        if rating.book_id:
            db_book = session.get(DBBook, rating.book_id)
            if db_book:
                if db_book.external_id:
                    review_dict["book_external_id"] = db_book.external_id
                review_dict["book"] = {
                    "id": db_book.id,
                    "title": db_book.title,
                    "author": db_book.author,
                    "genres": db_book.genres or [],
                    "genre": ", ".join(db_book.genres) if db_book.genres else None,
                }
        if rating.movie_id:
            db_movie = session.get(DBMovie, rating.movie_id)
            if db_movie:
                if db_movie.external_id:
                    review_dict["movie_external_id"] = db_movie.external_id
                review_dict["movie"] = {
                    "id": db_movie.id,
                    "title": db_movie.title,
                    "director": db_movie.director,
                    "genres": db_movie.genres or [],
                    "genre": ", ".join(db_movie.genres) if db_movie.genres else None,
                }
        reviews_with_external.append(review_dict)
    return reviews_with_external

