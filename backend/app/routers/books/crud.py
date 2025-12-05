from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import List

from core.database import get_session
from core.models import Book, User
from core.schemas import BookCreate, BookRead
from core.auth import get_current_admin

router = APIRouter()


@router.post("/books/manual", response_model=BookRead, status_code=status.HTTP_201_CREATED)
async def create_book_manually(
    book: BookCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin)
):
    db_book = Book(**book.dict())
    session.add(db_book)
    session.commit()
    session.refresh(db_book)
    
    return BookRead(
        id=str(db_book.id),
        title=db_book.title,
        authors=[db_book.author] if db_book.author else [],
        description=db_book.description,
        image_url=db_book.cover_url,
        published_date=str(db_book.publication_date.year) if db_book.publication_date else None,
        author=db_book.author,
        cover_url=db_book.cover_url,
        external_id=db_book.external_id,
        isbn=db_book.isbn,
        publisher=db_book.publisher,
        publication_date=db_book.publication_date,
        genres=db_book.genres
    )
