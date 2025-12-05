from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import List

from core.database import get_session
from core.models import Movie, User
from core.schemas import MovieCreate, MovieRead
from core.auth import get_current_admin, get_current_curator_or_admin

router = APIRouter()


@router.post("/movies/manual", response_model=MovieRead, status_code=status.HTTP_201_CREATED)
async def create_movie_manually(
    movie: MovieCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    if current_user.is_muted:
        raise HTTPException(
            status_code=403, 
            detail="Você está silenciado e não pode criar filmes"
        )
    
    db_movie = Movie(**movie.dict())
    session.add(db_movie)
    session.commit()
    session.refresh(db_movie)
    return db_movie
