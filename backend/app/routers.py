from fastapi import APIRouter, HTTPException, Depends, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from typing import List, Optional, Dict, Any
from datetime import timedelta
import logging
from urllib.parse import quote_plus

from models import User, Book as DBBook, Movie, Rating, Recommendation, UserLibrary
from sqlmodel import Session, select

from api_clients import fetch_book_data, fetch_movie_data, fetch_movie_details
from schemas import Book, Movie, BookRead
from database import get_session
from schemas import (
    UserCreate, UserRead, UserUpdate,
    BookCreate, BookRead, BookUpdate,
    MovieCreate, MovieRead, MovieUpdate,
    RatingCreate, RatingRead, RatingUpdate,
    RecommendationRead, UserLogin, Token
)
from auth import (
    authenticate_user, create_access_token, 
    get_current_active_user, get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_IMDB_SORT = {
    "SORT_BY_POPULARITY",
    "SORT_BY_RELEASE_DATE",
    "SORT_BY_USER_RATING",
    "SORT_BY_USER_RATING_COUNT",
    "SORT_BY_YEAR",
}

VALID_SORT_ORDER = {"ASC", "DESC"}


def _precision_date_to_str(data: Optional[Dict[str, Any]]) -> Optional[str]:
    if not isinstance(data, dict):
        return None
    year = data.get("year")
    month = data.get("month")
    day = data.get("day")
    if year and month and day:
        return f"{year:04d}-{month:02d}-{day:02d}"
    if year and month:
        return f"{year:04d}-{month:02d}"
    if year:
        return str(year)
    return None


def _imdb_title_to_movie(item: Dict[str, Any]) -> Movie:
    primary_image = item.get("primaryImage") or {}
    rating = item.get("rating") or {}
    release_date = _precision_date_to_str(item.get("releaseDate")) or _precision_date_to_str(
        item.get("releaseYear")
    )
    if not release_date and item.get("startYear"):
        release_date = str(item["startYear"])

    return Movie(
        id=str(item.get("id")),
        title=item.get("primaryTitle") or item.get("originalTitle") or "N/A",
        overview=item.get("plot"),
        poster_path=primary_image.get("url"),
        release_date=release_date,
        rating=rating.get("aggregateRating"),
        vote_count=rating.get("voteCount"),
    )

from google_books import search_books as google_search_books, get_book_by_id

@router.get("/books/search", response_model=List[BookRead], tags=["books"])
async def search_books(query: str, session: Session = Depends(get_session)):
    logger.info(f"Searching for books with query: {query}")
    books = google_search_books(query)
    # Convert the books to BookRead schema
    book_list = []
    for book in books:
        volume_info = book.get("volumeInfo", {})
        # Extrair gêneros do campo categories da API do Google Books
        categories = volume_info.get("categories", [])
        genres = categories if isinstance(categories, list) else []
        book_data = BookRead(
            id=book.get("id", "N/A"),
            title=volume_info.get("title", "N/A"),
            authors=volume_info.get("authors", ["N/A"]),
            description=volume_info.get("description", "N/A"),
            image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
            genres=genres if genres else None,
        )
        book_list.append(book_data)
    return book_list

@router.get("/books/{book_id}", response_model=BookRead, tags=["books"])
async def get_book(book_id: str, session: Session = Depends(get_session)):
    logger.info(f"Getting book with book_id: {book_id}")
    book = get_book_by_id(book_id)
    if book:
        volume_info = book.get("volumeInfo", {})
        # Extrair gêneros do campo categories da API do Google Books
        categories = volume_info.get("categories", [])
        genres = categories if isinstance(categories, list) else []
        book_data = BookRead(
            id=book.get("id", "N/A"),
            title=volume_info.get("title", "N/A"),
            authors=volume_info.get("authors", ["N/A"]),
            description=volume_info.get("description", "N/A"),
            image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
            genres=genres if genres else None,
        )
        return book_data
    else:
        raise HTTPException(status_code=404, detail="Book not found")

@router.get("/movies/search", response_model=List[Movie], tags=["movies"])
async def search_movies(
    query: str,
    limit: int = 10,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    genre: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    session: Session = Depends(get_session),
):
    logger.info("IMDb search_movies called with query=%s", query)

    normalized_sort_by = sort_by if sort_by in VALID_IMDB_SORT else None
    normalized_sort_order = sort_order.upper() if sort_order and sort_order.upper() in VALID_SORT_ORDER else None

    movie_data = fetch_movie_data(
        query,
        limit=limit,
        start_year=start_year,
        end_year=end_year,
        genres=[genre] if genre else None,
        sort_by=normalized_sort_by,
        sort_order=normalized_sort_order,
    )
    if not movie_data or "results" not in movie_data:
        raise HTTPException(status_code=404, detail="No movies found")

    return [_imdb_title_to_movie(item) for item in movie_data["results"]]

@router.get("/movies/{external_id}", response_model=Movie, tags=["movies"])
async def get_movie(external_id: str, session: Session = Depends(get_session)):
    logger.info(f"get_movie called with external_id: {external_id}")
    movie_data = fetch_movie_details(external_id)
    if not movie_data:
        raise HTTPException(status_code=404, detail="Movie not found")

    return _imdb_title_to_movie(movie_data)

@router.post("/users/", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["users"])
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    logger.info(f"Creating user with username: {user.username}")
    logger.info(f"User creation attempt: {user.username}, {user.email}")
    # Verifica se username já existe
    db_user = session.exec(select(User).where(User.username == user.username)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username já existe")
    # Verifica se email já existe
    db_email = session.exec(select(User).where(User.email == user.email)).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email já existe")
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password)
    )
    logger.info(f"Adding user to session: {user.username}")
    session.add(db_user)
    try:
        logger.info(f"Committing user to database: {user.username}")
        session.commit()
    except Exception as exc:
        # Em caso de violação de integridade ou outros erros, retorna 400 genérico
        session.rollback()
        logger.exception(f"Error creating user: {user.username}", exc_info=True)
        raise HTTPException(status_code=400, detail="Não foi possível criar a conta. Verifique os dados e tente novamente.") from exc
    logger.info(f"Refreshing user: {user.username}")
    session.refresh(db_user)
    logger.info(f"User created successfully: {user.username}")
    return db_user

