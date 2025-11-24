"""
Rotas relacionadas ao upload e remoção de avatares.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from core.database import get_session
from core.models import User, UserProfile
from core.auth import get_current_active_user
import shutil
import uuid
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["Perfis de Usuário"])

# Diretório para armazenar avatares
AVATAR_DIR = Path("uploads/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/{user_id}/upload-avatar")
async def upload_avatar(
    user_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Upload de arquivo de avatar para o perfil do usuário"""
    # Verificar se o usuário está tentando atualizar seu próprio perfil
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para atualizar este perfil")
    
    # Verificar se é uma imagem
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="O arquivo deve ser uma imagem")
    
    # Gerar nome único para o arquivo
    file_extension = Path(file.filename).suffix
    unique_filename = f"{user_id}_{uuid.uuid4()}{file_extension}"
    file_path = AVATAR_DIR / unique_filename
    
    # Salvar arquivo
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")
    
    # Atualizar perfil com a URL do avatar
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
    
    # Se já existe um avatar, deletar o arquivo antigo
    if profile and profile.avatar_url:
        old_avatar_path = profile.avatar_url.replace("/uploads/avatars/", "")
        old_file_path = AVATAR_DIR / old_avatar_path
        if old_file_path.exists():
            try:
                old_file_path.unlink()
            except:
                pass
    
    # Criar ou atualizar perfil
    avatar_url = f"/uploads/avatars/{unique_filename}"
    if profile:
        profile.avatar_url = avatar_url
    else:
        profile = UserProfile(user_id=user_id, avatar_url=avatar_url)
        session.add(profile)
    
    session.commit()
    session.refresh(profile)
    
    return {"message": "Avatar atualizado com sucesso", "avatar_url": avatar_url, "profile": profile}


@router.delete("/{user_id}/avatar")
async def remove_avatar(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Remover avatar do perfil do usuário"""
    # Verificar se o usuário está tentando atualizar seu próprio perfil
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para atualizar este perfil")
    
    # Buscar perfil
    profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
    
    if not profile or not profile.avatar_url:
        raise HTTPException(status_code=404, detail="Avatar não encontrado")
    
    # Deletar arquivo do avatar
    avatar_filename = profile.avatar_url.replace("/uploads/avatars/", "")
    avatar_path = AVATAR_DIR / avatar_filename
    if avatar_path.exists():
        try:
            avatar_path.unlink()
        except Exception as e:
            logger.exception(f"Erro ao deletar arquivo de avatar: {e}")
    
    # Remover URL do avatar do perfil
    profile.avatar_url = None
    session.add(profile)
    session.commit()
    session.refresh(profile)
    
    return {"message": "Avatar removido com sucesso", "profile": profile}

