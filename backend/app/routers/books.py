"""
Rotas relacionadas a livros.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging
import re

from sqlmodel import Session, select
from core.schemas import BookRead, Book
from core.database import get_session
from core.models import Book as DBBook
from services.google_books import buscar_livros as google_buscar_livros, obter_livro_por_id
from services.api_clients import buscar_dados_livro

logger = logging.getLogger(__name__)

router = APIRouter(tags=["books"])


@router.get("/books/search", response_model=List[BookRead])
async def search_books(query: str, session: Session = Depends(get_session)):
    logger.info(f"Buscando livros com consulta: {query}")
    livros = google_buscar_livros(query)
    # Converter os livros para schema BookRead
    lista_livros = []
    for livro in livros:
        info_volume = livro.get("volumeInfo", {})
        # Extrair gêneros do campo categories da API do Google Books
        categorias = info_volume.get("categories", [])
        generos = categorias if isinstance(categorias, list) else []
        # Extrair ano de publicação
        data_publicacao = info_volume.get("publishedDate", "")
        # Se for uma data completa, extrair apenas o ano
        if data_publicacao:
            correspondencia_ano = re.search(r'(\d{4})', data_publicacao) if isinstance(data_publicacao, str) else None
            data_publicacao = correspondencia_ano.group(1) if correspondencia_ano else data_publicacao
        
        dados_livro = BookRead(
            id=livro.get("id", "N/A"),
            title=info_volume.get("title", "N/A"),
            authors=info_volume.get("authors", ["N/A"]),
            description=info_volume.get("description", "N/A"),
            image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
            genres=generos if generos else None,
            published_date=data_publicacao if data_publicacao else None,
        )
        lista_livros.append(dados_livro)
    return lista_livros


@router.get("/books/{book_id}", response_model=BookRead)
async def get_book(book_id: str, session: Session = Depends(get_session)):
    logger.info(f"Obtendo livro com book_id: {book_id}")
    livro = obter_livro_por_id(book_id)
    if livro:
        info_volume = livro.get("volumeInfo", {})
        # Extrair gêneros do campo categories da API do Google Books
        categorias = info_volume.get("categories", [])
        generos = categorias if isinstance(categorias, list) else []
        # Extrair ano de publicação
        data_publicacao = info_volume.get("publishedDate", "")
        # Se for uma data completa, extrair apenas o ano
        if data_publicacao:
            correspondencia_ano = re.search(r'(\d{4})', data_publicacao) if isinstance(data_publicacao, str) else None
            data_publicacao = correspondencia_ano.group(1) if correspondencia_ano else data_publicacao
        
        dados_livro = BookRead(
            id=livro.get("id", "N/A"),
            title=info_volume.get("title", "N/A"),
            authors=info_volume.get("authors", ["N/A"]),
            description=info_volume.get("description", "N/A"),
            image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
            genres=generos if generos else None,
            published_date=data_publicacao if data_publicacao else None,
        )
        return dados_livro
    else:
        raise HTTPException(status_code=404, detail="Livro não encontrado")


@router.get("/books", response_model=List[Book])
async def search_books_public_api(consulta: str):
    logger.info(f"Buscando livros com consulta: {consulta} (API externa)")
    """Busca livros usando a API do Google Books."""
    dados_livros = buscar_dados_livro(consulta)
    if not dados_livros or "items" not in dados_livros:
        raise HTTPException(status_code=404, detail="Nenhum livro encontrado")

    livros = []
    for item in dados_livros["items"]:
        info_volume = item["volumeInfo"]
        livro = Book(
            id=item["id"],
            title=info_volume.get("title", "N/A"),
            authors=info_volume.get("authors", ["N/A"]),
            description=info_volume.get("description", "N/A"),
            image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
        )
        livros.append(livro)
    return livros


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
        book_data = await get_book(db_book.external_id, session)
        if book_data and book_data.genres:
            db_book.genres = book_data.genres
            session.add(db_book)
            session.commit()
            session.refresh(db_book)
            return {"message": "Genres updated successfully", "genres": db_book.genres}
        else:
            return {"message": "No genres found in API response"}
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
            book_data = await get_book(db_book.external_id, session)
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

