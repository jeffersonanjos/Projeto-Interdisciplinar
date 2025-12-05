from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON, UniqueConstraint
from typing import List, Optional
from datetime import datetime, date
from enum import Enum

class UserRole(str, Enum):
    NORMAL = "normal"
    CURATOR = "curator"
    ADMIN = "admin"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: str = Field(default=UserRole.NORMAL.value, index=True)
    is_banned: bool = Field(default=False, index=True)
    is_muted: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    ratings: List["Rating"] = Relationship(back_populates="user")
    recommendations: List["Recommendation"] = Relationship(back_populates="user")
    profile: Optional["UserProfile"] = Relationship(
        back_populates="user", sa_relationship_kwargs={"uselist": False}
    )
    authored_reviews: List["UserReview"] = Relationship(
        back_populates="author",
        sa_relationship_kwargs={
            "foreign_keys": "UserReview.author_user_id",
            "primaryjoin": "User.id == UserReview.author_user_id",
        },
    )
    received_reviews: List["UserReview"] = Relationship(
        back_populates="target",
        sa_relationship_kwargs={
            "foreign_keys": "UserReview.target_user_id",
            "primaryjoin": "User.id == UserReview.target_user_id",
        },
    )

class Book(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    author: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    external_id: Optional[str] = None
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    publication_date: Optional[date] = None
    genres: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    is_banned: bool = Field(default=False, index=True)
    is_muted: bool = Field(default=False, index=True)
    ratings: List["Rating"] = Relationship(back_populates="book")


class Movie(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    director: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    external_id: Optional[str] = None
    release_date: Optional[date] = None
    genres: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    cast: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    is_banned: bool = Field(default=False, index=True)
    is_muted: bool = Field(default=False, index=True)
    ratings: List["Rating"] = Relationship(back_populates="movie")


class Rating(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    book_id: Optional[int] = Field(default=None, foreign_key="book.id")
    movie_id: Optional[int] = Field(default=None, foreign_key="movie.id")
    score: float
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: "User" = Relationship(back_populates="ratings")
    book: Optional["Book"] = Relationship(back_populates="ratings")
    movie: Optional["Movie"] = Relationship(back_populates="ratings")


class Recommendation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    recommended_books: Optional[List[int]] = Field(default=None, sa_column=Column(JSON))
    recommended_movies: Optional[List[int]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: "User" = Relationship(back_populates="recommendations")


class UserReview(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    author_user_id: int = Field(foreign_key="user.id", index=True)
    target_user_id: int = Field(foreign_key="user.id", index=True)
    rating: float
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    author: "User" = Relationship(
        back_populates="authored_reviews",
        sa_relationship_kwargs={
            "foreign_keys": "UserReview.author_user_id",
            "primaryjoin": "UserReview.author_user_id == User.id",
        },
    )
    target: "User" = Relationship(
        back_populates="received_reviews",
        sa_relationship_kwargs={
            "foreign_keys": "UserReview.target_user_id",
            "primaryjoin": "UserReview.target_user_id == User.id",
        },
    )


class UserProfile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True, index=True)
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional["User"] = Relationship(
        back_populates="profile", sa_relationship_kwargs={"uselist": False}
    )


class UserLibrary(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    book_external_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserMovieLibrary(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    movie_external_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Follow(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    follower_id: int = Field(foreign_key="user.id", index=True)
    following_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="unique_follow"),
    )


class ReportStatus(str, Enum):
    PENDING = "pending"
    REVIEWING = "reviewing"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class ReportType(str, Enum):
    USER = "user"
    RATING = "rating"
    REVIEW = "review"


class Report(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    reporter_id: int = Field(foreign_key="user.id", index=True)
    report_type: str = Field(index=True)
    target_id: int = Field(index=True)
    reason: str
    description: Optional[str] = None
    status: str = Field(default=ReportStatus.PENDING.value, index=True)
    reviewed_by: Optional[int] = Field(default=None, foreign_key="user.id")
    resolution_note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


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


class Moderation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    moderator_id: int = Field(foreign_key="user.id", index=True)
    target_user_id: int = Field(foreign_key="user.id", index=True)
    action_type: str = Field(index=True)
    reason: str
    description: Optional[str] = None
    status: str = Field(default=ModerationStatus.ACTIVE.value, index=True)
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

