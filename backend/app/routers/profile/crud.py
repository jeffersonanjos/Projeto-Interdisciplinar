"""
Rotas CRUD de perfis de usuário.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from core.database import get_session
from core.models import User, UserProfile
from typing import Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["Perfis de Usuário"])


class ProfileCreate(BaseModel):
    user_id: int
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


@router.post("/", response_model=UserProfile)
def create_or_update_profile(
    profile_data: ProfileCreate,
    session: Session = Depends(get_session)
):
    user_id = profile_data.user_id
    bio = profile_data.bio
    avatar_url = profile_data.avatar_url
    
    # Verifica se o usuário existe
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Verifica se já existe um perfil para o usuário
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()

    if profile:
        # Atualiza o perfil existente
        if bio is not None:
            profile.bio = bio
        if avatar_url is not None:
            profile.avatar_url = avatar_url
    else:
        # Cria um novo perfil
        profile = UserProfile(user_id=user_id, bio=bio, avatar_url=avatar_url)
        session.add(profile)

    session.commit()
    session.refresh(profile)
    return profile


@router.get("/{user_id}", response_model=UserProfile)
def get_profile(user_id: int, session: Session = Depends(get_session)):
    # Verificar se o usuário existe
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar perfil existente
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
    
    # Se não existe, criar um perfil padrão
    if not profile:
        profile = UserProfile(user_id=user_id, bio=None, avatar_url=None)
        session.add(profile)
        session.commit()
        session.refresh(profile)
    
    return profile

