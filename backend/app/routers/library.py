"""
Rotas relacionadas à biblioteca do usuário (livros e filmes).
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
import logging

from sqlmodel import Session, select
from core.models import User, UserLibrary, UserMovieLibrary
from core.schemas import BookRead, Movie
from core.database import get_session
from core.auth import get_current_active_user
from services.api_clients import buscar_detalhes_filme
from services.google_books import obter_livro_por_id
import re
from .utils import omdb_title_to_movie

logger = logging.getLogger(__name__)

router = APIRouter(tags=["library"])


@router.get("/users/{user_id}/library", response_model=List[BookRead])
async def get_user_library(user_id: int, session: Session = Depends(get_session)):
    """Obtém a biblioteca de livros do usuário (mantido para compatibilidade com versões anteriores)."""
    logger.info(f"Obtendo biblioteca de livros para o usuário: {user_id}")
    entries = session.exec(select(UserLibrary).where(UserLibrary.user_id == user_id)).all()
    books: List[BookRead] = []
    for entry in entries:
        try:
            livro = obter_livro_por_id(entry.book_external_id)
            if livro:
                info_volume = livro.get("volumeInfo", {})
                categorias = info_volume.get("categories", [])
                generos = categorias if isinstance(categorias, list) else []
                data_publicacao = info_volume.get("publishedDate", "")
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
                books.append(dados_livro)
        except Exception:
            logger.exception("Failed to fetch book details for %s", entry.book_external_id)
    return books


@router.get("/users/{user_id}/library/movies", response_model=List[Movie])
async def get_user_movie_library(user_id: int, session: Session = Depends(get_session)):
    """Obtém a biblioteca de filmes do usuário."""
    logger.info(f"Obtendo biblioteca de filmes para o usuário: {user_id}")
    entries = session.exec(select(UserMovieLibrary).where(UserMovieLibrary.user_id == user_id)).all()
    movies: List[Movie] = []
    seen_ids = set()
    for entry in entries:
        try:
            movie_data = buscar_detalhes_filme(entry.movie_external_id)
            if movie_data:
                movie = omdb_title_to_movie(movie_data)
                if movie is not None and movie.id and movie.id not in seen_ids:
                    seen_ids.add(movie.id)
                    movies.append(movie)
        except Exception:
            logger.exception("Failed to fetch movie details for %s", entry.movie_external_id)
    return movies


@router.post("/library/add")
async def add_book_to_library(book_id: Dict[str, str], current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Adicionando livro {book_id} à biblioteca do usuário {current_user.username}")
    id_livro_str = book_id.get("book_id")
    livro = obter_livro_por_id(id_livro_str)
    if not livro:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    existente = session.exec(
        select(UserLibrary).where(
            (UserLibrary.user_id == current_user.id) & (UserLibrary.book_external_id == id_livro_str)
        )
    ).first()
    if existente:
        return {"message": "Livro já está na biblioteca"}
    entrada = UserLibrary(user_id=current_user.id, book_external_id=id_livro_str)
    session.add(entrada)
    session.commit()
    session.refresh(entrada)
    return {"message": "Livro adicionado à biblioteca", "book_id": id_livro_str}


@router.delete("/library/remove")
async def remove_book_from_library(book_id: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Removendo livro {book_id} da biblioteca do usuário {current_user.username}")
    
    entrada_biblioteca = session.exec(
        select(UserLibrary).where(
            (UserLibrary.user_id == current_user.id) & (UserLibrary.book_external_id == book_id)
        )
    ).first()
    
    if not entrada_biblioteca:
        raise HTTPException(status_code=404, detail="Livro não encontrado na biblioteca")
    
    session.delete(entrada_biblioteca)
    session.commit()
    return {"message": "Livro removido da biblioteca", "book_id": book_id}


@router.post("/library/movies/add")
async def add_movie_to_library(movie_id: Dict[str, str], current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Adicionando filme {movie_id} à biblioteca do usuário {current_user.username}")
    id_filme_str = movie_id.get("movie_id")
    dados_filme = buscar_detalhes_filme(id_filme_str)
    if not dados_filme:
        raise HTTPException(status_code=404, detail="Filme não encontrado")

    existente = session.exec(
        select(UserMovieLibrary).where(
            (UserMovieLibrary.user_id == current_user.id) & (UserMovieLibrary.movie_external_id == id_filme_str)
        )
    ).first()
    if existente:
        return {"message": "Filme já está na biblioteca"}
    entrada = UserMovieLibrary(user_id=current_user.id, movie_external_id=id_filme_str)
    session.add(entrada)
    session.commit()
    session.refresh(entrada)
    return {"message": "Filme adicionado à biblioteca", "movie_id": id_filme_str}


@router.delete("/library/movies/remove")
async def remove_movie_from_library(movie_id: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Removendo filme {movie_id} da biblioteca do usuário {current_user.username}")
    
    entrada_biblioteca = session.exec(
        select(UserMovieLibrary).where(
            (UserMovieLibrary.user_id == current_user.id) & (UserMovieLibrary.movie_external_id == movie_id)
        )
    ).first()
    
    if not entrada_biblioteca:
        raise HTTPException(status_code=404, detail="Filme não encontrado na biblioteca")
    
    session.delete(entrada_biblioteca)
    session.commit()
    return {"message": "Filme removido da biblioteca", "movie_id": movie_id}

