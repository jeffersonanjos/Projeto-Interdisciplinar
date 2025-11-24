"""
Rotas relacionadas à atualização de gêneros de filmes.
"""
from fastapi import APIRouter, HTTPException, Depends
import logging

from sqlmodel import Session, select
from core.database import get_session
from core.models import Movie as DBMovie
from services.api_clients import buscar_detalhes_filme
from ..utils import omdb_title_to_movie

logger = logging.getLogger(__name__)

router = APIRouter(tags=["movies"])


@router.put("/movies/{movie_id}/update-genres")
async def update_movie_genres(movie_id: int, session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de um filme existente no banco de dados buscando da API do OMDb.
    """
    logger.info(f"Atualizando gêneros do filme com id: {movie_id}")
    db_movie = session.get(DBMovie, movie_id)
    if not db_movie:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    
    if not db_movie.external_id:
        raise HTTPException(status_code=400, detail="Movie does not have an external_id")
    
    try:
        movie_data = buscar_detalhes_filme(db_movie.external_id)
        if movie_data:
            movie_obj = omdb_title_to_movie(movie_data)
            if movie_obj and movie_obj.genres:
                db_movie.genres = movie_obj.genres
                session.add(db_movie)
                session.commit()
                session.refresh(db_movie)
                return {"message": "Genres updated successfully", "genres": db_movie.genres}
            else:
                return {"message": "No genres found in API response"}
        else:
            return {"message": "Filme não encontrado na API externa"}
    except Exception as e:
        logger.exception("Erro ao atualizar gêneros do filme")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar gêneros: {str(e)}")


@router.post("/movies/update-all-genres")
async def update_all_movies_genres(session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de todos os filmes no banco de dados que têm external_id mas não têm gêneros.
    """
    logger.info("Atualizando gêneros para todos os filmes")
    all_movies = session.exec(select(DBMovie).where(DBMovie.external_id.isnot(None))).all()
    
    movies_to_update = [
        movie for movie in all_movies 
        if not movie.genres or (isinstance(movie.genres, list) and len(movie.genres) == 0)
    ]
    
    updated_count = 0
    failed_count = 0
    
    for db_movie in movies_to_update:
        try:
            movie_data = buscar_detalhes_filme(db_movie.external_id)
            if movie_data:
                movie_obj = omdb_title_to_movie(movie_data)
                if movie_obj and movie_obj.genres:
                    db_movie.genres = movie_obj.genres
                    session.add(db_movie)
                    updated_count += 1
        except Exception as e:
            logger.exception(f"Erro ao atualizar gêneros do filme {db_movie.id}: {e}")
            failed_count += 1
    
    session.commit()
    
    return {
        "message": f"Updated genres for {updated_count} movies",
        "updated_count": updated_count,
        "failed_count": failed_count,
        "total_processed": len(movies_to_update)
    }

