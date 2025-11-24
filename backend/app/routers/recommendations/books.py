"""
Rotas relacionadas a recomendações de livros.
"""
from fastapi import APIRouter, Depends
from typing import List
import logging
from urllib.parse import quote_plus

from sqlmodel import Session, select
from core.schemas import BookRead
from core.database import get_session
from core.models import UserLibrary
from services.google_books import buscar_livros as google_buscar_livros, obter_livro_por_id
from ..utils import google_book_to_bookread

logger = logging.getLogger(__name__)

router = APIRouter(tags=["recommendations"])


@router.get("/users/{user_id}/recommendations/books", response_model=List[BookRead])
async def get_book_recommendations(user_id: int, session: Session = Depends(get_session)):
    """
    Busca recomendações de livros baseadas nos livros da biblioteca pessoal do usuário.
    Usa os gêneros e autores dos livros na biblioteca para encontrar livros similares.
    """
    logger.info(f"Obtendo recomendações de livros para o usuário: {user_id}")
    
    library_entries = session.exec(select(UserLibrary).where(UserLibrary.user_id == user_id)).all()
    
    if not library_entries:
        logger.info(f"Usuário {user_id} não tem livros na biblioteca")
        return []
    
    library_book_ids = [entry.book_external_id for entry in library_entries]
    library_books = []
    all_genres = set()
    all_authors = set()
    
    for external_id in library_book_ids:
        try:
            livro = obter_livro_por_id(external_id)
            if livro:
                book_data = google_book_to_bookread(livro)
                library_books.append(book_data)
                if book_data.genres:
                    all_genres.update(book_data.genres)
                if book_data.authors:
                    if isinstance(book_data.authors, list):
                        all_authors.update(book_data.authors)
                    else:
                        all_authors.add(book_data.authors)
        except Exception as e:
            logger.exception(f"Erro ao buscar livro {external_id} para recomendações: {e}")
    
    if not all_genres and not all_authors:
        logger.info(f"Nenhum gênero ou autor encontrado na biblioteca do usuário {user_id}")
        return []
    
    recommended_books = []
    seen_book_ids = set(library_book_ids)
    
    for genre in list(all_genres)[:3]:
        try:
            encoded_genre = quote_plus(genre)
            consulta_busca = f"subject:{encoded_genre}"
            livros = google_buscar_livros(consulta_busca)
            
            for livro in livros[:10]:
                id_livro = livro.get("id")
                if id_livro and id_livro not in seen_book_ids:
                    seen_book_ids.add(id_livro)
                    livro_lido = google_book_to_bookread(livro)
                    recommended_books.append(livro_lido)
        except Exception as e:
            logger.exception(f"Erro ao buscar livros por gênero {genre}: {e}")
    
    if len(recommended_books) < 20:
        for author in list(all_authors)[:2]:
            try:
                encoded_author = quote_plus(author)
                consulta_busca = f"inauthor:{encoded_author}"
                livros = google_buscar_livros(consulta_busca)
                
                for livro in livros[:10]:
                    id_livro = livro.get("id")
                    if id_livro and id_livro not in seen_book_ids:
                        seen_book_ids.add(id_livro)
                        livro_lido = google_book_to_bookread(livro)
                        recommended_books.append(livro_lido)
                        
                        if len(recommended_books) >= 30:
                            break
            except Exception as e:
                logger.exception(f"Erro ao buscar livros por autor {author}: {e}")
            
            if len(recommended_books) >= 30:
                break
    
    return recommended_books[:30]

