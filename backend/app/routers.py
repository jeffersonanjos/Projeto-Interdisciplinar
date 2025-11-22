from fastapi import APIRouter, HTTPException, Depends, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from typing import List, Optional, Dict, Any
from datetime import timedelta
import logging
from urllib.parse import quote_plus

from models import User, Book as DBBook, Movie as DBMovie, Rating, Recommendation, UserLibrary, UserMovieLibrary, Follow
from sqlmodel import Session, select
from sqlalchemy import func

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

VALID_OMDB_SORT = {
    "SORT_BY_POPULARITY",
    "SORT_BY_RELEASE_DATE",
    "SORT_BY_USER_RATING",
    "SORT_BY_USER_RATING_COUNT",
    "SORT_BY_YEAR",
}

VALID_SORT_ORDER = {"ASC", "DESC"}


def _parse_omdb_rating(rating_str: Optional[str]) -> Optional[float]:
    """Converts OMDb rating string (e.g., '8.7') to float."""
    if not rating_str:
        return None
    try:
        return float(rating_str)
    except (ValueError, TypeError):
        return None


def _parse_omdb_votes(votes_str: Optional[str]) -> Optional[int]:
    """Converts OMDb votes string (e.g., '1,900,000') to int."""
    if not votes_str:
        return None
    try:
        # Remove commas and convert to int
        return int(votes_str.replace(",", ""))
    except (ValueError, TypeError):
        return None


