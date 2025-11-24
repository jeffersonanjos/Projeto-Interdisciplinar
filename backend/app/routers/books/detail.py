"""
Rotas relacionadas a detalhes de livros.
"""
from fastapi import APIRouter, HTTPException, Depends
import logging

from sqlmodel import Session
from core.schemas import BookRead
from core.database import get_session
from services.google_books import obter_livro_por_id
from ..utils import google_book_to_bookread

logger = logging.getLogger(__name__)

router = APIRouter(tags=["books"])


@router.get("/books/{book_id}", response_model=BookRead)
async def get_book(book_id: str, session: Session = Depends(get_session)):
    logger.info(f"Obtendo livro com book_id: {book_id}")
    livro = obter_livro_por_id(book_id)
    if livro:
        dados_livro = google_book_to_bookread(livro)
        return dados_livro
    else:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

