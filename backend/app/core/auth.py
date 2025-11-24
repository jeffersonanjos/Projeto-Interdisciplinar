from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
import bcrypt
import logging

from core.models import User
from core.database import get_session
from core.schemas import TokenData

# Configurações
SECRET_KEY = "your-secret-key-change-in-production"  # Em produção, use uma chave segura
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

logger = logging.getLogger(__name__)

def _truncate_password(password: str) -> bytes:
    """Trunca a senha para 72 bytes (limite do bcrypt)"""
    password_bytes = password.encode('utf-8')[:72]
    return password_bytes

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha está correta"""
    # bcrypt tem limite de 72 bytes - truncar para o mesmo tamanho usado no hash
    password_bytes = _truncate_password(plain_password)
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def get_password_hash(password: str) -> str:
    """Gera hash da senha"""
    # bcrypt tem limite de 72 bytes para senhas - truncar BYTES (não caracteres)
    password_bytes = _truncate_password(password)
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def get_user_by_username(session: Session, username: str) -> Optional[User]:
    """Busca usuário pelo username"""
    logger.info(f"Buscando usuário por username: {username}")
    return session.exec(select(User).where(User.username == username)).first()

def authenticate_user(session: Session, username: str, password: str) -> Optional[User]:
    """Autentica o usuário"""
    logger.info(f"Autenticando usuário: {username}")
    usuario = get_user_by_username(session, username)
    if not usuario:
        logger.warning(f"Usuário {username} não encontrado")
        return None
    if not verify_password(password, usuario.hashed_password):
        logger.warning(f"Senha inválida para usuário: {username}")
        return None
    logger.info(f"Usuário {username} autenticado com sucesso")
    return usuario

def create_access_token(dados: dict, expires_delta: Optional[timedelta] = None):
    """Cria token JWT"""
    para_codificar = dados.copy()
    if expires_delta:
        expira = datetime.utcnow() + expires_delta
    else:
        expira = datetime.utcnow() + timedelta(minutes=15)
    para_codificar.update({"exp": expira})
    jwt_codificado = jwt.encode(para_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return jwt_codificado

async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    """Obtém o usuário atual baseado no token"""
    excecao_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.warning("Payload do token não contém username")
            raise excecao_credenciais
        dados_token = TokenData(username=username)
    except JWTError:
        logger.exception("JWTError durante decodificação do token")
        raise excecao_credenciais
    
    usuario = get_user_by_username(session, username=dados_token.username)
    if usuario is None:
        logger.warning(f"Usuário {username} não encontrado durante validação do token")
        raise excecao_credenciais
    return usuario

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Obtém o usuário ativo atual"""
    return current_user

