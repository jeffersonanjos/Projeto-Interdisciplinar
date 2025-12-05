from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from core.database import get_session
from core.models import Report, User, Book, Movie, ReportStatus
from core.schemas import ReportCreate, ReportRead, ReportUpdate, BookRead, MovieRead
from core.auth import get_current_user, get_current_curator_or_admin

router = APIRouter()


@router.post("/", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
async def create_report(
    report: ReportCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    db_report = Report(
        reporter_id=current_user.id,
        report_type=report.report_type,
        target_id=report.target_id,
        reason=report.reason,
        description=report.description
    )
    session.add(db_report)
    session.commit()
    session.refresh(db_report)
    return db_report


@router.get("/", response_model=List[ReportRead])
async def list_reports(
    status_filter: str = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    query = select(Report)
    if status_filter:
        query = query.where(Report.status == status_filter)
    query = query.order_by(Report.created_at.desc())
    reports = session.exec(query).all()
    return reports


@router.get("/{report_id}", response_model=ReportRead)
async def get_report(
    report_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Denúncia não encontrada")
    return report


@router.patch("/{report_id}", response_model=ReportRead)
async def update_report(
    report_id: int,
    report_update: ReportUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Denúncia não encontrada")
    
    if report_update.status:
        report.status = report_update.status
    if report_update.resolution_note:
        report.resolution_note = report_update.resolution_note
    
    report.reviewed_by = current_user.id
    report.updated_at = datetime.utcnow()
    
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    report = session.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Denúncia não encontrada")
    
    session.delete(report)
    session.commit()
    return None


@router.get("/search/books", response_model=List[BookRead])
async def search_books(
    query: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    query_lower = query.lower()
    statement = select(Book).where(
        (Book.title.ilike(f"%{query_lower}%")) |
        (Book.author.ilike(f"%{query_lower}%"))
    ).limit(20)
    books = session.exec(statement).all()
    
    result = []
    for book in books:
        result.append(BookRead(
            id=str(book.id),
            title=book.title,
            authors=[book.author] if book.author else [],
            description=book.description,
            image_url=book.cover_url,
            published_date=str(book.publication_date.year) if book.publication_date else None,
            author=book.author,
            cover_url=book.cover_url,
            external_id=book.external_id,
            isbn=book.isbn,
            publisher=book.publisher,
            publication_date=book.publication_date,
            genres=book.genres
        ))
    return result


@router.get("/search/movies", response_model=List[MovieRead])
async def search_movies(
    query: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    query_lower = query.lower()
    statement = select(Movie).where(
        (Movie.title.ilike(f"%{query_lower}%")) |
        (Movie.director.ilike(f"%{query_lower}%"))
    ).limit(20)
    movies = session.exec(statement).all()
    return movies


@router.post("/books/{book_id}/ban")
async def ban_book(
    book_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    
    book.is_banned = True
    session.add(book)
    session.commit()
    return {"message": "Livro banido com sucesso"}


@router.post("/books/{book_id}/unban")
async def unban_book(
    book_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    
    book.is_banned = False
    session.add(book)
    session.commit()
    return {"message": "Livro desbanido com sucesso"}


@router.post("/books/{book_id}/mute")
async def mute_book(
    book_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    
    book.is_muted = True
    session.add(book)
    session.commit()
    return {"message": "Livro silenciado com sucesso"}


@router.post("/books/{book_id}/unmute")
async def unmute_book(
    book_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    
    book.is_muted = False
    session.add(book)
    session.commit()
    return {"message": "Livro desmutado com sucesso"}


@router.post("/movies/{movie_id}/ban")
async def ban_movie(
    movie_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    movie = session.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    
    movie.is_banned = True
    session.add(movie)
    session.commit()
    return {"message": "Filme banido com sucesso"}


@router.post("/movies/{movie_id}/unban")
async def unban_movie(
    movie_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    movie = session.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    
    movie.is_banned = False
    session.add(movie)
    session.commit()
    return {"message": "Filme desbanido com sucesso"}


@router.post("/movies/{movie_id}/mute")
async def mute_movie(
    movie_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    movie = session.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    
    movie.is_muted = True
    session.add(movie)
    session.commit()
    return {"message": "Filme silenciado com sucesso"}


@router.post("/movies/{movie_id}/unmute")
async def unmute_movie(
    movie_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    movie = session.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    
    movie.is_muted = False
    session.add(movie)
    session.commit()
    return {"message": "Filme desmutado com sucesso"}
