"""
Rotas relacionadas a filmes.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
import logging
import asyncio
import concurrent.futures

from sqlmodel import Session, select
from core.schemas import Movie
from core.database import get_session
from core.models import Movie as DBMovie
from services.api_clients import buscar_dados_filme, buscar_detalhes_filme
from .utils import omdb_title_to_movie, VALID_OMDB_SORT, VALID_SORT_ORDER

logger = logging.getLogger(__name__)

router = APIRouter(tags=["movies"])


@router.get("/movies/search", response_model=List[Movie])
async def search_movies(
    query: str,
    limit: int = 10,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    genre: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    session: Session = Depends(get_session),
):
    logger.info("OMDb search_movies chamado com query=%s", query)

    sort_by_normalizado = sort_by if sort_by in VALID_OMDB_SORT else None
    sort_order_normalizado = sort_order.upper() if sort_order and sort_order.upper() in VALID_SORT_ORDER else None

    dados_filmes = buscar_dados_filme(
        query,
        limite=limit,
        ano_inicio=start_year,
        ano_fim=end_year,
        generos=[genre] if genre else None,
        ordenar_por=sort_by_normalizado,
        ordem_ordenacao=sort_order_normalizado,
    )
    if not dados_filmes or "results" not in dados_filmes:
        raise HTTPException(status_code=404, detail="Nenhum filme encontrado")

    # Buscar detalhes completos de cada filme para obter gêneros
    resultados = dados_filmes["results"]
    
    async def buscar_filme_com_detalhes(item: Dict[str, Any]) -> Movie:
        """Busca detalhes completos do filme se tiver IMDb ID"""
        imdb_id = item.get("imdbID") or item.get("imdbid")
        
        if not imdb_id:
            return omdb_title_to_movie(item)
        
        # Buscar detalhes completos em thread pool para não bloquear
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            try:
                detalhes = await loop.run_in_executor(
                    executor, 
                    buscar_detalhes_filme, 
                    imdb_id
                )
                if detalhes and detalhes.get("Response") == "True":
                    return omdb_title_to_movie(detalhes)
            except Exception as e:
                logger.warning(f"Erro ao buscar detalhes para {imdb_id}: {e}")
        
        return omdb_title_to_movie(item)
    
    # Buscar todos os detalhes em paralelo e filtrar None (itens inválidos)
    filmes = await asyncio.gather(*[buscar_filme_com_detalhes(item) for item in resultados])
    
    # Filtrar resultados None (itens que não são filmes válidos) e remover duplicatas
    ids_vistos = set()
    filmes_validos = []
    for filme in filmes:
        if filme is not None and filme.id:
            if filme.id not in ids_vistos:
                ids_vistos.add(filme.id)
                filmes_validos.append(filme)
    
    return filmes_validos


@router.get("/movies/{external_id}", response_model=Movie)
async def get_movie(external_id: str, session: Session = Depends(get_session)):
    logger.info(f"get_movie chamado com external_id: {external_id}")
    dados_filme = buscar_detalhes_filme(external_id)
    if not dados_filme:
        raise HTTPException(status_code=404, detail="Filme não encontrado")

    filme = omdb_title_to_movie(dados_filme)
    if not filme:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    return filme


@router.get("/movies", response_model=List[Movie])
async def search_movies_public(
    query: str,
    limit: int = 10,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    genre: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
):
    """Busca pública de filmes usando a API do OMDb (não requer autenticação)."""
    normalized_sort_by = sort_by if sort_by in VALID_OMDB_SORT else None
    normalized_sort_order = sort_order.upper() if sort_order and sort_order.upper() in VALID_SORT_ORDER else None

    movie_data = buscar_dados_filme(
        query,
        limite=limit,
        ano_inicio=start_year,
        ano_fim=end_year,
        generos=[genre] if genre else None,
        ordenar_por=normalized_sort_by,
        ordem_ordenacao=normalized_sort_order,
    )
    if not movie_data or "results" not in movie_data:
        raise HTTPException(status_code=404, detail="Nenhum filme encontrado")

    results = movie_data["results"]
    
    async def fetch_movie_with_details(item: Dict[str, Any]) -> Optional[Movie]:
        """Busca detalhes completos do filme se tiver IMDb ID"""
        imdb_id = item.get("imdbID") or item.get("imdbid")
        
        if not imdb_id:
            return omdb_title_to_movie(item)
        
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            try:
                details = await loop.run_in_executor(
                    executor, 
                    buscar_detalhes_filme, 
                    imdb_id
                )
                if details and details.get("Response") == "True":
                    return omdb_title_to_movie(details)
            except Exception as e:
                logger.warning(f"Erro ao buscar detalhes para {imdb_id}: {e}")
        
        return omdb_title_to_movie(item)
    
    movies = await asyncio.gather(*[fetch_movie_with_details(item) for item in results])
    
    seen_ids = set()
    valid_movies = []
    for m in movies:
        if m is not None and m.id:
            if m.id not in seen_ids:
                seen_ids.add(m.id)
                valid_movies.append(m)
    
    return valid_movies


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

