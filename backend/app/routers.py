from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
from datetime import timedelta

from models import User, Book, Movie, Rating, Recommendation
from sqlmodel import Session, select
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


router = APIRouter()

@router.get("/books/search", response_model=List[BookRead], tags=["books"])
async def search_books(query: str, session: Session = Depends(get_session)):
    # Implement search logic using Google Books API
    pass

@router.get("/books/{external_id}", response_model=BookRead, tags=["books"])
async def get_book(external_id: str, session: Session = Depends(get_session)):
    # Implement logic to fetch book details using Google Books API
    pass

@router.get("/movies/search", response_model=List[MovieRead], tags=["movies"])
async def search_movies(query: str, session: Session = Depends(get_session)):
    # Implement search logic using TMDB API
    pass

@router.get("/movies/{external_id}", response_model=MovieRead, tags=["movies"])
async def get_movie(external_id: str, session: Session = Depends(get_session)):
    # Implement logic to fetch movie details using TMDB API
    pass

@router.post("/users/", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["users"])
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    db_user = session.exec(select(User).where(User.username == user.username)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username já existe")
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password)
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

@router.post("/token", response_model=Token, tags=["auth"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
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
    """Obtém informações do usuário atual"""
    return current_user

@router.put("/users/{user_id}", response_model=UserRead, tags=["users"])
def update_user(user_id: int, user_update: UserUpdate, session: Session = Depends(get_session)):
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
def create_rating(
    rating: RatingCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    if not rating.book_id and not rating.movie_id:
        raise HTTPException(status_code=400, detail="Uma avaliação deve estar associada a um livro ou filme.")
    
    # Usar o ID do usuário autenticado
    rating_data = rating.dict()
    rating_data["user_id"] = current_user.id
    
    db_rating = Rating(**rating_data)
    session.add(db_rating)
    session.commit()
    session.refresh(db_rating)
    return db_rating