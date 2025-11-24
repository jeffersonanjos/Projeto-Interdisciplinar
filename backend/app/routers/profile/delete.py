"""
Rotas relacionadas à deleção de perfis.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from core.database import get_session
from core.models import User, UserProfile, Rating, UserLibrary, Recommendation
from core.auth import get_current_active_user
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["Perfis de Usuário"])

# Diretório para armazenar avatares
AVATAR_DIR = Path("uploads/avatars")


@router.delete("/{user_id}")
async def delete_profile(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Deletar perfil e usuário"""
    # Verificar se o usuário está tentando deletar seu próprio perfil
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para deletar este perfil")
    
    # Deletar avatar se existir
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
    if profile and profile.avatar_url:
        avatar_filename = profile.avatar_url.replace("/uploads/avatars/", "")
        avatar_path = AVATAR_DIR / avatar_filename
        if avatar_path.exists():
            try:
                avatar_path.unlink()
            except:
                pass
    
    # Deletar perfil
    if profile:
        session.delete(profile)
    
    # Deletar avaliações do usuário
    ratings = session.exec(select(Rating).where(Rating.user_id == user_id)).all()
    for rating in ratings:
        session.delete(rating)
    
    # Deletar biblioteca do usuário
    library_entries = session.exec(select(UserLibrary).where(UserLibrary.user_id == user_id)).all()
    for entry in library_entries:
        session.delete(entry)
    
    # Deletar recomendações do usuário
    recommendations = session.exec(select(Recommendation).where(Recommendation.user_id == user_id)).all()
    for rec in recommendations:
        session.delete(rec)
    
    # Deletar usuário
    user = session.get(User, user_id)
    if user:
        session.delete(user)
    
    session.commit()
    
    return {"message": "Perfil e conta deletados com sucesso"}

