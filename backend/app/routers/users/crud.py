"""
Rotas CRUD básicas de usuários (criar, ler, atualizar).
"""
from fastapi import APIRouter, HTTPException, Depends, status
import logging

from sqlmodel import Session, select
from core.models import User
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

