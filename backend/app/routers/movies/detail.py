"""
Rotas relacionadas a detalhes de filmes.
"""
from fastapi import APIRouter, HTTPException, Depends
import logging

from sqlmodel import Session
from core.schemas import Movie
from core.database import get_session
from services.api_clients import buscar_detalhes_filme
from ..utils import omdb_title_to_movie

logger = logging.getLogger(__name__)

router = APIRouter(tags=["movies"])


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