def _omdb_title_to_movie(item: Dict[str, Any]) -> Optional[Movie]:
    """Converts OMDb API response to Movie schema."""
    from api_clients import fetch_movie_poster_from_tmdb
    
    # Validar que é realmente um filme (não um livro ou outro tipo)
    item_type = item.get("Type", "").lower()
    if item_type and item_type not in ["movie", "series"]:
        # Se tiver Type definido e não for movie ou series, pular
        return None
    
    imdb_id = item.get("imdbID") or item.get("imdbid") or ""
    
    # Validação adicional: garantir que tem imdbID (característica de filme)
    if not imdb_id:
        # Sem IMDb ID, pode ser que não seja um filme válido
        # Mas vamos permitir se tiver outras características de filme
        if not item.get("Title") and not item.get("Year"):
            return None
    
    title = item.get("Title") or "N/A"
    plot = item.get("Plot") or item.get("plot") or ""
    # Filtrar "N/A" do plot
    if plot == "N/A" or not plot:
        plot = None
    poster = item.get("Poster") or item.get("poster")
    year = item.get("Year") or item.get("year")
    rating_str = item.get("imdbRating")
    votes_str = item.get("imdbVotes")
    genre_str = item.get("Genre") or item.get("genre") or ""
    
    # Extrair gêneros da string separada por vírgulas
    genres = []
    if genre_str and genre_str != "N/A":
        genres = [g.strip() for g in genre_str.split(",") if g.strip()]
    
    # Estratégia de fallback para pôsteres:
    # 1. Tentar URL original do OMDb (pode ser Amazon, pode estar quebrada)
    # 2. Se não tiver URL original ou for inválida, tentar TMDb (mais confiável)
    # 3. Se tudo falhar, deixar None (frontend usará placeholder)
    poster_path = None
    
    # Verificar se a URL original é válida (não é "N/A" e não é vazia)
    if poster and poster != "N/A" and poster.strip() and not poster.startswith("http://ia.media-imdb.com"):
        # URLs do Amazon frequentemente estão quebradas, mas vamos tentar
        # Se começar com http://ia.media-imdb.com, é provável que esteja quebrada
        poster_path = poster
    
    # Se não temos URL válida e temos IMDb ID, tentar TMDb
    if not poster_path and imdb_id:
        tmdb_poster = fetch_movie_poster_from_tmdb(imdb_id)
        if tmdb_poster:
            poster_path = tmdb_poster
    
    # Parse rating and votes
    rating = _parse_omdb_rating(rating_str)
    vote_count = _parse_omdb_votes(votes_str)
    
    # Extrair diretor
    director_str = item.get("Director") or item.get("director") or ""
    director = director_str if director_str and director_str != "N/A" else None
    
    # Extrair atores (cast)
    actors_str = item.get("Actors") or item.get("actors") or ""
    cast = []
    if actors_str and actors_str != "N/A":
        cast = [a.strip() for a in actors_str.split(",") if a.strip()]
    
    return Movie(
        id=str(imdb_id),
        title=title,
        overview=plot,
        poster_path=poster_path if poster_path and poster_path != "N/A" else None,
        release_date=year,
        rating=rating,
        vote_count=vote_count,
        genres=genres if genres else None,
        director=director,
        cast=cast if cast else None,
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
        # Extrair ano de publicação
        published_date = volume_info.get("publishedDate", "")
        # Se for uma data completa, extrair apenas o ano
        if published_date:
            import re
            year_match = re.search(r'(\d{4})', published_date) if isinstance(published_date, str) else None
            published_date = year_match.group(1) if year_match else published_date
        
        book_data = BookRead(
            id=book.get("id", "N/A"),
            title=volume_info.get("title", "N/A"),
            authors=volume_info.get("authors", ["N/A"]),
            description=volume_info.get("description", "N/A"),
            image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
            genres=genres if genres else None,
            published_date=published_date if published_date else None,
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
        # Extrair ano de publicação
        published_date = volume_info.get("publishedDate", "")
        # Se for uma data completa, extrair apenas o ano
        if published_date:
            import re
            year_match = re.search(r'(\d{4})', published_date) if isinstance(published_date, str) else None
            published_date = year_match.group(1) if year_match else published_date
        
        book_data = BookRead(
            id=book.get("id", "N/A"),
            title=volume_info.get("title", "N/A"),
            authors=volume_info.get("authors", ["N/A"]),
            description=volume_info.get("description", "N/A"),
            image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
            genres=genres if genres else None,
            published_date=published_date if published_date else None,
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
    logger.info("OMDb search_movies called with query=%s", query)

    normalized_sort_by = sort_by if sort_by in VALID_OMDB_SORT else None
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

    # Buscar detalhes completos de cada filme para obter gêneros
    # A busca inicial do OMDb (s=query) não retorna gêneros, apenas busca detalhada (i=imdbID)
    import asyncio
    import concurrent.futures
    
    results = movie_data["results"]
    
    async def fetch_movie_with_details(item: Dict[str, Any]) -> Movie:
        """Busca detalhes completos do filme se tiver IMDb ID"""
        imdb_id = item.get("imdbID") or item.get("imdbid")
        
        if not imdb_id:
            # Sem IMDb ID, retornar resultado da busca inicial
            return _omdb_title_to_movie(item)
        
        # Buscar detalhes completos em thread pool para não bloquear
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            try:
                details = await loop.run_in_executor(
                    executor, 
                    fetch_movie_details, 
                    imdb_id
                )
                # Se encontrou detalhes válidos, usar eles (têm gêneros)
                if details and details.get("Response") == "True":
                    return _omdb_title_to_movie(details)
            except Exception as e:
                logger.warning(f"Error fetching details for {imdb_id}: {e}")
        
        # Se falhou, usar resultado da busca inicial (sem gêneros)
        return _omdb_title_to_movie(item)
    
    # Buscar todos os detalhes em paralelo e filtrar None (itens inválidos)
    movies = await asyncio.gather(*[fetch_movie_with_details(item) for item in results])
    
    # Filtrar resultados None (itens que não são filmes válidos) e remover duplicatas
    seen_ids = set()
    valid_movies = []
    for m in movies:
        if m is not None and m.id:
            # Remover duplicatas baseadas no ID
            if m.id not in seen_ids:
                seen_ids.add(m.id)
                valid_movies.append(m)
    
    return valid_movies

@router.get("/movies/{external_id}", response_model=Movie, tags=["movies"])
async def get_movie(external_id: str, session: Session = Depends(get_session)):
    logger.info(f"get_movie called with external_id: {external_id}")
    movie_data = fetch_movie_details(external_id)
    if not movie_data:
        raise HTTPException(status_code=404, detail="Movie not found")

    return _omdb_title_to_movie(movie_data)

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
    has_changes = user_update.username is not None or user_update.email is not None or user_update.password is not None
    
    if has_changes:
        if not user_update.current_password or not user_update.current_password.strip():
            raise HTTPException(status_code=400, detail="Senha atual é obrigatória para fazer alterações")
        
        # Verificar se a senha atual está correta
        from auth import verify_password
        if not verify_password(user_update.current_password.strip(), user.hashed_password):
            raise HTTPException(status_code=401, detail="Senha atual incorreta")
    
    # Atualizar campos
    if user_update.username is not None:
        username = user_update.username.strip()
        if not username:
            raise HTTPException(status_code=400, detail="Nome de usuário não pode estar vazio")
        # Verificar se o novo username já existe
        existing_user = session.exec(select(User).where(User.username == username)).first()
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=400, detail="Username já está em uso")
        user.username = username
    
    if user_update.email is not None:
        email = user_update.email.strip()
        if not email:
            raise HTTPException(status_code=400, detail="Email não pode estar vazio")
        # Validar formato de email básico
        if '@' not in email or '.' not in email.split('@')[1]:
            raise HTTPException(status_code=400, detail="Email inválido")
        # Verificar se o novo email já existe
        existing_user = session.exec(select(User).where(User.email == email)).first()
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=400, detail="Email já está em uso")
        user.email = email
    
    if user_update.password is not None:
        password = user_update.password.strip()
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres")
        user.hashed_password = get_password_hash(password)
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.get("/users/search", response_model=List[UserRead], tags=["users"])
def search_users(
    query: str,
    limit: int = 10,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """Busca usuários por username (parcial match)"""
    logger.info(f"Searching users with query: {query}")
    if not query or not query.strip():
        return []
    
    query_trimmed = query.strip()
    # Busca usuários cujo username contém a query (case-insensitive)
    # Usando func.lower para garantir compatibilidade
    users = session.exec(
        select(User)
        .where(func.lower(User.username).contains(query_trimmed.lower()))
        .limit(limit)
    ).all()
    
    return users

@router.post("/users/{user_id}/follow", tags=["users"])
def follow_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Seguir um usuário"""
    logger.info(f"User {current_user.id} following user {user_id}")
    
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Você não pode seguir a si mesmo")
    
    # Verificar se o usuário existe
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se já está seguindo
    existing_follow = session.exec(
        select(Follow)
        .where(Follow.follower_id == current_user.id)
        .where(Follow.following_id == user_id)
    ).first()
    
    if existing_follow:
        raise HTTPException(status_code=400, detail="Você já está seguindo este usuário")
    
    # Criar o follow
    follow = Follow(
        follower_id=current_user.id,
        following_id=user_id
    )
    session.add(follow)
    session.commit()
    session.refresh(follow)
    
    return {"message": "Usuário seguido com sucesso", "following": True}

@router.delete("/users/{user_id}/follow", tags=["users"])
def unfollow_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Parar de seguir um usuário"""
    logger.info(f"User {current_user.id} unfollowing user {user_id}")
    
    # Verificar se está seguindo
    follow = session.exec(
        select(Follow)
        .where(Follow.follower_id == current_user.id)
        .where(Follow.following_id == user_id)
    ).first()
    
    if not follow:
        raise HTTPException(status_code=404, detail="Você não está seguindo este usuário")
    
    session.delete(follow)
    session.commit()
    
    return {"message": "Deixou de seguir o usuário", "following": False}

@router.get("/users/{user_id}/follow", tags=["users"])
def check_follow_status(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Verificar se o usuário atual está seguindo outro usuário"""
    if current_user.id == user_id:
        return {"following": False, "can_follow": False}
    
    follow = session.exec(
        select(Follow)
        .where(Follow.follower_id == current_user.id)
        .where(Follow.following_id == user_id)
    ).first()
    
    return {"following": follow is not None, "can_follow": True}

@router.get("/users/{user_id}/followers", response_model=List[UserRead], tags=["users"])
def get_followers(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Buscar seguidores de um usuário"""
    logger.info(f"Getting followers for user {user_id}")
    
    # Verificar se o usuário existe
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar follows onde o usuário é seguido
    follows = session.exec(
        select(Follow)
        .where(Follow.following_id == user_id)
    ).all()
    
    # Buscar informações dos seguidores
    follower_ids = [f.follower_id for f in follows]
    if not follower_ids:
        return []
    
    followers = session.exec(
        select(User)
        .where(User.id.in_(follower_ids))
    ).all()
    
    return followers

@router.get("/users/{user_id}/following", response_model=List[UserRead], tags=["users"])
def get_following(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Buscar usuários que um usuário está seguindo"""
    logger.info(f"Getting following for user {user_id}")
    
    # Verificar se o usuário existe
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar follows onde o usuário é seguidor
    follows = session.exec(
        select(Follow)
        .where(Follow.follower_id == user_id)
    ).all()
    
    # Buscar informações dos seguidos
    following_ids = [f.following_id for f in follows]
    if not following_ids:
        return []
    
    following = session.exec(
        select(User)
        .where(User.id.in_(following_ids))
    ).all()
    
    return following

@router.get("/users/{user_id}/activities", response_model=List[Dict[str, Any]], tags=["users"])
def get_user_activities(
    user_id: int,
    limit: int = 10,
    session: Session = Depends(get_session)
):
    """Buscar atividades recentes de um usuário (avaliações)"""
    logger.info(f"Getting activities for user {user_id}")
    
    # Verificar se o usuário existe
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar avaliações recentes do usuário
    ratings = session.exec(
        select(Rating)
        .where(Rating.user_id == user_id)
        .order_by(Rating.created_at.desc())
        .limit(limit)
    ).all()
    
    activities = []
    for rating in ratings:
        activity = {
            "id": rating.id,
            "type": "rating",
            "action": "avaliou",
            "rating": rating.score,
            "comment": rating.comment,
            "created_at": rating.created_at.isoformat() if rating.created_at else None,
        }
        
        # Adicionar informações do livro ou filme
        if rating.book_id:
            book = session.get(DBBook, rating.book_id)
            if book:
                activity["highlight"] = book.title
                activity["book_id"] = book.id
        elif rating.movie_id:
            movie = session.get(DBMovie, rating.movie_id)
            if movie:
                activity["highlight"] = movie.title
                activity["movie_id"] = movie.id
        
        activities.append(activity)
    
    return activities

@router.get("/timeline", response_model=List[Dict[str, Any]], tags=["timeline"])
def get_community_timeline(
    limit: int = 20,
    only_following: bool = False,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Buscar timeline da comunidade (atividades de todos os usuários ou apenas dos seguidos)"""
    logger.info(f"Getting community timeline for user {current_user.id}, only_following={only_following}")
    
    # Se only_following=True, buscar apenas atividades dos usuários seguidos
    if only_following:
        # Buscar IDs dos usuários seguidos
        follows = session.exec(
            select(Follow)
            .where(Follow.follower_id == current_user.id)
        ).all()
        following_ids = [f.following_id for f in follows]
        
        if not following_ids:
            return []
        
        # Buscar avaliações dos usuários seguidos
        ratings = session.exec(
            select(Rating)
            .where(Rating.user_id.in_(following_ids))
            .order_by(Rating.created_at.desc())
            .limit(limit)
        ).all()
    else:
        # Buscar avaliações de todos os usuários (exceto o próprio)
        ratings = session.exec(
            select(Rating)
            .where(Rating.user_id != current_user.id)
            .order_by(Rating.created_at.desc())
            .limit(limit)
        ).all()
    
    timeline = []
    for rating in ratings:
        # Buscar informações do usuário
        rating_user = session.get(User, rating.user_id)
        if not rating_user:
            continue
        
        # Buscar perfil do usuário para avatar
        from models import UserProfile as DBUserProfile
        user_profile = session.exec(
            select(DBUserProfile)
            .where(DBUserProfile.user_id == rating.user_id)
        ).first()
        
        activity = {
            "id": rating.id,
            "user_id": rating.user_id,
            "username": rating_user.username,
            "avatar": user_profile.avatar_url if user_profile else None,
            "type": "rating",
            "action": "avaliou",
            "rating": rating.score,
            "comment": rating.comment,
            "created_at": rating.created_at.isoformat() if rating.created_at else None,
        }
        
        # Adicionar informações do livro ou filme
        if rating.book_id:
            book = session.get(DBBook, rating.book_id)
            if book:
                activity["highlight"] = book.title
                activity["book_id"] = book.id
        elif rating.movie_id:
            movie = session.get(DBMovie, rating.movie_id)
            if movie:
                activity["highlight"] = movie.title
                activity["movie_id"] = movie.id
        
        timeline.append(activity)
    
    return timeline

@router.post("/ratings/", response_model=RatingRead, status_code=status.HTTP_201_CREATED, tags=["ratings"])
async def create_rating(
    rating: RatingCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    logger.info(f"Creating rating for user: {current_user.username}")
    if not rating.book_id and not rating.movie_id and not getattr(rating, "book_external_id", None) and not getattr(rating, "movie_external_id", None):
        raise HTTPException(status_code=400, detail="Uma avaliação deve estar associada a um livro (id interno ou externo) ou filme (id interno ou externo).")
    
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

    # Resolver movie_external_id para um registro local se necessário
    resolved_movie_id = rating.movie_id
    if not resolved_movie_id and getattr(rating, "movie_external_id", None):
        external_id = rating.movie_external_id
        # verificar se já existe
        db_movie = session.exec(select(DBMovie).where(DBMovie.external_id == external_id)).first()
        if not db_movie:
            # buscar detalhes do filme externo e criar registro mínimo
            movie_data = fetch_movie_details(external_id)
            if movie_data:
                movie_obj = _omdb_title_to_movie(movie_data)
                # Converter release_date de string para date se necessário
                release_date = None
                if movie_obj.release_date:
                    try:
                        # Tentar parsear como YYYY-MM-DD ou YYYY
                        if len(movie_obj.release_date) == 4:
                            from datetime import date
                            release_date = date(int(movie_obj.release_date), 1, 1)
                        elif '-' in movie_obj.release_date:
                            from datetime import datetime
                            release_date = datetime.strptime(movie_obj.release_date, '%Y-%m-%d').date()
                    except (ValueError, TypeError):
                        pass
                
                # Extrair gêneros do objeto movie_obj
                genres = getattr(movie_obj, "genres", None)
                
                db_movie = DBMovie(
                    title=movie_obj.title,
                    description=movie_obj.overview,
                    cover_url=movie_obj.poster_path,
                    external_id=external_id,
                    release_date=release_date,
                    genres=genres,
                )
                session.add(db_movie)
                session.commit()
                session.refresh(db_movie)
                resolved_movie_id = db_movie.id
        else:
            resolved_movie_id = db_movie.id

    # Usar o ID do usuário autenticado e ids resolvidos
    rating_data = {
        "user_id": current_user.id,
        "book_id": resolved_book_id,
        "movie_id": resolved_movie_id,
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
            "book_external_id": None,
            "movie_external_id": None,
        }
        if rating.book_id:
            db_book = session.get(DBBook, rating.book_id)
            if db_book and db_book.external_id:
                rating_dict["book_external_id"] = db_book.external_id
        if rating.movie_id:
            db_movie = session.get(DBMovie, rating.movie_id)
            if db_movie and db_movie.external_id:
                rating_dict["movie_external_id"] = db_movie.external_id
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
    """Public movie search using OMDb API (no authentication required)."""
    normalized_sort_by = sort_by if sort_by in VALID_OMDB_SORT else None
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

    # Buscar detalhes completos de cada filme para obter gêneros
    # A busca inicial do OMDb (s=query) não retorna gêneros, apenas busca detalhada (i=imdbID)
    import asyncio
    import concurrent.futures
    
    results = movie_data["results"]
    
    async def fetch_movie_with_details(item: Dict[str, Any]) -> Optional[Movie]:
        """Busca detalhes completos do filme se tiver IMDb ID"""
        imdb_id = item.get("imdbID") or item.get("imdbid")
        
        if not imdb_id:
            # Sem IMDb ID, retornar resultado da busca inicial
            return _omdb_title_to_movie(item)
        
        # Buscar detalhes completos em thread pool para não bloquear
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            try:
                details = await loop.run_in_executor(
                    executor, 
                    fetch_movie_details, 
                    imdb_id
                )
                # Se encontrou detalhes válidos, usar eles (têm gêneros)
                if details and details.get("Response") == "True":
                    return _omdb_title_to_movie(details)
            except Exception as e:
                logger.warning(f"Error fetching details for {imdb_id}: {e}")
        
        # Se falhou, usar resultado da busca inicial (sem gêneros)
        return _omdb_title_to_movie(item)
    
    # Buscar todos os detalhes em paralelo e filtrar None (itens inválidos)
    movies = await asyncio.gather(*[fetch_movie_with_details(item) for item in results])
    
    # Filtrar resultados None (itens que não são filmes válidos) e remover duplicatas
    seen_ids = set()
    valid_movies = []
    for m in movies:
        if m is not None and m.id:
            # Remover duplicatas baseadas no ID
            if m.id not in seen_ids:
                seen_ids.add(m.id)
                valid_movies.append(m)
    
    return valid_movies

@router.get("/users/{user_id}/library", response_model=List[BookRead], tags=["library"])
async def get_user_library(user_id: int, session: Session = Depends(get_session)):
    """Get user's book library (kept for backward compatibility)."""
    logger.info(f"Getting book library for user: {user_id}")
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

@router.get("/users/{user_id}/library/movies", response_model=List[Movie], tags=["library"])
async def get_user_movie_library(user_id: int, session: Session = Depends(get_session)):
    """Get user's movie library."""
    logger.info(f"Getting movie library for user: {user_id}")
    entries = session.exec(select(UserMovieLibrary).where(UserMovieLibrary.user_id == user_id)).all()
    movies: List[Movie] = []
    seen_ids = set()
    for entry in entries:
        try:
            movie_data = fetch_movie_details(entry.movie_external_id)
            if movie_data:
                movie = _omdb_title_to_movie(movie_data)
                # Filtrar None e remover duplicatas
                if movie is not None and movie.id and movie.id not in seen_ids:
                    seen_ids.add(movie.id)
                    movies.append(movie)
        except Exception:
            logger.exception("Failed to fetch movie details for %s", entry.movie_external_id)
    return movies

@router.get("/users/{user_id}/reviews", response_model=List[Dict[str, Any]], tags=["reviews"])
async def get_user_reviews(user_id: int, session: Session = Depends(get_session)):
    logger.info(f"Getting reviews for user: {user_id}")
    # Fetch ratings for the user
    ratings = session.exec(select(Rating).where(Rating.user_id == user_id)).all()
    # Enriquecer com external_ids e dados completos do livro/filme
    reviews_with_external = []
    for rating in ratings:
        review_dict = {
            "id": rating.id,
            "user_id": rating.user_id,
            "book_id": rating.book_id,
            "movie_id": rating.movie_id,
            "score": rating.score,
            "rating": rating.score,  # Adicionar alias para compatibilidade
            "comment": rating.comment,
            "created_at": rating.created_at,
            "book_external_id": None,
            "movie_external_id": None,
            "book": None,
            "movie": None,
        }
        if rating.book_id:
            db_book = session.get(DBBook, rating.book_id)
            if db_book:
                if db_book.external_id:
                    review_dict["book_external_id"] = db_book.external_id
                # Incluir dados completos do livro
                review_dict["book"] = {
                    "id": db_book.id,
                    "title": db_book.title,
                    "author": db_book.author,
                    "genres": db_book.genres or [],
                    "genre": ", ".join(db_book.genres) if db_book.genres else None,
                }
        if rating.movie_id:
            db_movie = session.get(DBMovie, rating.movie_id)
            if db_movie:
                if db_movie.external_id:
                    review_dict["movie_external_id"] = db_movie.external_id
                # Incluir dados completos do filme
                review_dict["movie"] = {
                    "id": db_movie.id,
                    "title": db_movie.title,
                    "director": db_movie.director,
                    "genres": db_movie.genres or [],
                    "genre": ", ".join(db_movie.genres) if db_movie.genres else None,
                }
        reviews_with_external.append(review_dict)
    return reviews_with_external

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

@router.post("/library/movies/add", tags=["library"])
async def add_movie_to_library(movie_id: Dict[str, str], current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Adding movie {movie_id} to library for user {current_user.username}")
    movie_id_str = movie_id.get("movie_id")
    # Check if the movie exists
    movie_data = fetch_movie_details(movie_id_str)
    if not movie_data:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Check if already in library
    existing = session.exec(
        select(UserMovieLibrary).where(
            (UserMovieLibrary.user_id == current_user.id) & (UserMovieLibrary.movie_external_id == movie_id_str)
        )
    ).first()
    if existing:
        return {"message": "Movie already in library"}
    entry = UserMovieLibrary(user_id=current_user.id, movie_external_id=movie_id_str)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return {"message": "Movie added to library", "movie_id": movie_id_str}

@router.delete("/library/movies/remove", tags=["library"])
async def remove_movie_from_library(movie_id: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Removing movie {movie_id} from library for user {current_user.username}")
    
    # Find the library entry
    library_entry = session.exec(
        select(UserMovieLibrary).where(
            (UserMovieLibrary.user_id == current_user.id) & (UserMovieLibrary.movie_external_id == movie_id)
        )
    ).first()
    
    if not library_entry:
        raise HTTPException(status_code=404, detail="Movie not found in library")
    
    session.delete(library_entry)
    session.commit()
    return {"message": "Movie removed from library", "movie_id": movie_id}

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

@router.put("/movies/{movie_id}/update-genres", tags=["movies"])
async def update_movie_genres(movie_id: int, session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de um filme existente no banco de dados buscando da API do OMDb.
    """
    logger.info(f"Updating genres for movie with id: {movie_id}")
    db_movie = session.get(DBMovie, movie_id)
    if not db_movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    
    if not db_movie.external_id:
        raise HTTPException(status_code=400, detail="Movie does not have an external_id")
    
    # Buscar dados atualizados da API
    try:
        movie_data = fetch_movie_details(db_movie.external_id)
        if movie_data:
            movie_obj = _omdb_title_to_movie(movie_data)
            if movie_obj and movie_obj.genres:
                db_movie.genres = movie_obj.genres
                session.add(db_movie)
                session.commit()
                session.refresh(db_movie)
                return {"message": "Genres updated successfully", "genres": db_movie.genres}
            else:
                return {"message": "No genres found in API response"}
        else:
            return {"message": "Movie not found in external API"}
    except Exception as e:
        logger.exception("Error updating movie genres")
        raise HTTPException(status_code=500, detail=f"Error updating genres: {str(e)}")

@router.post("/movies/update-all-genres", tags=["movies"])
async def update_all_movies_genres(session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de todos os filmes no banco de dados que têm external_id mas não têm gêneros.
    """
    logger.info("Updating genres for all movies")
    # Buscar todos os filmes com external_id
    all_movies = session.exec(select(DBMovie).where(DBMovie.external_id.isnot(None))).all()
    
    # Filtrar filmes sem gêneros (None ou lista vazia)
    movies_to_update = [
        movie for movie in all_movies 
        if not movie.genres or (isinstance(movie.genres, list) and len(movie.genres) == 0)
    ]
    
    updated_count = 0
    failed_count = 0
    
    for db_movie in movies_to_update:
        try:
            movie_data = fetch_movie_details(db_movie.external_id)
            if movie_data:
                movie_obj = _omdb_title_to_movie(movie_data)
                if movie_obj and movie_obj.genres:
                    db_movie.genres = movie_obj.genres
                    session.add(db_movie)
                    updated_count += 1
        except Exception as e:
            logger.exception(f"Error updating genres for movie {db_movie.id}: {e}")
            failed_count += 1
    
    session.commit()
    
    return {
        "message": f"Updated genres for {updated_count} movies",
        "updated_count": updated_count,
        "failed_count": failed_count,
        "total_processed": len(movies_to_update)
    }

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

@router.get("/users/{user_id}/recommendations/movies", response_model=List[Movie], tags=["recommendations"])
async def get_movie_recommendations(user_id: int, session: Session = Depends(get_session)):
    """
    Busca recomendações de filmes baseadas nos filmes da biblioteca pessoal do usuário.
    Usa os gêneros dos filmes na biblioteca para encontrar filmes similares.
    """
    logger.info(f"Getting movie recommendations for user: {user_id}")
    
    # Buscar filmes da biblioteca do usuário
    library_entries = session.exec(select(UserMovieLibrary).where(UserMovieLibrary.user_id == user_id)).all()
    
    if not library_entries:
        logger.info(f"User {user_id} has no movies in library")
        return []
    
    # Coletar external_ids e buscar detalhes dos filmes
    library_movie_ids = [entry.movie_external_id for entry in library_entries]
    library_movies = []
    all_genres = set()
    
    for external_id in library_movie_ids:
        try:
            movie_data = fetch_movie_details(external_id)
            if movie_data:
                movie_obj = _omdb_title_to_movie(movie_data)
                library_movies.append(movie_obj)
                # Coletar gêneros do filme
                # OMDb retorna gêneros como string separada por vírgulas
                genres_str = movie_data.get("Genre") or movie_data.get("genre", "")
                if genres_str:
                    genres_list = [g.strip() for g in genres_str.split(",") if g.strip()]
                    all_genres.update(genres_list)
        except Exception as e:
            logger.exception(f"Error fetching movie {external_id} for recommendations: {e}")
    
    if not all_genres:
        logger.info(f"No genres found in user {user_id} movie library")
        return []
    
    # Buscar filmes similares baseado nos gêneros
    recommended_movies = []
    seen_movie_ids = set(library_movie_ids)  # Para evitar recomendar filmes já na biblioteca
    
    # Buscar por gêneros (usar o primeiro gênero mais comum)
    # OMDb não suporta busca por gênero diretamente, então vamos buscar por títulos populares
    # e filtrar por gênero nos resultados
    for genre in list(all_genres)[:3]:  # Limitar a 3 gêneros
        try:
            # Buscar filmes populares e filtrar por gênero
            # Usar busca genérica e depois filtrar resultados
            search_results = fetch_movie_data(genre, limit=20)
            if search_results and "results" in search_results:
                for movie_item in search_results["results"][:15]:
                    movie_id = movie_item.get("imdbID")
                    if movie_id and movie_id not in seen_movie_ids:
                        # Verificar se o filme tem o gênero desejado
                        movie_genres_str = movie_item.get("Genre", "")
                        if genre.lower() in movie_genres_str.lower():
                            seen_movie_ids.add(movie_id)
                            movie_obj = _omdb_title_to_movie(movie_item)
                            recommended_movies.append(movie_obj)
                            
                            if len(recommended_movies) >= 30:
                                break
        except Exception as e:
            logger.exception(f"Error searching movies by genre {genre}: {e}")
        
        if len(recommended_movies) >= 30:
            break
    
    # Se ainda não tivermos muitas recomendações, buscar filmes populares em geral
    if len(recommended_movies) < 20:
        try:
            # Buscar filmes populares (usar termos genéricos)
            popular_terms = ["action", "drama", "comedy", "thriller"]
            for term in popular_terms[:2]:
                search_results = fetch_movie_data(term, limit=15)
                if search_results and "results" in search_results:
                    for movie_item in search_results["results"]:
                        movie_id = movie_item.get("imdbID")
                        if movie_id and movie_id not in seen_movie_ids:
                            seen_movie_ids.add(movie_id)
                            movie_obj = _omdb_title_to_movie(movie_item)
                            recommended_movies.append(movie_obj)
                            
                            if len(recommended_movies) >= 30:
                                break
                if len(recommended_movies) >= 30:
                    break
        except Exception as e:
            logger.exception(f"Error searching popular movies: {e}")
    
    # Limitar e retornar recomendações
    return recommended_movies[:30]