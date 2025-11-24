"""
Rotas relacionadas ao sistema de follow/unfollow de usuários.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging

from sqlmodel import Session, select
from core.models import User, Follow
from core.schemas import UserRead
from core.database import get_session
from core.auth import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["users"])


@router.post("/users/{user_id}/follow")
def follow_user(
    user_id: int,
    usuario_atual: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Seguir um usuário"""
    logger.info(f"Usuário {usuario_atual.id} seguindo usuário {user_id}")
    
    if usuario_atual.id == user_id:
        raise HTTPException(status_code=400, detail="Você não pode seguir a si mesmo")
    
    usuario_alvo = session.get(User, user_id)
    if not usuario_alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    seguimento_existente = session.exec(
        select(Follow)
        .where(Follow.follower_id == usuario_atual.id)
        .where(Follow.following_id == user_id)
    ).first()
    
    if seguimento_existente:
        raise HTTPException(status_code=400, detail="Você já está seguindo este usuário")
    
    seguimento = Follow(
        follower_id=usuario_atual.id,
        following_id=user_id
    )
    session.add(seguimento)
    session.commit()
    session.refresh(seguimento)
    
    return {"message": "Usuário seguido com sucesso", "following": True}


@router.delete("/users/{user_id}/follow")
def unfollow_user(
    user_id: int,
    usuario_atual: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Parar de seguir um usuário"""
    logger.info(f"Usuário {usuario_atual.id} deixando de seguir usuário {user_id}")
    
    seguimento = session.exec(
        select(Follow)
        .where(Follow.follower_id == usuario_atual.id)
        .where(Follow.following_id == user_id)
    ).first()
    
    if not seguimento:
        raise HTTPException(status_code=404, detail="Você não está seguindo este usuário")
    
    session.delete(seguimento)
    session.commit()
    
    return {"message": "Deixou de seguir o usuário", "following": False}


@router.get("/users/{user_id}/follow")
def check_follow_status(
    user_id: int,
    usuario_atual: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Verificar se o usuário atual está seguindo outro usuário"""
    if usuario_atual.id == user_id:
        return {"following": False, "can_follow": False}
    
    seguimento = session.exec(
        select(Follow)
        .where(Follow.follower_id == usuario_atual.id)
        .where(Follow.following_id == user_id)
    ).first()
    
    return {"following": seguimento is not None, "can_follow": True}


@router.get("/users/{user_id}/followers", response_model=List[UserRead])
def get_followers(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Buscar seguidores de um usuário"""
    logger.info(f"Obtendo seguidores para o usuário {user_id}")
    
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    follows = session.exec(
        select(Follow)
        .where(Follow.following_id == user_id)
    ).all()
    
    follower_ids = [f.follower_id for f in follows]
    if not follower_ids:
        return []
    
    followers = session.exec(
        select(User)
        .where(User.id.in_(follower_ids))
    ).all()
    
    return followers


@router.get("/users/{user_id}/following", response_model=List[UserRead])
def get_following(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Buscar usuários que um usuário está seguindo"""
    logger.info(f"Obtendo usuários seguidos pelo usuário {user_id}")
    
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    follows = session.exec(
        select(Follow)
        .where(Follow.follower_id == user_id)
    ).all()
    
    following_ids = [f.following_id for f in follows]
    if not following_ids:
        return []
    
    following = session.exec(
        select(User)
        .where(User.id.in_(following_ids))
    ).all()
    
    return following

