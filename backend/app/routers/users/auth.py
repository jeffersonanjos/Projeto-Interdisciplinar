"""
Rotas de autenticação.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
import logging

from sqlmodel import Session
from core.schemas import UserLogin, Token
from core.database import get_session
from core.auth import (
    authenticate_user, create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    logger.info(f"Tentativa de login para usuário: {form_data.username}")
    """Endpoint de login que retorna token JWT"""
    usuario = authenticate_user(session, form_data.username, form_data.password)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if usuario.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sua conta foi banida e você não pode acessar o sistema",
        )
    
    expiracao_token = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_acesso = create_access_token(
        dados={"sub": usuario.username}, expires_delta=expiracao_token
    )
    return {"access_token": token_acesso, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(login_usuario: UserLogin, session: Session = Depends(get_session)):
    logger.info(f"Tentativa de login para usuário: {login_usuario.username} (JSON)")
    """Endpoint de login alternativo usando JSON"""
    usuario = authenticate_user(session, login_usuario.username, login_usuario.password)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if usuario.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sua conta foi banida e você não pode acessar o sistema",
        )
    
    expiracao_token = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_acesso = create_access_token(
        dados={"sub": usuario.username}, expires_delta=expiracao_token
    )
    return {"access_token": token_acesso, "token_type": "bearer"}

