from typing import Optional, List, Dict, Any
from datetime import date, datetime
from sqlmodel import SQLModel
from pydantic import Field, validator, BaseModel

# Usuário
class UserBase(SQLModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=1, description="Senha em texto plano")  # senha em texto plano, será convertida para hash
    
    @validator('password')
    def validate_password_length(cls, v):
        # bcrypt tem limite de 72 bytes - truncar automaticamente se necessário
        if len(v.encode('utf-8')) > 72:
            # Truncar em 72 bytes (não caracteres)
            password_bytes = v.encode('utf-8')[:72]
            v = password_bytes.decode('utf-8', errors='ignore')
        return v

class UserRead(UserBase):
    id: int
    created_at: datetime

    # items: list[Item] = []

    class Config:
        orm_mode = True


class Book(BaseModel):
    id: str
    title: str
    authors: list[str]
    description: str | None = None
    image_url: str | None = None

    class Config:
        orm_mode = True


class Movie(BaseModel):
    id: int
    title: str
    overview: str | None = None
    poster_path: str | None = None
    release_date: str


    class Config:
        orm_mode = True



    class Config:
        orm_mode = True

class UserUpdate(SQLModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

# Autenticação
class UserLogin(SQLModel):
    username: str
    password: str

class Token(SQLModel):
    access_token: str
    token_type: str

class TokenData(SQLModel):
    username: Optional[str]

# Livros
class BookBase(SQLModel):
    title: str
    author: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    external_id: Optional[str] = None
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    publication_date: Optional[date] = None
    genres: Optional[List[str]] = None

class BookCreate(BookBase):
    pass


class BookRead(BookBase):
    id: str
    image_url: Optional[str] = None

    class Config:
        orm_mode = True

class BookUpdate(SQLModel):
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    external_id: Optional[str] = None

# Filme
class MovieBase(SQLModel):
    title: str
    director: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    external_id: Optional[str] = None
    release_date: Optional[date] = None
    genres: Optional[List[str]] = None
    cast: Optional[List[str]] = None

class MovieCreate(MovieBase):
    pass

class MovieRead(MovieBase):
    id: int

    class Config:
        orm_mode = True

class MovieUpdate(SQLModel):
    title: Optional[str] = None
    director: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    external_id: Optional[str] = None

# Avaliação
class RatingBase(SQLModel):
    user_id: int
    book_id: Optional[int] = None
    movie_id: Optional[int] = None
    # Permitir enviar IDs externos quando não houver ID interno
    book_external_id: Optional[str] = None
    movie_external_id: Optional[str] = None
    score: float
    comment: Optional[str] = None

class RatingCreate(RatingBase):
    pass

class RatingRead(RatingBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# Recomendação
class RecommendationBase(SQLModel):
    user_id: int

class RecommendationRead(RecommendationBase):
    id: int
    recommended_books: Optional[List[int]] = None
    recommended_movies: Optional[List[int]] = None
    created_at: datetime

    class Config:
        orm_mode = True

        