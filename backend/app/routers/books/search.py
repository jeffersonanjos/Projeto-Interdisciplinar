"""
Rotas de busca de livros.
"""
from fastapi import APIRouter, Depends
from typing import List
import logging

from sqlmodel import Session, select
from core.schemas import BookRead
from core.models import Book
from core.database import get_session
from services.google_books import buscar_livros as google_buscar_livros
from ..utils import google_book_to_bookread

logger = logging.getLogger(__name__)

router = APIRouter(tags=["books"])


@router.get("/books/search", response_model=List[BookRead])
async def search_books(query: str, session: Session = Depends(get_session)):
    logger.info(f"Buscando livros com consulta: {query}")
    
    lista_livros = []
    
    # Buscar livros no banco de dados interno
    query_lower = query.lower()
    statement = select(Book).where(
        (Book.title.ilike(f"%{query_lower}%")) |
        (Book.author.ilike(f"%{query_lower}%"))
    )
    livros_internos = session.exec(statement).all()
    
    # Adicionar livros internos à lista
    for livro in livros_internos:
        lista_livros.append(BookRead(
            id=str(livro.id),
            title=livro.title,
            authors=[livro.author] if livro.author else [],
            description=livro.description,
            image_url=livro.cover_url,
            published_date=str(livro.publication_date.year) if livro.publication_date else None,
            author=livro.author,
            cover_url=livro.cover_url,
            external_id=livro.external_id,
            isbn=livro.isbn,
            publisher=livro.publisher,
            publication_date=livro.publication_date,
            genres=livro.genres
        ))
    
    # Buscar livros na Google Books API
    livros_api = google_buscar_livros(query)
    for livro in livros_api:
        dados_livro = google_book_to_bookread(livro)
        lista_livros.append(dados_livro)
    
    return lista_livros

