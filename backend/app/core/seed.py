import logging
import random
import shutil
from datetime import date, datetime
from pathlib import Path
from typing import Optional, Sequence, Tuple

from sqlmodel import Session, select

from core.auth import get_password_hash
from core.database import engine
from core.models import (
    Book as DBBook,
    Movie as DBMovie,
    Rating,
    User,
    UserLibrary,
    UserMovieLibrary,
    UserProfile,
)
from services.google_books import obter_livro_por_id
from services.api_clients import buscar_detalhes_filme
from routers.utils import omdb_title_to_movie

logger = logging.getLogger(__name__)

DEFAULT_PASSWORD = "123456"
BOOK_POOL: Sequence[str] = (
    "zyTCAlFPjgYC",  # The Google Story
    "yDtCuFHXbAYC",  # Harry Potter and the Sorcerer's Stone
    "1wy49i-gQjIC",  # The Hobbit
    "m8dPPgAACAAJ",  # 1984
    "bT0V0w0Z0uAC",  # Dune
)
MOVIE_POOL: Sequence[str] = (
    "tt0133093",  # The Matrix
    "tt0167260",  # The Lord of the Rings: The Return of the King
    "tt1375666",  # Inception
    "tt0111161",  # The Shawshank Redemption
    "tt0137523",  # Fight Club
)
USER_BIOS: Sequence[str] = (
    "Leitor voraz e fã de ficção científica.",
    "Maratonista de filmes clássicos.",
    "Curioso por novas histórias e recomendações.",
    "Explorador cultural em busca da próxima obra favorita.",
)
RATING_COMMENTS: Sequence[str] = (
    "Excelente recomendação!",
    "Gostei bastante, recomendo.",
    "Tem alguns pontos fracos, mas vale a pena.",
    "Não é perfeito, porém diverte.",
)
RATING_SCORES: Sequence[float] = (3.5, 4, 4.5, 5)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
APP_DIR = Path(__file__).resolve().parents[1]
AVATAR_DIR = APP_DIR / "uploads" / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_PUBLIC_DIR = PROJECT_ROOT / "frontend" / "public"

DEFAULT_USERS = (
    {"username": "alexandria", "avatar": None, "role": "admin"},
    {"username": "andrei", "avatar": "silver.jpg", "role": "normal"},
    {"username": "henrique", "avatar": "vector.jpg", "role": "normal"},
    {"username": "jefferson", "avatar": "fang.jpg", "role": "normal"},
    {"username": "igor", "avatar": "knuckles.jpg", "role": "normal"},
)


def seed_initial_data() -> None:
    """Create default users and seed their libraries if they are missing."""
    logger.info("Iniciando seed de usuários padrão.")
    with Session(engine) as session:
        for user_spec in DEFAULT_USERS:
            username = user_spec["username"]
            role = user_spec.get("role", "normal")
            existing_user = session.exec(
                select(User).where(User.username == username)
            ).first()
            if existing_user:
                logger.info("Usuário %s já existe. Pulando seed.", username)
                continue

            user = _create_user(session, username, role)
            avatar = user_spec.get("avatar")
            avatar_url = _ensure_avatar(avatar, username) if avatar else None
            _create_profile(session, user, avatar_url)
            
            if role != "admin":
                livros, filmes = _populate_libraries(session, user)
                _create_ratings(session, user, livros, filmes)

    logger.info("Seed de usuários concluída.")


