"""
Rotas relacionadas à atualização de gêneros de livros.
"""
from fastapi import APIRouter, HTTPException, Depends
import logging

from sqlmodel import Session, select
from core.database import get_session
from core.models import Book as DBBook
from services.google_books import obter_livro_por_id
from ..utils import google_book_to_bookread

logger = logging.getLogger(__name__)

router = APIRouter(tags=["books"])


@router.put("/books/{book_id}/update-genres")
async def update_book_genres(book_id: int, session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de um livro existente no banco de dados buscando da API do Google Books.
    """
    logger.info(f"Atualizando gêneros do livro com id: {book_id}")
    db_book = session.get(DBBook, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    
    if not db_book.external_id:
        raise HTTPException(status_code=400, detail="Book does not have an external_id")
    
    # Buscar dados atualizados da API
    try:
        livro = obter_livro_por_id(db_book.external_id)
        if livro:
            book_data = google_book_to_bookread(livro)
            if book_data.genres:
                db_book.genres = book_data.genres
                session.add(db_book)
                session.commit()
                session.refresh(db_book)
                return {"message": "Genres updated successfully", "genres": db_book.genres}
            else:
                return {"message": "No genres found in API response"}
        else:
            return {"message": "Livro não encontrado na API"}
    except Exception as e:
        logger.exception("Erro ao atualizar gêneros do livro")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar gêneros: {str(e)}")


@router.post("/books/update-all-genres")
async def update_all_books_genres(session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de todos os livros no banco de dados que têm external_id mas não têm gêneros.
    """
    logger.info("Atualizando gêneros para todos os livros")
    # Buscar todos os livros com external_id
    all_books = session.exec(select(DBBook).where(DBBook.external_id.isnot(None))).all()
    
    # Filtrar livros sem gêneros (None ou lista vazia)
    books_to_update = [
        book for book in all_books 
        if not book.genres or (isinstance(book.genres, list) and len(book.genres) == 0)
    ]
    
    updated_count = 0
    failed_count = 0
    
    for db_book in books_to_update:
        try:
            livro = obter_livro_por_id(db_book.external_id)
            if livro:
                book_data = google_book_to_bookread(livro)
                if book_data and book_data.genres:
                    db_book.genres = book_data.genres
                    session.add(db_book)
                    updated_count += 1
        except Exception as e:
            logger.exception(f"Erro ao atualizar gêneros do livro {db_book.id}: {e}")
            failed_count += 1
    
    session.commit()
    return {
        "message": "Genres update completed",
        "updated": updated_count,
        "failed": failed_count,
        "total": len(books_to_update)
    }

