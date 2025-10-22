# app/profile.py
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import User, UserProfile
from typing import Optional

router = APIRouter(prefix="/profiles", tags=["Perfis de Usuário"])


@router.post("/", response_model=UserProfile)
def create_or_update_profile(
    user_id: int,
    bio: Optional[str] = None,
    avatar_url: Optional[str] = None,
    session: Session = Depends(get_session)
):
    # Verifica se o usuário existe
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Verifica se já existe um perfil para o usuário
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()

    if profile:
        # Atualiza o perfil existente
        profile.bio = bio or profile.bio
        profile.avatar_url = avatar_url or profile.avatar_url
    else:
        # Cria um novo perfil
        profile = UserProfile(user_id=user_id, bio=bio, avatar_url=avatar_url)
        session.add(profile)

    session.commit()
    session.refresh(profile)
    return profile


@router.get("/{user_id}", response_model=UserProfile)
def get_profile(user_id: int, session: Session = Depends(get_session)):
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    return profile
