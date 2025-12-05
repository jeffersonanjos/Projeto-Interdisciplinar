from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from pydantic import BaseModel
import logging

from core.models import User, UserRole
from core.schemas import UserRead
from core.database import get_session
from core.auth import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(tags=["moderation"])


class PromoteUserRequest(BaseModel):
    user_id: int
    role: str


class DemoteUserRequest(BaseModel):
    user_id: int


@router.post("/users/{user_id}/promote", response_model=UserRead)
async def promote_user_to_curator(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if target_user.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=400, 
            detail="Não é possível modificar o role de um administrador"
        )
    
    if target_user.role == UserRole.CURATOR.value:
        raise HTTPException(
            status_code=400, 
            detail="Usuário já é curador"
        )
    
    target_user.role = UserRole.CURATOR.value
    session.add(target_user)
    session.commit()
    session.refresh(target_user)
    
    logger.info(
        "Admin %s promoveu usuário %s (id=%s) para curador",
        current_admin.username,
        target_user.username,
        user_id
    )
    
    return target_user


@router.post("/users/{user_id}/demote", response_model=UserRead)
async def demote_user_to_normal(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if target_user.role == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=400, 
            detail="Não é possível modificar o role de um administrador"
        )
    
    if target_user.role == UserRole.NORMAL.value:
        raise HTTPException(
            status_code=400, 
            detail="Usuário já é normal"
        )
    
    target_user.role = UserRole.NORMAL.value
    session.add(target_user)
    session.commit()
    session.refresh(target_user)
    
    logger.info(
        "Admin %s rebaixou usuário %s (id=%s) para normal",
        current_admin.username,
        target_user.username,
        user_id
    )
    
    return target_user


@router.get("/users/curators", response_model=list[UserRead])
async def list_curators(
    current_admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    curators = session.exec(
        select(User).where(User.role == UserRole.CURATOR.value)
    ).all()
    
    return curators
