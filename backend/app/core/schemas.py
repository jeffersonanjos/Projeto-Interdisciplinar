from typing import Optional, List
from datetime import date, datetime
from sqlmodel import SQLModel
from pydantic import Field, validator, BaseModel
from enum import Enum

class UserRole(str, Enum):
    NORMAL = "normal"
    CURATOR = "curator"
    ADMIN = "admin"

class UserBase(SQLModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=1, description="Senha em texto plano")

    @validator('password')
    def validate_password_length(cls, v):
        if len(v.encode('utf-8')) > 72:
            password_bytes = v.encode('utf-8')[:72]
            v = password_bytes.decode('utf-8', errors='ignore')
        return v

class UserRead(UserBase):
    id: int
    role: str
    is_banned: bool = False
    is_muted: bool = False
    created_at: datetime

    class Config:
        orm_mode = True

class UserUpdate(SQLModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None  # Senha atual para confirmação

class UserLogin(SQLModel):
    username: str
    password: str

class Token(SQLModel):
    access_token: str
    token_type: str

class TokenData(SQLModel):
    username: Optional[str]

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
    authors: Optional[List[str]] = None        # compatível com Google Books API
    image_url: Optional[str] = None
    published_date: Optional[str] = None       # Ano de publicação
    is_banned: bool = False
    is_muted: bool = False

    class Config:
        orm_mode = True

class BookUpdate(SQLModel):
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    external_id: Optional[str] = None

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
    is_banned: bool = False
    is_muted: bool = False

    class Config:
        orm_mode = True

class MovieUpdate(SQLModel):
    title: Optional[str] = None
    director: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    external_id: Optional[str] = None

class RatingBase(SQLModel):
    user_id: int
    book_id: Optional[int] = None
    movie_id: Optional[int] = None
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


class RatingUpdate(SQLModel):
    score: Optional[float] = None
    comment: Optional[str] = None

class RecommendationBase(SQLModel):
    user_id: int

class RecommendationRead(RecommendationBase):
    id: int
    recommended_books: Optional[List[int]] = None
    recommended_movies: Optional[List[int]] = None
    created_at: datetime

    class Config:
        orm_mode = True

class Book(BaseModel):
    id: str
    title: str
    authors: List[str]
    description: Optional[str] = None
    image_url: Optional[str] = None

    class Config:
        orm_mode = True


class Movie(BaseModel):
    id: str
    title: str
    overview: Optional[str] = None
    poster_path: Optional[str] = None
    release_date: Optional[str] = None
    rating: Optional[float] = None
    vote_count: Optional[int] = None
    genres: Optional[List[str]] = None
    director: Optional[str] = None
    cast: Optional[List[str]] = None

    class Config:
        orm_mode = True


class ReportStatus(str, Enum):
    PENDING = "pending"
    REVIEWING = "reviewing"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class ReportType(str, Enum):
    USER = "user"
    RATING = "rating"
    REVIEW = "review"


class ReportBase(SQLModel):
    report_type: str
    target_id: int
    reason: str
    description: Optional[str] = None


class ReportCreate(ReportBase):
    pass


class ReportRead(ReportBase):
    id: int
    reporter_id: int
    status: str
    reviewed_by: Optional[int] = None
    resolution_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ReportUpdate(SQLModel):
    status: Optional[str] = None
    resolution_note: Optional[str] = None


class ModerationActionType(str, Enum):
    WARNING = "warning"
    MUTE = "mute"
    BAN = "ban"
    UNBAN = "unban"
    UNMUTE = "unmute"


class ModerationStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class ModerationBase(SQLModel):
    target_user_id: int
    action_type: str
    reason: str
    description: Optional[str] = None
    expires_at: Optional[datetime] = None


class ModerationCreate(ModerationBase):
    pass


class ModerationRead(ModerationBase):
    id: int
    moderator_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ModerationUpdate(SQLModel):
    status: Optional[str] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None