def _create_user(session: Session, username: str, role: str = "normal") -> User:
    email = f"{username}@email"
    user = User(
        username=username,
        email=email,
        hashed_password=get_password_hash(DEFAULT_PASSWORD),
        role=role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    logger.info("Usuário %s criado com id %s e role %s.", username, user.id, role)
    return user


def _ensure_avatar(source_filename: str, username: str) -> Optional[str]:
    """Copy avatar from frontend/public into uploads if it exists."""
    origin = FRONTEND_PUBLIC_DIR / source_filename
    if not origin.exists():
        logger.warning(
            "Arquivo de avatar %s não encontrado em %s.", source_filename, origin
        )
        return None

    destination_name = f"{username}_{origin.name}"
    destination = AVATAR_DIR / destination_name
    if not destination.exists():
        shutil.copy(origin, destination)
        logger.info("Avatar copiado para %s.", destination)

    return f"/uploads/avatars/{destination_name}"


def _create_profile(session: Session, user: User, avatar_url: Optional[str]) -> None:
    bio = random.choice(USER_BIOS)
    profile = UserProfile(user_id=user.id, avatar_url=avatar_url, bio=bio)
    session.add(profile)
    session.commit()
    logger.info("Perfil criado para o usuário %s.", user.username)


def _populate_libraries(session: Session, user: User) -> Tuple[Sequence[str], Sequence[str]]:
    book_ids = _pick_random_items(BOOK_POOL, 2)
    movie_ids = _pick_random_items(MOVIE_POOL, 2)

    for book_id in book_ids:
        if not obter_livro_por_id(book_id):
            logger.warning("Livro %s não retornou dados. Pulando.", book_id)
            continue
        already_exists = session.exec(
            select(UserLibrary).where(
                (UserLibrary.user_id == user.id)
                & (UserLibrary.book_external_id == book_id)
            )
        ).first()
        if already_exists:
            continue
        session.add(UserLibrary(user_id=user.id, book_external_id=book_id))

    for movie_id in movie_ids:
        if not buscar_detalhes_filme(movie_id):
            logger.warning("Filme %s não retornou dados. Pulando.", movie_id)
            continue
        already_exists = session.exec(
            select(UserMovieLibrary).where(
                (UserMovieLibrary.user_id == user.id)
                & (UserMovieLibrary.movie_external_id == movie_id)
            )
        ).first()
        if already_exists:
            continue
        session.add(
            UserMovieLibrary(user_id=user.id, movie_external_id=movie_id)
        )

    session.commit()
    logger.info(
        "Biblioteca inicial criada para %s (livros=%s, filmes=%s).",
        user.username,
        book_ids,
        movie_ids,
    )
    return book_ids, movie_ids


def _pick_random_items(pool: Sequence[str], max_items: int) -> Sequence[str]:
    if not pool:
        return ()
    sample_size = min(len(pool), max_items)
    return tuple(random.sample(list(pool), sample_size))


def _create_ratings(
    session: Session,
    user: User,
    book_external_ids: Sequence[str],
    movie_external_ids: Sequence[str],
) -> None:
    for external_id in book_external_ids:
        livro = _get_or_create_book(session, external_id)
        if not livro:
            continue
        exists = session.exec(
            select(Rating).where(
                (Rating.user_id == user.id) & (Rating.book_id == livro.id)
            )
        ).first()
        if exists:
            continue
        rating = Rating(
            user_id=user.id,
            book_id=livro.id,
            score=random.choice(RATING_SCORES),
            comment=random.choice(RATING_COMMENTS),
        )
        session.add(rating)

    for external_id in movie_external_ids:
        filme = _get_or_create_movie(session, external_id)
        if not filme:
            continue
        exists = session.exec(
            select(Rating).where(
                (Rating.user_id == user.id) & (Rating.movie_id == filme.id)
            )
        ).first()
        if exists:
            continue
        rating = Rating(
            user_id=user.id,
            movie_id=filme.id,
            score=random.choice(RATING_SCORES),
            comment=random.choice(RATING_COMMENTS),
        )
        session.add(rating)

    session.commit()
    logger.info("Avaliações automáticas criadas para %s.", user.username)


def _get_or_create_book(session: Session, external_id: str) -> Optional[DBBook]:
    if not external_id:
        return None
    livro_db = session.exec(
        select(DBBook).where(DBBook.external_id == external_id)
    ).first()
    if livro_db:
        return livro_db

    dados = obter_livro_por_id(external_id)
    if not dados:
        logger.warning("Não foi possível buscar detalhes do livro %s.", external_id)
        return None

    info = dados.get("volumeInfo", {})
    livro_db = DBBook(
        title=info.get("title", "Sem título"),
        author=", ".join(info.get("authors", []) or []) or None,
        description=info.get("description"),
        cover_url=info.get("imageLinks", {}).get("thumbnail"),
        external_id=external_id,
        genres=info.get("categories"),
    )
    session.add(livro_db)
    session.commit()
    session.refresh(livro_db)
    return livro_db


def _get_or_create_movie(session: Session, external_id: str) -> Optional[DBMovie]:
    if not external_id:
        return None
    filme_db = session.exec(
        select(DBMovie).where(DBMovie.external_id == external_id)
    ).first()
    if filme_db:
        return filme_db

    dados = buscar_detalhes_filme(external_id)
    objeto = omdb_title_to_movie(dados) if dados else None
    if not objeto:
        logger.warning(
            "Não foi possível converter detalhes do filme %s.", external_id
        )
        return None

    filme_db = DBMovie(
        title=objeto.title,
        description=objeto.overview,
        cover_url=objeto.poster_path,
        external_id=external_id,
        release_date=_parse_release_date(objeto.release_date),
        genres=objeto.genres,
        director=objeto.director,
        cast=objeto.cast,
    )
    session.add(filme_db)
    session.commit()
    session.refresh(filme_db)
    return filme_db


def _parse_release_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        if len(value) == 4 and value.isdigit():
            return date(int(value), 1, 1)
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None