@router.post("/token", response_model=Token, tags=["auth"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    logger.info(f"Login attempt for user: {form_data.username}")
    """Endpoint de login que retorna token JWT"""
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token, tags=["auth"])
async def login(user_login: UserLogin, session: Session = Depends(get_session)):
    logger.info(f"Login attempt for user: {user_login.username} (JSON)")
    """Endpoint de login alternativo usando JSON"""
    user = authenticate_user(session, user_login.username, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me/", response_model=UserRead, tags=["users"])
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    logger.info(f"Reading current user: {current_user.username}")
    """Obtém informações do usuário atual"""
    return current_user

@router.put("/users/{user_id}", response_model=UserRead, tags=["users"])
def update_user(
    user_id: int, 
    user_update: UserUpdate, 
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    logger.info(f"Updating user with id: {user_id}")
    
    # Verificar se o usuário está tentando atualizar seu próprio perfil
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para atualizar este perfil")
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar senha atual se houver alterações
    if user_update.username is not None or user_update.email is not None or user_update.password is not None:
        if not user_update.current_password:
            raise HTTPException(status_code=400, detail="Senha atual é obrigatória para fazer alterações")
        
        # Verificar se a senha atual está correta
        from auth import verify_password
        if not verify_password(user_update.current_password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Senha atual incorreta")
    
    # Atualizar campos
    if user_update.username is not None:
        # Verificar se o novo username já existe
        existing_user = session.exec(select(User).where(User.username == user_update.username)).first()
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=400, detail="Username já está em uso")
        user.username = user_update.username
    
    if user_update.email is not None:
        # Verificar se o novo email já existe
        existing_user = session.exec(select(User).where(User.email == user_update.email)).first()
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=400, detail="Email já está em uso")
        user.email = user_update.email
    
    if user_update.password is not None:
        user.hashed_password = get_password_hash(user_update.password)
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.post("/ratings/", response_model=RatingRead, status_code=status.HTTP_201_CREATED, tags=["ratings"])
async def create_rating(
    rating: RatingCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    logger.info(f"Creating rating for user: {current_user.username}")
    if not rating.book_id and not rating.movie_id and not getattr(rating, "book_external_id", None):
        raise HTTPException(status_code=400, detail="Uma avaliação deve estar associada a um livro (id interno ou externo) ou filme.")
    
    # Resolver book_external_id para um registro local se necessário
    resolved_book_id = rating.book_id
    if not resolved_book_id and getattr(rating, "book_external_id", None):
        external_id = rating.book_external_id
        # verificar se já existe
        db_book = session.exec(select(DBBook).where(DBBook.external_id == external_id)).first()
        if not db_book:
            # buscar detalhes do livro externo e criar registro mínimo
            book = None
            try:
                book = await get_book(external_id, session)
            except Exception:
                logger.exception("Falha ao buscar detalhes do livro externo %s", external_id)
            title = None
            authors = None
            image_url = None
            genres = None
            if book:
                title = book.title
                # book.authors pode ser lista
                if isinstance(book.authors, list) and book.authors:
                    authors = ", ".join(book.authors)
                elif isinstance(book.authors, str):
                    authors = book.authors
                image_url = getattr(book, "image_url", None)
                genres = getattr(book, "genres", None)
            db_book = DBBook(
                title=title or "Sem título",
                author=authors,
                cover_url=image_url,
                external_id=external_id,
                genres=genres
            )
            session.add(db_book)
            session.commit()
            session.refresh(db_book)
        resolved_book_id = db_book.id

    # Usar o ID do usuário autenticado e ids resolvidos
    rating_data = {
        "user_id": current_user.id,
        "book_id": resolved_book_id,
        "movie_id": rating.movie_id,
        "score": rating.score,
        "comment": rating.comment,
    }
    
    db_rating = Rating(**rating_data)
    session.add(db_rating)
    session.commit()
    session.refresh(db_rating)
    return db_rating


@router.put("/ratings/{rating_id}", response_model=RatingRead, tags=["ratings"])
async def update_rating(
    rating_id: int,
    rating_update: RatingUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    logger.info(f"Updating rating {rating_id} for user: {current_user.username}")
    db_rating = session.get(Rating, rating_id)
    if not db_rating:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
    if db_rating.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para editar esta avaliação.")

    if rating_update.score is not None:
        db_rating.score = rating_update.score
    if rating_update.comment is not None:
        db_rating.comment = rating_update.comment or None

    session.add(db_rating)
    session.commit()
    session.refresh(db_rating)
    return db_rating


@router.delete("/ratings/{rating_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["ratings"])
async def delete_rating(
    rating_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    logger.info(f"Deleting rating {rating_id} for user: {current_user.username}")
    db_rating = session.get(Rating, rating_id)
    if not db_rating:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
    if db_rating.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para excluir esta avaliação.")

    session.delete(db_rating)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/users/{user_id}/ratings", response_model=List[Dict[str, Any]], tags=["ratings"])
async def get_user_ratings(user_id: int, session: Session = Depends(get_session)):
    logger.info(f"Getting ratings for user: {user_id}")
    ratings = session.exec(select(Rating).where(Rating.user_id == user_id)).all()
    ratings_with_external_id = []
    for rating in ratings:
        rating_dict = {
            "id": rating.id,
            "user_id": rating.user_id,
            "book_id": rating.book_id,
            "movie_id": rating.movie_id,
            "score": rating.score,
            "comment": rating.comment,
            "created_at": rating.created_at,
            "book_external_id": None
        }
        if rating.book_id:
            db_book = session.get(DBBook, rating.book_id)
            if db_book and db_book.external_id:
                rating_dict["book_external_id"] = db_book.external_id
        ratings_with_external_id.append(rating_dict)
    return ratings_with_external_id

@router.get("/books", response_model=List[Book])
async def search_books(query: str):
    logger.info(f"Searching for books with query: {query} (external API)")
    """Searches for books using the Google Books API."""
    book_data = fetch_book_data(query)
    if not book_data or "items" not in book_data:
        raise HTTPException(status_code=404, detail="No books found")

    books = []
    for item in book_data["items"]:
        volume_info = item["volumeInfo"]
        book = Book(
            id=item["id"],
            title=volume_info.get("title", "N/A"),
            authors=volume_info.get("authors", ["N/A"]),
            description=volume_info.get("description", "N/A"),
            image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
        )
        books.append(book)
    return books


@router.get("/movies", response_model=List[Movie])
async def search_movies_public(
    query: str,
    limit: int = 10,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    genre: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
):
    """Public movie search using IMDb API (no authentication required)."""
    normalized_sort_by = sort_by if sort_by in VALID_IMDB_SORT else None
    normalized_sort_order = sort_order.upper() if sort_order and sort_order.upper() in VALID_SORT_ORDER else None

    movie_data = fetch_movie_data(
        query,
        limit=limit,
        start_year=start_year,
        end_year=end_year,
        genres=[genre] if genre else None,
        sort_by=normalized_sort_by,
        sort_order=normalized_sort_order,
    )
    if not movie_data or "results" not in movie_data:
        raise HTTPException(status_code=404, detail="No movies found")

    return [_imdb_title_to_movie(item) for item in movie_data["results"]]

@router.get("/users/{user_id}/library", response_model=List[BookRead], tags=["library"])
async def get_user_library(user_id: int, session: Session = Depends(get_session)):
    logger.info(f"Getting library for user: {user_id}")
    entries = session.exec(select(UserLibrary).where(UserLibrary.user_id == user_id)).all()
    books: List[BookRead] = []
    for entry in entries:
        try:
            book = await get_book(entry.book_external_id, session)
            if book:
                books.append(book)
        except Exception:
            logger.exception("Failed to fetch book details for %s", entry.book_external_id)
    return books

@router.get("/users/{user_id}/reviews", response_model=List[RatingRead], tags=["reviews"])
async def get_user_reviews(user_id: int, session: Session = Depends(get_session)):
    logger.info(f"Getting reviews for user: {user_id}")
    # Fetch ratings for the user
    reviews = session.exec(select(Rating).where(Rating.user_id == user_id)).all()
    return reviews

@router.post("/library/add", tags=["library"])
async def add_book_to_library(book_id: Dict[str, str], current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Adding book {book_id} to library for user {current_user.username}")
    book_id_str = book_id.get("book_id")
    # Check if the book exists
    book = await get_book(book_id_str, session)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Check if already in library
    existing = session.exec(
        select(UserLibrary).where(
            (UserLibrary.user_id == current_user.id) & (UserLibrary.book_external_id == book_id_str)
        )
    ).first()
    if existing:
        return {"message": "Book already in library"}
    entry = UserLibrary(user_id=current_user.id, book_external_id=book_id_str)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return {"message": "Book added to library", "book_id": book_id_str}

@router.delete("/library/remove", tags=["library"])
async def remove_book_from_library(book_id: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Removing book {book_id} from library for user {current_user.username}")
    
    # Find the library entry
    library_entry = session.exec(
        select(UserLibrary).where(
            (UserLibrary.user_id == current_user.id) & (UserLibrary.book_external_id == book_id)
        )
    ).first()
    
    if not library_entry:
        raise HTTPException(status_code=404, detail="Book not found in library")
    
    session.delete(library_entry)
    session.commit()
    return {"message": "Book removed from library", "book_id": book_id}

@router.put("/books/{book_id}/update-genres", tags=["books"])
async def update_book_genres(book_id: int, session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de um livro existente no banco de dados buscando da API do Google Books.
    """
    logger.info(f"Updating genres for book with id: {book_id}")
    db_book = session.get(DBBook, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
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
        logger.exception("Error updating book genres")
        raise HTTPException(status_code=500, detail=f"Error updating genres: {str(e)}")

@router.post("/books/update-all-genres", tags=["books"])
async def update_all_books_genres(session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de todos os livros no banco de dados que têm external_id mas não têm gêneros.
    """
    logger.info("Updating genres for all books")
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
            logger.exception(f"Error updating genres for book {db_book.id}: {e}")
            failed_count += 1
    
    session.commit()
    return {
        "message": "Genres update completed",
        "updated": updated_count,
        "failed": failed_count,
        "total": len(books_to_update)
    }

@router.get("/users/{user_id}/recommendations/books", response_model=List[BookRead], tags=["recommendations"])
async def get_book_recommendations(user_id: int, session: Session = Depends(get_session)):
    """
    Busca recomendações de livros baseadas nos livros da biblioteca pessoal do usuário.
    Usa os gêneros e autores dos livros na biblioteca para encontrar livros similares.
    """
    logger.info(f"Getting book recommendations for user: {user_id}")
    
    # Buscar livros da biblioteca do usuário
    library_entries = session.exec(select(UserLibrary).where(UserLibrary.user_id == user_id)).all()
    
    if not library_entries:
        logger.info(f"User {user_id} has no books in library")
        return []
    
    # Coletar external_ids e buscar detalhes dos livros
    library_book_ids = [entry.book_external_id for entry in library_entries]
    library_books = []
    all_genres = set()
    all_authors = set()
    
    for external_id in library_book_ids:
        try:
            book_data = await get_book(external_id, session)
            if book_data:
                library_books.append(book_data)
                # Coletar gêneros
                if book_data.genres:
                    all_genres.update(book_data.genres)
                # Coletar autores
                if book_data.authors:
                    if isinstance(book_data.authors, list):
                        all_authors.update(book_data.authors)
                    else:
                        all_authors.add(book_data.authors)
        except Exception as e:
            logger.exception(f"Error fetching book {external_id} for recommendations: {e}")
    
    if not all_genres and not all_authors:
        logger.info(f"No genres or authors found in user {user_id} library")
        return []
    
    # Buscar livros similares baseado nos gêneros e autores
    recommended_books = []
    seen_book_ids = set(library_book_ids)  # Para evitar recomendar livros já na biblioteca
    
    # Buscar por gêneros
    for genre in list(all_genres)[:3]:  # Limitar a 3 gêneros para não fazer muitas requisições
        try:
            # Buscar livros do mesmo gênero
            # Codificar apenas o valor do gênero, mantendo o prefixo "subject:"
            encoded_genre = quote_plus(genre)
            search_query = f"subject:{encoded_genre}"
            books = google_search_books(search_query)
            
            for book in books[:10]:  # Limitar a 10 livros por gênero
                book_id = book.get("id")
                if book_id and book_id not in seen_book_ids:
                    seen_book_ids.add(book_id)
                    volume_info = book.get("volumeInfo", {})
                    categories = volume_info.get("categories", [])
                    genres = categories if isinstance(categories, list) else []
                    
                    book_read = BookRead(
                        id=book_id,
                        title=volume_info.get("title", "N/A"),
                        authors=volume_info.get("authors", ["N/A"]),
                        description=volume_info.get("description", "N/A"),
                        image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
                        genres=genres if genres else None,
                    )
                    recommended_books.append(book_read)
        except Exception as e:
            logger.exception(f"Error searching books by genre {genre}: {e}")
    
    # Buscar por autores (se ainda não tivermos muitas recomendações)
    if len(recommended_books) < 20:
        for author in list(all_authors)[:2]:  # Limitar a 2 autores
            try:
                # Codificar apenas o valor do autor, mantendo o prefixo "inauthor:"
                encoded_author = quote_plus(author)
                search_query = f"inauthor:{encoded_author}"
                books = google_search_books(search_query)
                
                for book in books[:10]:  # Limitar a 10 livros por autor
                    book_id = book.get("id")
                    if book_id and book_id not in seen_book_ids:
                        seen_book_ids.add(book_id)
                        volume_info = book.get("volumeInfo", {})
                        categories = volume_info.get("categories", [])
                        genres = categories if isinstance(categories, list) else []
                        
                        book_read = BookRead(
                            id=book_id,
                            title=volume_info.get("title", "N/A"),
                            authors=volume_info.get("authors", ["N/A"]),
                            description=volume_info.get("description", "N/A"),
                            image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
                            genres=genres if genres else None,
                        )
                        recommended_books.append(book_read)
                        
                        if len(recommended_books) >= 30:  # Limitar total de recomendações
                            break
            except Exception as e:
                logger.exception(f"Error searching books by author {author}: {e}")
            
            if len(recommended_books) >= 30:
                break
    
    # Limitar e retornar recomendações
    return recommended_books[:30]