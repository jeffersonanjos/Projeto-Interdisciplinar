"""
Rotas relacionadas a recomendações de filmes.
"""
from fastapi import APIRouter, Depends
from typing import List
import logging

from sqlmodel import Session, select
from core.schemas import Movie
from core.database import get_session
from core.models import UserMovieLibrary
from services.api_clients import buscar_dados_filme, buscar_detalhes_filme
from ..utils import omdb_title_to_movie

logger = logging.getLogger(__name__)

router = APIRouter(tags=["recommendations"])


@router.get("/users/{user_id}/recommendations/movies", response_model=List[Movie])
async def get_movie_recommendations(user_id: int, session: Session = Depends(get_session)):
    """
    Busca recomendações de filmes baseadas nos filmes da biblioteca pessoal do usuário.
    Usa os gêneros dos filmes na biblioteca para encontrar filmes similares.
    """
    logger.info(f"Obtendo recomendações de filmes para o usuário: {user_id}")
    
    library_entries = session.exec(select(UserMovieLibrary).where(UserMovieLibrary.user_id == user_id)).all()
    
    if not library_entries:
        logger.info(f"Usuário {user_id} não tem filmes na biblioteca")
        return []
    
    library_movie_ids = [entry.movie_external_id for entry in library_entries]
    library_movies = []
    all_genres = set()
    
    for external_id in library_movie_ids:
        try:
            movie_data = buscar_detalhes_filme(external_id)
            if movie_data:
                movie_obj = omdb_title_to_movie(movie_data)
                if movie_obj:
                    library_movies.append(movie_obj)
                genres_str = movie_data.get("Genre") or movie_data.get("genre", "")
                if genres_str:
                    genres_list = [g.strip() for g in genres_str.split(",") if g.strip()]
                    all_genres.update(genres_list)
        except Exception as e:
            logger.exception(f"Erro ao buscar filme {external_id} para recomendações: {e}")
    
    if not all_genres:
        logger.info(f"Nenhum gênero encontrado na biblioteca de filmes do usuário {user_id}")
        return []
    
    recommended_movies = []
    seen_movie_ids = set(library_movie_ids)
    
    for genre in list(all_genres)[:3]:
        try:
            resultados_busca = buscar_dados_filme(genre, limite=20)
            if resultados_busca and "results" in resultados_busca:
                for movie_item in resultados_busca["results"][:15]:
                    movie_id = movie_item.get("imdbID")
                    if movie_id and movie_id not in seen_movie_ids:
                        movie_genres_str = movie_item.get("Genre", "")
                        if movie_genres_str and genre.lower() in movie_genres_str.lower():
                            seen_movie_ids.add(movie_id)
                            movie_obj = omdb_title_to_movie(movie_item)
                            if movie_obj:
                                recommended_movies.append(movie_obj)
                            
                            if len(recommended_movies) >= 30:
                                break
        except Exception as e:
            logger.exception(f"Erro ao buscar filmes por gênero {genre}: {e}")
        
        if len(recommended_movies) >= 30:
            break
    
    if len(recommended_movies) < 20:
        try:
            popular_terms = ["action", "drama", "comedy", "thriller"]
            for term in popular_terms[:2]:
                resultados_busca = buscar_dados_filme(term, limite=15)
                if resultados_busca and "results" in resultados_busca:
                    for movie_item in resultados_busca["results"]:
                        movie_id = movie_item.get("imdbID")
                        if movie_id and movie_id not in seen_movie_ids:
                            seen_movie_ids.add(movie_id)
                            movie_obj = omdb_title_to_movie(movie_item)
                            if movie_obj:
                                recommended_movies.append(movie_obj)
                            
                            if len(recommended_movies) >= 30:
                                break
                if len(recommended_movies) >= 30:
                    break
        except Exception as e:
            logger.exception(f"Erro ao buscar filmes populares: {e}")
    
    return recommended_movies[:30]

