"""
Rotas relacionadas a usuários.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
import logging

from sqlmodel import Session, select
from sqlalchemy import func
from core.models import User, Follow
from core.schemas import UserCreate, UserRead, UserUpdate
from core.database import get_session
from core.auth import get_current_active_user, get_password_hash

logger = logging.getLogger(__name__)

router = APIRouter(tags=["users"])


@router.post("/users/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(usuario: UserCreate, session: Session = Depends(get_session)):
    logger.info(f"Criando usuário com username: {usuario.username}")
    logger.info(f"Tentativa de criação de usuário: {usuario.username}, {usuario.email}")
    # Verifica se username já existe
    usuario_db = session.exec(select(User).where(User.username == usuario.username)).first()
    if usuario_db:
        raise HTTPException(status_code=400, detail="Username já existe")
    # Verifica se email já existe
    email_db = session.exec(select(User).where(User.email == usuario.email)).first()
    if email_db:
        raise HTTPException(status_code=400, detail="Email já existe")
    usuario_db = User(
        username=usuario.username,
        email=usuario.email,
        hashed_password=get_password_hash(usuario.password)
    )
    logger.info(f"Adicionando usuário à sessão: {usuario.username}")
    session.add(usuario_db)
    try:
        logger.info(f"Fazendo commit do usuário no banco de dados: {usuario.username}")
        session.commit()
    except Exception as exc:
        session.rollback()
        logger.exception(f"Erro ao criar usuário: {usuario.username}", exc_info=True)
        raise HTTPException(status_code=400, detail="Não foi possível criar a conta. Verifique os dados e tente novamente.") from exc
    logger.info(f"Atualizando usuário: {usuario.username}")
    session.refresh(usuario_db)
    logger.info(f"Usuário criado com sucesso: {usuario.username}")
    return usuario_db


@router.get("/users/me/", response_model=UserRead)
async def read_users_me(usuario_atual: User = Depends(get_current_active_user)):
    logger.info(f"Lendo usuário atual: {usuario_atual.username}")
    """Obtém informações do usuário atual"""
    return usuario_atual


@router.put("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int, 
    atualizacao_usuario: UserUpdate, 
    usuario_atual: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    logger.info(f"Atualizando usuário com id: {user_id}")
    
    if usuario_atual.id != user_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para atualizar este perfil")
    
    usuario = session.get(User, user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    tem_alteracoes = atualizacao_usuario.username is not None or atualizacao_usuario.email is not None or atualizacao_usuario.password is not None
    
    if tem_alteracoes:
        if not atualizacao_usuario.current_password or not atualizacao_usuario.current_password.strip():
            raise HTTPException(status_code=400, detail="Senha atual é obrigatória para fazer alterações")
        
        from core.auth import verify_password
        if not verify_password(atualizacao_usuario.current_password.strip(), usuario.hashed_password):
            raise HTTPException(status_code=401, detail="Senha atual incorreta")
    
    if atualizacao_usuario.username is not None:
        username = atualizacao_usuario.username.strip()
        if not username:
            raise HTTPException(status_code=400, detail="Nome de usuário não pode estar vazio")
        usuario_existente = session.exec(select(User).where(User.username == username)).first()
        if usuario_existente and usuario_existente.id != user_id:
            raise HTTPException(status_code=400, detail="Username já está em uso")
        usuario.username = username
    
    if atualizacao_usuario.email is not None:
        email = atualizacao_usuario.email.strip()
        if not email:
            raise HTTPException(status_code=400, detail="Email não pode estar vazio")
        if '@' not in email or '.' not in email.split('@')[1]:
            raise HTTPException(status_code=400, detail="Email inválido")
        usuario_existente = session.exec(select(User).where(User.email == email)).first()
        if usuario_existente and usuario_existente.id != user_id:
            raise HTTPException(status_code=400, detail="Email já está em uso")
        usuario.email = email
    
    if atualizacao_usuario.password is not None:
        senha = atualizacao_usuario.password.strip()
        if len(senha) < 6:
            raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres")
        usuario.hashed_password = get_password_hash(senha)
    
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario


@router.get("/users/search", response_model=List[UserRead])
def search_users(
    consulta: str,
    limit: int = 10,
    session: Session = Depends(get_session),
    usuario_atual: User = Depends(get_current_active_user)
):
    """Busca usuários por username (parcial match)"""
    logger.info(f"Buscando usuários com consulta: {consulta}")
    if not consulta or not consulta.strip():
        return []
    
    consulta_limpa = consulta.strip()
    usuarios = session.exec(
        select(User)
        .where(func.lower(User.username).contains(consulta_limpa.lower()))
        .limit(limit)
    ).all()
    
    return usuarios


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


@router.get("/users/{user_id}/activities", response_model=List[dict])
def get_user_activities(
    user_id: int,
    limit: int = 10,
    session: Session = Depends(get_session)
):
    """Buscar atividades recentes de um usuário (avaliações)"""
    logger.info(f"Obtendo atividades para o usuário {user_id}")
    
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    from models import Rating, Book as DBBook, Movie as DBMovie
    
    ratings = session.exec(
        select(Rating)
        .where(Rating.user_id == user_id)
        .order_by(Rating.created_at.desc())
        .limit(limit)
    ).all()
    
    activities = []
    for rating in ratings:
        activity = {
            "id": rating.id,
            "type": "rating",
            "action": "avaliou",
            "rating": rating.score,
            "comment": rating.comment,
            "created_at": rating.created_at.isoformat() if rating.created_at else None,
        }
        
        if rating.book_id:
            book = session.get(DBBook, rating.book_id)
            if book:
                activity["highlight"] = book.title
                activity["book_id"] = book.id
        elif rating.movie_id:
            movie = session.get(DBMovie, rating.movie_id)
            if movie:
                activity["highlight"] = movie.title
                activity["movie_id"] = movie.id
        
        activities.append(activity)
    
    return activities

