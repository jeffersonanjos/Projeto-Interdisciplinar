"""
Rotas relacionadas à biblioteca de livros do usuário.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
import logging

from sqlmodel import Session, select
from core.models import User, UserLibrary
from core.schemas import BookRead
from core.database import get_session
from core.auth import get_current_active_user
from services.google_books import obter_livro_por_id
from ..utils import google_book_to_bookread

logger = logging.getLogger(__name__)

router = APIRouter(tags=["library"])


@router.get("/users/{user_id}/library", response_model=List[BookRead])
async def get_user_library(user_id: int, session: Session = Depends(get_session)):
    """Obtém a biblioteca de livros do usuário (mantido para compatibilidade com versões anteriores)."""
    logger.info(f"Obtendo biblioteca de livros para o usuário: {user_id}")
    entries = session.exec(select(UserLibrary).where(UserLibrary.user_id == user_id)).all()
    books: List[BookRead] = []
    for entry in entries:
        try:
            livro = obter_livro_por_id(entry.book_external_id)
            if livro:
                dados_livro = google_book_to_bookread(livro)
                books.append(dados_livro)
        except Exception:
            logger.exception("Failed to fetch book details for %s", entry.book_external_id)
    return books


@router.post("/library/add")
async def add_book_to_library(book_id: Dict[str, str], current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Adicionando livro {book_id} à biblioteca do usuário {current_user.username}")
    
    if current_user.is_muted:
        raise HTTPException(
            status_code=403, 
            detail="Você está silenciado e não pode adicionar itens à biblioteca"
        )
    
    id_livro_str = book_id.get("book_id")
    livro = obter_livro_por_id(id_livro_str)
    if not livro:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    existente = session.exec(
        select(UserLibrary).where(
            (UserLibrary.user_id == current_user.id) & (UserLibrary.book_external_id == id_livro_str)
        )
    ).first()
    if existente:
        return {"message": "Livro já está na biblioteca"}
    entrada = UserLibrary(user_id=current_user.id, book_external_id=id_livro_str)
    session.add(entrada)
    session.commit()
    session.refresh(entrada)
    return {"message": "Livro adicionado à biblioteca", "book_id": id_livro_str}


@router.delete("/library/remove")
async def remove_book_from_library(book_id: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Removendo livro {book_id} da biblioteca do usuário {current_user.username}")
    
    entrada_biblioteca = session.exec(
        select(UserLibrary).where(
            (UserLibrary.user_id == current_user.id) & (UserLibrary.book_external_id == book_id)
        )
    ).first()
    
    if not entrada_biblioteca:
        raise HTTPException(status_code=404, detail="Livro não encontrado na biblioteca")
    
    session.delete(entrada_biblioteca)
    session.commit()
    return {"message": "Livro removido da biblioteca", "book_id": book_id}

