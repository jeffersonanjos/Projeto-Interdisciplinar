from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from core.database import get_session
from core.models import Moderation, User, Book, Movie, ModerationStatus
from core.schemas import ModerationCreate, ModerationRead, ModerationUpdate, UserRead, BookRead, MovieRead
from core.auth import get_current_user, get_current_curator_or_admin

router = APIRouter()


@router.post("/", response_model=ModerationRead, status_code=status.HTTP_201_CREATED)
async def create_moderation(
    moderation: ModerationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    db_moderation = Moderation(
        moderator_id=current_user.id,
        target_user_id=moderation.target_user_id,
        action_type=moderation.action_type,
        reason=moderation.reason,
        description=moderation.description,
        expires_at=moderation.expires_at
    )
    session.add(db_moderation)
    session.commit()
    session.refresh(db_moderation)
    return db_moderation


@router.get("/", response_model=List[ModerationRead])
async def list_moderations(
    status_filter: str = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    query = select(Moderation)
    if status_filter:
        query = query.where(Moderation.status == status_filter)
    query = query.order_by(Moderation.created_at.desc())
    moderations = session.exec(query).all()
    return moderations


@router.get("/{moderation_id}", response_model=ModerationRead)
async def get_moderation(
    moderation_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    moderation = session.get(Moderation, moderation_id)
    if not moderation:
        raise HTTPException(status_code=404, detail="Ação de moderação não encontrada")
    return moderation


@router.patch("/{moderation_id}", response_model=ModerationRead)
async def update_moderation(
    moderation_id: int,
    moderation_update: ModerationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    moderation = session.get(Moderation, moderation_id)
    if not moderation:
        raise HTTPException(status_code=404, detail="Ação de moderação não encontrada")
    
    if moderation_update.status:
        moderation.status = moderation_update.status
    if moderation_update.description:
        moderation.description = moderation_update.description
    if moderation_update.expires_at is not None:
        moderation.expires_at = moderation_update.expires_at
    
    moderation.updated_at = datetime.utcnow()
    
    session.add(moderation)
    session.commit()
    session.refresh(moderation)
    return moderation


@router.delete("/{moderation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_moderation(
    moderation_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    moderation = session.get(Moderation, moderation_id)
    if not moderation:
        raise HTTPException(status_code=404, detail="Ação de moderação não encontrada")
    
    session.delete(moderation)
    session.commit()
    return None


@router.get("/search/users", response_model=List[UserRead])
async def search_users(
    query: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    query_lower = query.lower()
    statement = select(User).where(
        (User.username.ilike(f"%{query_lower}%")) |
        (User.email.ilike(f"%{query_lower}%"))
    ).limit(20)
    users = session.exec(statement).all()
    return users


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.is_banned = True
    session.add(user)
    session.commit()
    return {"message": "Usuário banido com sucesso"}


@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.is_banned = False
    session.add(user)
    session.commit()
    return {"message": "Usuário desbanido com sucesso"}


@router.post("/users/{user_id}/mute")
async def mute_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.is_muted = True
    session.add(user)
    session.commit()
    return {"message": "Usuário silenciado com sucesso"}


@router.post("/users/{user_id}/unmute")
async def unmute_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_curator_or_admin)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.is_muted = False
    session.add(user)
    session.commit()
    return {"message": "Usuário desmutado com sucesso"}
