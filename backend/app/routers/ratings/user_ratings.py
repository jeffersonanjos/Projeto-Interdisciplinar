"""
Rotas relacionadas a avaliações de usuários específicos.
"""
from fastapi import APIRouter, Depends
from typing import List, Dict, Any
import logging

from sqlmodel import Session, select
from core.models import Book as DBBook, Movie as DBMovie
from core.models import Rating
from core.database import get_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ratings"])


@router.get("/users/{user_id}/ratings", response_model=List[Dict[str, Any]])
async def get_user_ratings(
    user_id: int, 
    include_details: bool = False,
    session: Session = Depends(get_session)
):
    """
    Obtém avaliações do usuário.
    
    Args:
        user_id: ID do usuário
        include_details: Se True, retorna objetos book/movie completos (como /reviews)
                        Se False, retorna apenas external_ids (comportamento padrão)
    """
    logger.info(f"Obtendo avaliações para usuário: {user_id}, include_details={include_details}")
    avaliacoes = session.exec(select(Rating).where(Rating.user_id == user_id)).all()
    avaliacoes_com_id_externo = []
    for avaliacao in avaliacoes:
        dicionario_avaliacao = {
            "id": avaliacao.id,
            "user_id": avaliacao.user_id,
            "book_id": avaliacao.book_id,
            "movie_id": avaliacao.movie_id,
            "score": avaliacao.score,
            "rating": avaliacao.score,  # Compatibilidade com reviews
            "comment": avaliacao.comment,
            "created_at": avaliacao.created_at,
            "book_external_id": None,
            "movie_external_id": None,
        }
        
        if avaliacao.book_id:
            livro_db = session.get(DBBook, avaliacao.book_id)
            if livro_db:
                if livro_db.external_id:
                    dicionario_avaliacao["book_external_id"] = livro_db.external_id
                
                # Se include_details=True, adicionar objeto book completo
                if include_details:
                    dicionario_avaliacao["book"] = {
                        "id": livro_db.id,
                        "title": livro_db.title,
                        "author": livro_db.author,
                        "genres": livro_db.genres or [],
                        "genre": ", ".join(livro_db.genres) if livro_db.genres else None,
                    }
        
        if avaliacao.movie_id:
            filme_db = session.get(DBMovie, avaliacao.movie_id)
            if filme_db:
                if filme_db.external_id:
                    dicionario_avaliacao["movie_external_id"] = filme_db.external_id
                
                # Se include_details=True, adicionar objeto movie completo
                if include_details:
                    dicionario_avaliacao["movie"] = {
                        "id": filme_db.id,
                        "title": filme_db.title,
                        "director": filme_db.director,
                        "genres": filme_db.genres or [],
                        "genre": ", ".join(filme_db.genres) if filme_db.genres else None,
                    }
        
        avaliacoes_com_id_externo.append(dicionario_avaliacao)
    return avaliacoes_com_id_externo

