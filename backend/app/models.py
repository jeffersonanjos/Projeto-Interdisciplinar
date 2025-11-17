from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON
from typing import List, Optional
from datetime import datetime, date

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
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