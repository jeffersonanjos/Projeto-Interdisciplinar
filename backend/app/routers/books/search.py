"""
Rotas de busca de livros.
"""
from fastapi import APIRouter, Depends
from typing import List
import logging

from sqlmodel import Session
from core.schemas import BookRead
from core.database import get_session
from services.google_books import buscar_livros as google_buscar_livros
from ..utils import google_book_to_bookread

logger = logging.getLogger(__name__)

router = APIRouter(tags=["books"])


@router.get("/books/search", response_model=List[BookRead])
async def search_books(query: str, session: Session = Depends(get_session)):
    logger.info(f"Buscando livros com consulta: {query}")
    livros = google_buscar_livros(query)
    # Converter os livros para schema BookRead usando função utilitária
    lista_livros = []
    for livro in livros:
        dados_livro = google_book_to_bookread(livro)
        lista_livros.append(dados_livro)
    return lista_livros

