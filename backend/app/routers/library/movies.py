"""
Rotas relacionadas à biblioteca de filmes do usuário.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
import logging

from sqlmodel import Session, select
from core.models import User, UserMovieLibrary
from core.schemas import Movie
from core.database import get_session
from core.auth import get_current_active_user
from services.api_clients import buscar_detalhes_filme
from ..utils import omdb_title_to_movie

logger = logging.getLogger(__name__)

router = APIRouter(tags=["library"])


@router.get("/users/{user_id}/library/movies", response_model=List[Movie])
async def get_user_movie_library(user_id: int, session: Session = Depends(get_session)):
    """Obtém a biblioteca de filmes do usuário."""
    logger.info(f"Obtendo biblioteca de filmes para o usuário: {user_id}")
    entries = session.exec(select(UserMovieLibrary).where(UserMovieLibrary.user_id == user_id)).all()
    movies: List[Movie] = []
    seen_ids = set()
    for entry in entries:
        try:
            movie_data = buscar_detalhes_filme(entry.movie_external_id)
            if movie_data:
                movie = omdb_title_to_movie(movie_data)
                if movie is not None and movie.id and movie.id not in seen_ids:
                    seen_ids.add(movie.id)
                    movies.append(movie)
        except Exception:
            logger.exception("Failed to fetch movie details for %s", entry.movie_external_id)
    return movies


@router.post("/library/movies/add")
async def add_movie_to_library(movie_id: Dict[str, str], current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Adicionando filme {movie_id} à biblioteca do usuário {current_user.username}")
    
    if current_user.is_muted:
        raise HTTPException(
            status_code=403, 
            detail="Você está silenciado e não pode adicionar itens à biblioteca"
        )
    
    id_filme_str = movie_id.get("movie_id")
    dados_filme = buscar_detalhes_filme(id_filme_str)
    if not dados_filme:
        raise HTTPException(status_code=404, detail="Filme não encontrado")

    existente = session.exec(
        select(UserMovieLibrary).where(
            (UserMovieLibrary.user_id == current_user.id) & (UserMovieLibrary.movie_external_id == id_filme_str)
        )
    ).first()
    if existente:
        return {"message": "Filme já está na biblioteca"}
    entrada = UserMovieLibrary(user_id=current_user.id, movie_external_id=id_filme_str)
    session.add(entrada)
    session.commit()
    session.refresh(entrada)
    return {"message": "Filme adicionado à biblioteca", "movie_id": id_filme_str}


@router.delete("/library/movies/remove")
async def remove_movie_from_library(movie_id: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Removendo filme {movie_id} da biblioteca do usuário {current_user.username}")
    
    entrada_biblioteca = session.exec(
        select(UserMovieLibrary).where(
            (UserMovieLibrary.user_id == current_user.id) & (UserMovieLibrary.movie_external_id == movie_id)
        )
    ).first()
    
    if not entrada_biblioteca:
        raise HTTPException(status_code=404, detail="Filme não encontrado na biblioteca")
    
    session.delete(entrada_biblioteca)
    session.commit()
    return {"message": "Filme removido da biblioteca", "movie_id": movie_id}

