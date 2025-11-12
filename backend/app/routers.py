from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import List, Optional, Dict, Any
from datetime import timedelta
import logging

from models import User, Book as DBBook, Movie, Rating, Recommendation, UserLibrary
from sqlmodel import Session, select

from api_clients import fetch_book_data, fetch_movie_data
from schemas import Book, Movie, BookRead
from database import get_session
from schemas import (
    UserCreate, UserRead, UserUpdate,
    BookCreate, BookRead, BookUpdate,
    MovieCreate, MovieRead, MovieUpdate,
    RatingCreate, RatingRead,
    RecommendationRead, UserLogin, Token
)
from auth import (
    authenticate_user, create_access_token, 
    get_current_active_user, get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

logger = logging.getLogger(__name__)

router = APIRouter()

from google_books import search_books as google_search_books, get_book_by_id

@router.get("/books/search", response_model=List[BookRead], tags=["books"])
async def search_books(query: str, session: Session = Depends(get_session)):
    logger.info(f"Searching for books with query: {query}")
    books = google_search_books(query)
    # Convert the books to BookRead schema
    book_list = []
    for book in books:
        volume_info = book.get("volumeInfo", {})
        book_data = BookRead(
            id=book.get("id", "N/A"),
            title=volume_info.get("title", "N/A"),
            authors=volume_info.get("authors", ["N/A"]),
            description=volume_info.get("description", "N/A"),
            image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
        )
        book_list.append(book_data)
    return book_list

@router.get("/books/{book_id}", response_model=BookRead, tags=["books"])
async def get_book(book_id: str, session: Session = Depends(get_session)):
    logger.info(f"Getting book with book_id: {book_id}")
    book = get_book_by_id(book_id)
    if book:
        volume_info = book.get("volumeInfo", {})
        book_data = BookRead(
            id=book.get("id", "N/A"),
            title=volume_info.get("title", "N/A"),
            authors=volume_info.get("authors", ["N/A"]),
            description=volume_info.get("description", "N/A"),
            image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
        )
        return book_data
    else:
        raise HTTPException(status_code=404, detail="Book not found")

@router.get("/movies/search", response_model=List[MovieRead], tags=["movies"])
async def search_movies(query: str, session: Session = Depends(get_session)):
    logger.info(f"Searching for movies with query: {query}")
    # Implement search logic using TMDB API
    pass

@router.get("/movies/{external_id}", response_model=MovieRead, tags=["movies"])
async def get_movie(external_id: str, session: Session = Depends(get_session)):
    logger.info(f"Getting movie with external_id: {external_id}")
    # Implement logic to fetch movie details using TMDB API
    pass

@router.post("/users/", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["users"])
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    logger.info(f"Creating user with username: {user.username}")
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
    session.add(db_user)
    try:
        session.commit()
    except Exception as exc:
        # Em caso de violação de integridade ou outros erros, retorna 400 genérico
        session.rollback()
        logger.exception("Erro ao criar usuário")
        raise HTTPException(status_code=400, detail="Não foi possível criar a conta. Verifique os dados e tente novamente.") from exc
    session.refresh(db_user)
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
def update_user(user_id: int, user_update: UserUpdate, session: Session = Depends(get_session)):
    logger.info(f"Updating user with id: {user_id}")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user_update.username is not None:
        user.username = user_update.username
    if user_update.email is not None:
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
            if book:
                title = book.title
                # book.authors pode ser lista
                if isinstance(book.authors, list) and book.authors:
                    authors = ", ".join(book.authors)
                elif isinstance(book.authors, str):
                    authors = book.authors
                image_url = getattr(book, "image_url", None)
            db_book = DBBook(
                title=title or "Sem título",
                author=authors,
                cover_url=image_url,
                external_id=external_id
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

@router.get("/users/{user_id}/ratings", response_model=List[RatingRead], tags=["ratings"])
async def get_user_ratings(user_id: int, session: Session = Depends(get_session)):
    logger.info(f"Getting ratings for user: {user_id}")
    ratings = session.exec(select(Rating).where(Rating.user_id == user_id)).all()
    return ratings

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
async def search_movies(query: str):
    logger.info(f"Searching for movies with query: {query} (external API)")
    """Searches for movies using the TMDB API."""
    movie_data = fetch_movie_data(query)
    if not movie_data or "results" not in movie_data:
        raise HTTPException(status_code=404, detail="No movies found")

    movies = []
    for item in movie_data["results"]:
        movie = Movie(
            id=item["id"],
            title=item["title"],
            overview=item.get("overview", "N/A"),
            poster_path=item.get("poster_path", None),
            release_date=item.get("release_date", "N/A"),
        )
        movies.append(movie)
    return movies

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