"""
Rotas relacionadas a recomendações de livros e filmes.
"""
from fastapi import APIRouter, Depends
from typing import List
import logging
from urllib.parse import quote_plus

from sqlmodel import Session, select
from core.schemas import BookRead, Movie
from core.database import get_session
from core.models import UserLibrary, UserMovieLibrary
from services.api_clients import buscar_dados_filme, buscar_detalhes_filme
from services.google_books import buscar_livros as google_buscar_livros, obter_livro_por_id
import re
from .utils import omdb_title_to_movie

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
                info_volume = livro.get("volumeInfo", {})
                categorias = info_volume.get("categories", [])
                generos = categorias if isinstance(categorias, list) else []
                authors = info_volume.get("authors", [])
                
                book_data = BookRead(
                    id=livro.get("id", "N/A"),
                    title=info_volume.get("title", "N/A"),
                    authors=authors,
                    description=info_volume.get("description", "N/A"),
                    image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
                    genres=generos if generos else None,
                )
                library_books.append(book_data)
                if generos:
                    all_genres.update(generos)
                if authors:
                    if isinstance(authors, list):
                        all_authors.update(authors)
                    else:
                        all_authors.add(authors)
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
                    info_volume = livro.get("volumeInfo", {})
                    categorias = info_volume.get("categories", [])
                    generos = categorias if isinstance(categorias, list) else []
                    
                    livro_lido = BookRead(
                        id=id_livro,
                        title=info_volume.get("title", "N/A"),
                        authors=info_volume.get("authors", ["N/A"]),
                        description=info_volume.get("description", "N/A"),
                        image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
                        genres=generos if generos else None,
                    )
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
                        info_volume = livro.get("volumeInfo", {})
                        categorias = info_volume.get("categories", [])
                        generos = categorias if isinstance(categorias, list) else []
                        
                        livro_lido = BookRead(
                            id=id_livro,
                            title=info_volume.get("title", "N/A"),
                            authors=info_volume.get("authors", ["N/A"]),
                            description=info_volume.get("description", "N/A"),
                            image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
                            genres=generos if generos else None,
                        )
                        recommended_books.append(livro_lido)
                        
                        if len(recommended_books) >= 30:
                            break
            except Exception as e:
                logger.exception(f"Erro ao buscar livros por autor {author}: {e}")
            
            if len(recommended_books) >= 30:
                break
    
    return recommended_books[:30]


@router.get("/users/{user_id}/recommendations/movies", response_model=List[Movie])
async def get_movie_recommendations(user_id: int, session: Session = Depends(get_session)):
    """
    Busca recomendações de filmes baseadas nos filmes da biblioteca pessoal do usuário.
    Usa os gêneros dos filmes na biblioteca para encontrar filmes similares.
    """
    logger.info(f"Obtendo recomendações de filmes para o usuário: {user_id}")
    
    library_entries = session.exec(select(UserMovieLibrary).where(UserMovieLibrary.user_id == user_id)).all()
    
    if not library_entries:
        logger.info(f"Usuário {user_id} não tem filmes na biblioteca")
        return []
    
    library_movie_ids = [entry.movie_external_id for entry in library_entries]
    library_movies = []
    all_genres = set()
    
    for external_id in library_movie_ids:
        try:
            movie_data = buscar_detalhes_filme(external_id)
            if movie_data:
                movie_obj = omdb_title_to_movie(movie_data)
                if movie_obj:
                    library_movies.append(movie_obj)
                genres_str = movie_data.get("Genre") or movie_data.get("genre", "")
                if genres_str:
                    genres_list = [g.strip() for g in genres_str.split(",") if g.strip()]
                    all_genres.update(genres_list)
        except Exception as e:
            logger.exception(f"Erro ao buscar filme {external_id} para recomendações: {e}")
    
    if not all_genres:
        logger.info(f"Nenhum gênero encontrado na biblioteca de filmes do usuário {user_id}")
        return []
    
    recommended_movies = []
    seen_movie_ids = set(library_movie_ids)
    
    for genre in list(all_genres)[:3]:
        try:
            resultados_busca = buscar_dados_filme(genre, limite=20)
            if resultados_busca and "results" in resultados_busca:
                for movie_item in resultados_busca["results"][:15]:
                    movie_id = movie_item.get("imdbID")
                    if movie_id and movie_id not in seen_movie_ids:
                        movie_genres_str = movie_item.get("Genre", "")
                        if movie_genres_str and genre.lower() in movie_genres_str.lower():
                            seen_movie_ids.add(movie_id)
                            movie_obj = omdb_title_to_movie(movie_item)
                            if movie_obj:
                                recommended_movies.append(movie_obj)
                            
                            if len(recommended_movies) >= 30:
                                break
        except Exception as e:
            logger.exception(f"Erro ao buscar filmes por gênero {genre}: {e}")
        
        if len(recommended_movies) >= 30:
            break
    
    if len(recommended_movies) < 20:
        try:
            popular_terms = ["action", "drama", "comedy", "thriller"]
            for term in popular_terms[:2]:
                resultados_busca = buscar_dados_filme(term, limite=15)
                if resultados_busca and "results" in resultados_busca:
                    for movie_item in resultados_busca["results"]:
                        movie_id = movie_item.get("imdbID")
                        if movie_id and movie_id not in seen_movie_ids:
                            seen_movie_ids.add(movie_id)
                            movie_obj = omdb_title_to_movie(movie_item)
                            if movie_obj:
                                recommended_movies.append(movie_obj)
                            
                            if len(recommended_movies) >= 30:
                                break
                if len(recommended_movies) >= 30:
                    break
        except Exception as e:
            logger.exception(f"Erro ao buscar filmes populares: {e}")
    
    return recommended_movies[:30]

