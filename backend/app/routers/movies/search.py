"""
Rotas de busca de filmes.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
import logging
import asyncio
import concurrent.futures

from sqlmodel import Session, select
from core.schemas import Movie
from core.models import Movie as MovieModel
from core.database import get_session
from services.api_clients import buscar_dados_filme, buscar_detalhes_filme
from ..utils import omdb_title_to_movie, VALID_OMDB_SORT, VALID_SORT_ORDER

logger = logging.getLogger(__name__)

router = APIRouter(tags=["movies"])


# Função auxiliar para busca de filmes (consolidada)
async def _search_movies_impl(
    query: str,
    limit: int = 10,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    genre: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    session: Session = None,
) -> List[Movie]:
    """Implementação consolidada de busca de filmes"""
    filmes_resultado = []
    
    # Buscar filmes no banco de dados interno
    if session:
        query_lower = query.lower()
        statement = select(MovieModel).where(
            (MovieModel.title.ilike(f"%{query_lower}%")) |
            (MovieModel.director.ilike(f"%{query_lower}%"))
        )
        filmes_internos = session.exec(statement).all()
        
        for filme in filmes_internos:
            filmes_resultado.append(Movie(
                id=str(filme.id),
                title=filme.title,
                overview=filme.description,
                poster_path=filme.cover_url,
                release_date=str(filme.release_date.year) if filme.release_date else None,
                genres=filme.genres,
                director=filme.director,
                cast=filme.cast
            ))
    
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
        if filmes_resultado:
            return filmes_resultado
        raise HTTPException(status_code=404, detail="Nenhum filme encontrado")

    resultados = dados_filmes["results"]
    
    async def buscar_filme_com_detalhes(item: Dict[str, Any]) -> Movie:
        """Busca detalhes completos do filme se tiver IMDb ID"""
        imdb_id = item.get("imdbID") or item.get("imdbid")
        
        if not imdb_id:
            return omdb_title_to_movie(item)
        
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
    
    filmes = await asyncio.gather(*[buscar_filme_com_detalhes(item) for item in resultados])
    
    ids_vistos = set()
    
    # Adicionar filmes internos primeiro
    for filme in filmes_resultado:
        if filme.id not in ids_vistos:
            ids_vistos.add(filme.id)
    
    # Adicionar filmes da API externa
    for filme in filmes:
        if filme is not None and filme.id:
            if filme.id not in ids_vistos:
                ids_vistos.add(filme.id)
                filmes_resultado.append(filme)
    
    return filmes_resultado


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
    """Busca de filmes (requer autenticação). Redireciona para /movies."""
    logger.info("OMDb search_movies chamado com query=%s", query)
    return await _search_movies_impl(
        query, limit, start_year, end_year, genre, sort_by, sort_order, session
    )


@router.get("/movies", response_model=List[Movie])
async def search_movies_public(
    query: str,
    limit: int = 10,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    genre: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """
    Busca pública de filmes usando a API do OMDb (não requer autenticação).
    Endpoint principal usado pelo frontend. Reutiliza a lógica consolidada.
    """
    logger.info("Busca pública de filmes com query=%s", query)
    return await _search_movies_impl(
        query, limit, start_year, end_year, genre, sort_by, sort_order, session
    )

