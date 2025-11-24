from fastapi import APIRouter, HTTPException, Depends, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from typing import List, Optional, Dict, Any
from datetime import timedelta
import logging
from urllib.parse import quote_plus

from models import User, Book as DBBook, Movie as DBMovie, Rating, UserLibrary, UserMovieLibrary, Follow
from sqlmodel import Session, select
from sqlalchemy import func

from api_clients import buscar_dados_livro, buscar_dados_filme, buscar_detalhes_filme
from schemas import Book, Movie, BookRead
from database import get_session
from schemas import (
    UserCreate, UserRead, UserUpdate,
    RatingCreate, RatingRead, RatingUpdate,
    UserLogin, Token
)
from auth import (
    authenticate_user, create_access_token, 
    get_current_active_user, get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_OMDB_SORT = {
    "SORT_BY_POPULARITY",
    "SORT_BY_RELEASE_DATE",
    "SORT_BY_USER_RATING",
    "SORT_BY_USER_RATING_COUNT",
    "SORT_BY_YEAR",
}

VALID_SORT_ORDER = {"ASC", "DESC"}


def _parse_omdb_rating(string_avaliacao: Optional[str]) -> Optional[float]:
    """Converte string de avaliação do OMDb (ex: '8.7') para float."""
    if not string_avaliacao:
        return None
    try:
        return float(string_avaliacao)
    except (ValueError, TypeError):
        return None


def _parse_omdb_votes(string_votos: Optional[str]) -> Optional[int]:
    """Converte string de votos do OMDb (ex: '1,900,000') para int."""
    if not string_votos:
        return None
    try:
        # Remove vírgulas e converte para int
        return int(string_votos.replace(",", ""))
    except (ValueError, TypeError):
        return None


def _omdb_title_to_movie(item: Dict[str, Any]) -> Optional[Movie]:
    """Converte resposta da API do OMDb para schema Movie."""
    from api_clients import buscar_poster_filme_tmdb
    
    # Validar que é realmente um filme (não um livro ou outro tipo)
    tipo_item = item.get("Type", "").lower()
    if tipo_item and tipo_item not in ["movie", "series"]:
        # Se tiver Type definido e não for movie ou series, pular
        return None
    
    imdb_id = item.get("imdbID") or item.get("imdbid") or ""
    
    # Validação adicional: garantir que tem imdbID (característica de filme)
    if not imdb_id:
        # Sem IMDb ID, pode ser que não seja um filme válido
        # Mas vamos permitir se tiver outras características de filme
        if not item.get("Title") and not item.get("Year"):
            return None
    
    titulo = item.get("Title") or "N/A"
    sinopse = item.get("Plot") or item.get("plot") or ""
    # Filtrar "N/A" da sinopse
    if sinopse == "N/A" or not sinopse:
        sinopse = None
    poster = item.get("Poster") or item.get("poster")
    ano = item.get("Year") or item.get("year")
    string_avaliacao = item.get("imdbRating")
    string_votos = item.get("imdbVotes")
    string_genero = item.get("Genre") or item.get("genre") or ""
    
    # Extrair gêneros da string separada por vírgulas
    generos = []
    if string_genero and string_genero != "N/A":
        generos = [g.strip() for g in string_genero.split(",") if g.strip()]
    
    # Estratégia de fallback para pôsteres:
    # 1. Tentar URL original do OMDb (pode ser Amazon, pode estar quebrada)
    # 2. Se não tiver URL original ou for inválida, tentar TMDb (mais confiável)
    # 3. Se tudo falhar, deixar None (frontend usará placeholder)
    caminho_poster = None
    
    # Verificar se a URL original é válida (não é "N/A" e não é vazia)
    if poster and poster != "N/A" and poster.strip() and not poster.startswith("http://ia.media-imdb.com"):
        # URLs do Amazon frequentemente estão quebradas, mas vamos tentar
        # Se começar com http://ia.media-imdb.com, é provável que esteja quebrada
        caminho_poster = poster
    
    # Se não temos URL válida e temos IMDb ID, tentar TMDb
    if not caminho_poster and imdb_id:
        poster_tmdb = buscar_poster_filme_tmdb(imdb_id)
        if poster_tmdb:
            caminho_poster = poster_tmdb
    
    # Parse de avaliação e votos
    avaliacao = _parse_omdb_rating(string_avaliacao)
    contagem_votos = _parse_omdb_votes(string_votos)
    
    # Extrair diretor
    string_diretor = item.get("Director") or item.get("director") or ""
    diretor = string_diretor if string_diretor and string_diretor != "N/A" else None
    
    # Extrair atores (cast)
    string_atores = item.get("Actors") or item.get("actors") or ""
    elenco = []
    if string_atores and string_atores != "N/A":
        elenco = [a.strip() for a in string_atores.split(",") if a.strip()]
    
    return Movie(
        id=str(imdb_id),
        title=titulo,
        overview=sinopse,
        poster_path=caminho_poster if caminho_poster and caminho_poster != "N/A" else None,
        release_date=ano,
        rating=avaliacao,
        vote_count=contagem_votos,
        genres=generos if generos else None,
        director=diretor,
        cast=elenco if elenco else None,
    )

from google_books import buscar_livros as google_buscar_livros, obter_livro_por_id

@router.get("/books/search", response_model=List[BookRead], tags=["books"])
async def search_books(query: str, session: Session = Depends(get_session)):
    logger.info(f"Buscando livros com consulta: {query}")
    livros = google_buscar_livros(query)
    # Converter os livros para schema BookRead
    lista_livros = []
    for livro in livros:
        info_volume = livro.get("volumeInfo", {})
        # Extrair gêneros do campo categories da API do Google Books
        categorias = info_volume.get("categories", [])
        generos = categorias if isinstance(categorias, list) else []
        # Extrair ano de publicação
        data_publicacao = info_volume.get("publishedDate", "")
        # Se for uma data completa, extrair apenas o ano
        if data_publicacao:
            import re
            correspondencia_ano = re.search(r'(\d{4})', data_publicacao) if isinstance(data_publicacao, str) else None
            data_publicacao = correspondencia_ano.group(1) if correspondencia_ano else data_publicacao
        
        dados_livro = BookRead(
            id=livro.get("id", "N/A"),
            title=info_volume.get("title", "N/A"),
            authors=info_volume.get("authors", ["N/A"]),
            description=info_volume.get("description", "N/A"),
            image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
            genres=generos if generos else None,
            published_date=data_publicacao if data_publicacao else None,
        )
        lista_livros.append(dados_livro)
    return lista_livros

@router.get("/books/{book_id}", response_model=BookRead, tags=["books"])
async def get_book(book_id: str, session: Session = Depends(get_session)):
    logger.info(f"Obtendo livro com book_id: {book_id}")
    livro = obter_livro_por_id(book_id)
    if livro:
        info_volume = livro.get("volumeInfo", {})
        # Extrair gêneros do campo categories da API do Google Books
        categorias = info_volume.get("categories", [])
        generos = categorias if isinstance(categorias, list) else []
        # Extrair ano de publicação
        data_publicacao = info_volume.get("publishedDate", "")
        # Se for uma data completa, extrair apenas o ano
        if data_publicacao:
            import re
            correspondencia_ano = re.search(r'(\d{4})', data_publicacao) if isinstance(data_publicacao, str) else None
            data_publicacao = correspondencia_ano.group(1) if correspondencia_ano else data_publicacao
        
        dados_livro = BookRead(
            id=livro.get("id", "N/A"),
            title=info_volume.get("title", "N/A"),
            authors=info_volume.get("authors", ["N/A"]),
            description=info_volume.get("description", "N/A"),
            image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
            genres=generos if generos else None,
            published_date=data_publicacao if data_publicacao else None,
        )
        return dados_livro
    else:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

@router.get("/movies/search", response_model=List[Movie], tags=["movies"])
async def search_movies(
    query: str,
    limit: int = 10,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    genre: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    session: Session = Depends(get_session),
):
    logger.info("OMDb search_movies chamado com query=%s", query)

    sort_by_normalizado = sort_by if sort_by in VALID_OMDB_SORT else None
    sort_order_normalizado = sort_order.upper() if sort_order and sort_order.upper() in VALID_SORT_ORDER else None

    dados_filmes = buscar_dados_filme(
        query,
        limite=limit,
        ano_inicio=start_year,
        ano_fim=end_year,
        generos=[genre] if genre else None,
        ordenar_por=sort_by_normalizado,
        ordem_ordenacao=sort_order_normalizado,
    )
    if not dados_filmes or "results" not in dados_filmes:
        raise HTTPException(status_code=404, detail="Nenhum filme encontrado")

    # Buscar detalhes completos de cada filme para obter gêneros
    # A busca inicial do OMDb (s=query) não retorna gêneros, apenas busca detalhada (i=imdbID)
    import asyncio
    import concurrent.futures
    
    resultados = dados_filmes["results"]
    
    async def buscar_filme_com_detalhes(item: Dict[str, Any]) -> Movie:
        """Busca detalhes completos do filme se tiver IMDb ID"""
        imdb_id = item.get("imdbID") or item.get("imdbid")
        
        if not imdb_id:
            # Sem IMDb ID, retornar resultado da busca inicial
            return _omdb_title_to_movie(item)
        
        # Buscar detalhes completos em thread pool para não bloquear
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            try:
                detalhes = await loop.run_in_executor(
                    executor, 
                    buscar_detalhes_filme, 
                    imdb_id
                )
                # Se encontrou detalhes válidos, usar eles (têm gêneros)
                if detalhes and detalhes.get("Response") == "True":
                    return _omdb_title_to_movie(detalhes)
            except Exception as e:
                logger.warning(f"Erro ao buscar detalhes para {imdb_id}: {e}")
        
        # Se falhou, usar resultado da busca inicial (sem gêneros)
        return _omdb_title_to_movie(item)
    
    # Buscar todos os detalhes em paralelo e filtrar None (itens inválidos)
    filmes = await asyncio.gather(*[buscar_filme_com_detalhes(item) for item in resultados])
    
    # Filtrar resultados None (itens que não são filmes válidos) e remover duplicatas
    ids_vistos = set()
    filmes_validos = []
    for filme in filmes:
        if filme is not None and filme.id:
            # Remover duplicatas baseadas no ID
            if filme.id not in ids_vistos:
                ids_vistos.add(filme.id)
                filmes_validos.append(filme)
    
    return filmes_validos

@router.get("/movies/{external_id}", response_model=Movie, tags=["movies"])
async def get_movie(external_id: str, session: Session = Depends(get_session)):
    logger.info(f"get_movie chamado com external_id: {external_id}")
    dados_filme = buscar_detalhes_filme(external_id)
    if not dados_filme:
        raise HTTPException(status_code=404, detail="Filme não encontrado")

    filme = _omdb_title_to_movie(dados_filme)
    if not filme:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    return filme

@router.post("/users/", response_model=UserRead, status_code=status.HTTP_201_CREATED, tags=["users"])
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
        # Em caso de violação de integridade ou outros erros, retorna 400 genérico
        session.rollback()
        logger.exception(f"Erro ao criar usuário: {usuario.username}", exc_info=True)
        raise HTTPException(status_code=400, detail="Não foi possível criar a conta. Verifique os dados e tente novamente.") from exc
    logger.info(f"Atualizando usuário: {usuario.username}")
    session.refresh(usuario_db)
    logger.info(f"Usuário criado com sucesso: {usuario.username}")
    return usuario_db

@router.post("/token", response_model=Token, tags=["auth"])
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
    expiracao_token = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_acesso = create_access_token(
        dados={"sub": usuario.username}, expires_delta=expiracao_token
    )
    return {"access_token": token_acesso, "token_type": "bearer"}

@router.post("/login", response_model=Token, tags=["auth"])
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
    expiracao_token = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_acesso = create_access_token(
        dados={"sub": usuario.username}, expires_delta=expiracao_token
    )
    return {"access_token": token_acesso, "token_type": "bearer"}

@router.get("/users/me/", response_model=UserRead, tags=["users"])
async def read_users_me(usuario_atual: User = Depends(get_current_active_user)):
    logger.info(f"Lendo usuário atual: {usuario_atual.username}")
    """Obtém informações do usuário atual"""
    return usuario_atual

@router.put("/users/{user_id}", response_model=UserRead, tags=["users"])
def update_user(
    user_id: int, 
    atualizacao_usuario: UserUpdate, 
    usuario_atual: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    logger.info(f"Atualizando usuário com id: {user_id}")
    
    # Verificar se o usuário está tentando atualizar seu próprio perfil
    if usuario_atual.id != user_id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para atualizar este perfil")
    
    usuario = session.get(User, user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar senha atual se houver alterações
    tem_alteracoes = atualizacao_usuario.username is not None or atualizacao_usuario.email is not None or atualizacao_usuario.password is not None
    
    if tem_alteracoes:
        if not atualizacao_usuario.current_password or not atualizacao_usuario.current_password.strip():
            raise HTTPException(status_code=400, detail="Senha atual é obrigatória para fazer alterações")
        
        # Verificar se a senha atual está correta
        from auth import verify_password
        if not verify_password(atualizacao_usuario.current_password.strip(), usuario.hashed_password):
            raise HTTPException(status_code=401, detail="Senha atual incorreta")
    
    # Atualizar campos
    if atualizacao_usuario.username is not None:
        username = atualizacao_usuario.username.strip()
        if not username:
            raise HTTPException(status_code=400, detail="Nome de usuário não pode estar vazio")
        # Verificar se o novo username já existe
        usuario_existente = session.exec(select(User).where(User.username == username)).first()
        if usuario_existente and usuario_existente.id != user_id:
            raise HTTPException(status_code=400, detail="Username já está em uso")
        usuario.username = username
    
    if atualizacao_usuario.email is not None:
        email = atualizacao_usuario.email.strip()
        if not email:
            raise HTTPException(status_code=400, detail="Email não pode estar vazio")
        # Validar formato de email básico
        if '@' not in email or '.' not in email.split('@')[1]:
            raise HTTPException(status_code=400, detail="Email inválido")
        # Verificar se o novo email já existe
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

@router.get("/users/search", response_model=List[UserRead], tags=["users"])
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
    # Busca usuários cujo username contém a consulta (case-insensitive)
    # Usando func.lower para garantir compatibilidade
    usuarios = session.exec(
        select(User)
        .where(func.lower(User.username).contains(consulta_limpa.lower()))
        .limit(limit)
    ).all()
    
    return usuarios

@router.post("/users/{user_id}/follow", tags=["users"])
def follow_user(
    user_id: int,
    usuario_atual: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Seguir um usuário"""
    logger.info(f"Usuário {usuario_atual.id} seguindo usuário {user_id}")
    
    if usuario_atual.id == user_id:
        raise HTTPException(status_code=400, detail="Você não pode seguir a si mesmo")
    
    # Verificar se o usuário existe
    usuario_alvo = session.get(User, user_id)
    if not usuario_alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se já está seguindo
    seguimento_existente = session.exec(
        select(Follow)
        .where(Follow.follower_id == usuario_atual.id)
        .where(Follow.following_id == user_id)
    ).first()
    
    if seguimento_existente:
        raise HTTPException(status_code=400, detail="Você já está seguindo este usuário")
    
    # Criar o seguimento
    seguimento = Follow(
        follower_id=usuario_atual.id,
        following_id=user_id
    )
    session.add(seguimento)
    session.commit()
    session.refresh(seguimento)
    
    return {"message": "Usuário seguido com sucesso", "following": True}

@router.delete("/users/{user_id}/follow", tags=["users"])
def unfollow_user(
    user_id: int,
    usuario_atual: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Parar de seguir um usuário"""
    logger.info(f"Usuário {usuario_atual.id} deixando de seguir usuário {user_id}")
    
    # Verificar se está seguindo
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

@router.get("/users/{user_id}/follow", tags=["users"])
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

@router.get("/users/{user_id}/followers", response_model=List[UserRead], tags=["users"])
def get_followers(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Buscar seguidores de um usuário"""
    logger.info(f"Obtendo seguidores para o usuário {user_id}")
    
    # Verificar se o usuário existe
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar follows onde o usuário é seguido
    follows = session.exec(
        select(Follow)
        .where(Follow.following_id == user_id)
    ).all()
    
    # Buscar informações dos seguidores
    follower_ids = [f.follower_id for f in follows]
    if not follower_ids:
        return []
    
    followers = session.exec(
        select(User)
        .where(User.id.in_(follower_ids))
    ).all()
    
    return followers

@router.get("/users/{user_id}/following", response_model=List[UserRead], tags=["users"])
def get_following(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Buscar usuários que um usuário está seguindo"""
    logger.info(f"Obtendo usuários seguidos pelo usuário {user_id}")
    
    # Verificar se o usuário existe
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar follows onde o usuário é seguidor
    follows = session.exec(
        select(Follow)
        .where(Follow.follower_id == user_id)
    ).all()
    
    # Buscar informações dos seguidos
    following_ids = [f.following_id for f in follows]
    if not following_ids:
        return []
    
    following = session.exec(
        select(User)
        .where(User.id.in_(following_ids))
    ).all()
    
    return following

@router.get("/users/{user_id}/activities", response_model=List[Dict[str, Any]], tags=["users"])
def get_user_activities(
    user_id: int,
    limit: int = 10,
    session: Session = Depends(get_session)
):
    """Buscar atividades recentes de um usuário (avaliações)"""
    logger.info(f"Obtendo atividades para o usuário {user_id}")
    
    # Verificar se o usuário existe
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Buscar avaliações recentes do usuário
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
        
        # Adicionar informações do livro ou filme
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

@router.get("/timeline", response_model=List[Dict[str, Any]], tags=["timeline"])
def get_community_timeline(
    limit: int = 20,
    only_following: bool = False,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Buscar timeline da comunidade (atividades de todos os usuários ou apenas dos seguidos)"""
    logger.info(f"Obtendo timeline da comunidade para o usuário {current_user.id}, apenas_seguindo={only_following}")
    
    # Se only_following=True, buscar apenas atividades dos usuários seguidos
    if only_following:
        # Buscar IDs dos usuários seguidos
        follows = session.exec(
            select(Follow)
            .where(Follow.follower_id == current_user.id)
        ).all()
        following_ids = [f.following_id for f in follows]
        
        if not following_ids:
            return []
        
        # Buscar avaliações dos usuários seguidos
        ratings = session.exec(
            select(Rating)
            .where(Rating.user_id.in_(following_ids))
            .order_by(Rating.created_at.desc())
            .limit(limit)
        ).all()
    else:
        # Buscar avaliações de todos os usuários (exceto o próprio)
        ratings = session.exec(
            select(Rating)
            .where(Rating.user_id != current_user.id)
            .order_by(Rating.created_at.desc())
            .limit(limit)
        ).all()
    
    timeline = []
    for rating in ratings:
        # Buscar informações do usuário
        rating_user = session.get(User, rating.user_id)
        if not rating_user:
            continue
        
        # Buscar perfil do usuário para avatar
        from models import UserProfile as DBUserProfile
        user_profile = session.exec(
            select(DBUserProfile)
            .where(DBUserProfile.user_id == rating.user_id)
        ).first()
        
        activity = {
            "id": rating.id,
            "user_id": rating.user_id,
            "username": rating_user.username,
            "avatar": user_profile.avatar_url if user_profile else None,
            "type": "rating",
            "action": "avaliou",
            "rating": rating.score,
            "comment": rating.comment,
            "created_at": rating.created_at.isoformat() if rating.created_at else None,
        }
        
        # Adicionar informações do livro ou filme
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
        
        timeline.append(activity)
    
    return timeline

@router.post("/ratings/", response_model=RatingRead, status_code=status.HTTP_201_CREATED, tags=["ratings"])
async def create_rating(
    avaliacao: RatingCreate, 
    session: Session = Depends(get_session),
    usuario_atual: User = Depends(get_current_active_user)
):
    logger.info(f"Criando avaliação para usuário: {usuario_atual.username}")
    if not avaliacao.book_id and not avaliacao.movie_id and not getattr(avaliacao, "book_external_id", None) and not getattr(avaliacao, "movie_external_id", None):
        raise HTTPException(status_code=400, detail="Uma avaliação deve estar associada a um livro (id interno ou externo) ou filme (id interno ou externo).")
    
    # Resolver book_external_id para um registro local se necessário
    livro_id_resolvido = avaliacao.book_id
    if not livro_id_resolvido and getattr(avaliacao, "book_external_id", None):
        id_externo = avaliacao.book_external_id
        # verificar se já existe
        livro_db = session.exec(select(DBBook).where(DBBook.external_id == id_externo)).first()
        if not livro_db:
            # buscar detalhes do livro externo e criar registro mínimo
            livro = None
            try:
                livro = await get_book(id_externo, session)
            except Exception:
                logger.exception("Falha ao buscar detalhes do livro externo %s", id_externo)
            titulo = None
            autores = None
            url_imagem = None
            generos = None
            if livro:
                titulo = livro.title
                # livro.authors pode ser lista
                if isinstance(livro.authors, list) and livro.authors:
                    autores = ", ".join(livro.authors)
                elif isinstance(livro.authors, str):
                    autores = livro.authors
                url_imagem = getattr(livro, "image_url", None)
                generos = getattr(livro, "genres", None)
            livro_db = DBBook(
                title=titulo or "Sem título",
                author=autores,
                cover_url=url_imagem,
                external_id=id_externo,
                genres=generos
            )
            session.add(livro_db)
            session.commit()
            session.refresh(livro_db)
        livro_id_resolvido = livro_db.id

    # Resolver movie_external_id para um registro local se necessário
    filme_id_resolvido = avaliacao.movie_id
    if not filme_id_resolvido and getattr(avaliacao, "movie_external_id", None):
        id_externo = avaliacao.movie_external_id
        # verificar se já existe
        filme_db = session.exec(select(DBMovie).where(DBMovie.external_id == id_externo)).first()
        if not filme_db:
            # buscar detalhes do filme externo e criar registro mínimo
            dados_filme = buscar_detalhes_filme(id_externo)
            if dados_filme:
                objeto_filme = _omdb_title_to_movie(dados_filme)
                # Converter release_date de string para date se necessário
                data_lancamento = None
                if objeto_filme.release_date:
                    try:
                        # Tentar parsear como YYYY-MM-DD ou YYYY
                        if len(objeto_filme.release_date) == 4:
                            from datetime import date
                            data_lancamento = date(int(objeto_filme.release_date), 1, 1)
                        elif '-' in objeto_filme.release_date:
                            from datetime import datetime
                            data_lancamento = datetime.strptime(objeto_filme.release_date, '%Y-%m-%d').date()
                    except (ValueError, TypeError):
                        pass
                
                # Extrair gêneros do objeto objeto_filme
                generos = getattr(objeto_filme, "genres", None)
                
                filme_db = DBMovie(
                    title=objeto_filme.title,
                    description=objeto_filme.overview,
                    cover_url=objeto_filme.poster_path,
                    external_id=id_externo,
                    release_date=data_lancamento,
                    genres=generos,
                )
                session.add(filme_db)
                session.commit()
                session.refresh(filme_db)
                filme_id_resolvido = filme_db.id
        else:
            filme_id_resolvido = filme_db.id

    # Usar o ID do usuário autenticado e ids resolvidos
    dados_avaliacao = {
        "user_id": usuario_atual.id,
        "book_id": livro_id_resolvido,
        "movie_id": filme_id_resolvido,
        "score": avaliacao.score,
        "comment": avaliacao.comment,
    }
    
    avaliacao_db = Rating(**dados_avaliacao)
    session.add(avaliacao_db)
    session.commit()
    session.refresh(avaliacao_db)
    return avaliacao_db


@router.put("/ratings/{rating_id}", response_model=RatingRead, tags=["ratings"])
async def update_rating(
    rating_id: int,
    atualizacao_avaliacao: RatingUpdate,
    session: Session = Depends(get_session),
    usuario_atual: User = Depends(get_current_active_user)
):
    logger.info(f"Atualizando avaliação {rating_id} para usuário: {usuario_atual.username}")
    avaliacao_db = session.get(Rating, rating_id)
    if not avaliacao_db:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
    if avaliacao_db.user_id != usuario_atual.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para editar esta avaliação.")

    if atualizacao_avaliacao.score is not None:
        avaliacao_db.score = atualizacao_avaliacao.score
    if atualizacao_avaliacao.comment is not None:
        avaliacao_db.comment = atualizacao_avaliacao.comment or None

    session.add(avaliacao_db)
    session.commit()
    session.refresh(avaliacao_db)
    return avaliacao_db


@router.delete("/ratings/{rating_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["ratings"])
async def delete_rating(
    rating_id: int,
    session: Session = Depends(get_session),
    usuario_atual: User = Depends(get_current_active_user)
):
    logger.info(f"Deletando avaliação {rating_id} para usuário: {usuario_atual.username}")
    avaliacao_db = session.get(Rating, rating_id)
    if not avaliacao_db:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
    if avaliacao_db.user_id != usuario_atual.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para excluir esta avaliação.")

    session.delete(avaliacao_db)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/users/{user_id}/ratings", response_model=List[Dict[str, Any]], tags=["ratings"])
async def get_user_ratings(user_id: int, session: Session = Depends(get_session)):
    logger.info(f"Obtendo avaliações para usuário: {user_id}")
    avaliacoes = session.exec(select(Rating).where(Rating.user_id == user_id)).all()
    avaliacoes_com_id_externo = []
    for avaliacao in avaliacoes:
        dicionario_avaliacao = {
            "id": avaliacao.id,
            "user_id": avaliacao.user_id,
            "book_id": avaliacao.book_id,
            "movie_id": avaliacao.movie_id,
            "score": avaliacao.score,
            "comment": avaliacao.comment,
            "created_at": avaliacao.created_at,
            "book_external_id": None,
            "movie_external_id": None,
        }
        if avaliacao.book_id:
            livro_db = session.get(DBBook, avaliacao.book_id)
            if livro_db and livro_db.external_id:
                dicionario_avaliacao["book_external_id"] = livro_db.external_id
        if avaliacao.movie_id:
            filme_db = session.get(DBMovie, avaliacao.movie_id)
            if filme_db and filme_db.external_id:
                dicionario_avaliacao["movie_external_id"] = filme_db.external_id
        avaliacoes_com_id_externo.append(dicionario_avaliacao)
    return avaliacoes_com_id_externo

@router.get("/books", response_model=List[Book])
async def search_books_public_api(consulta: str):
    logger.info(f"Buscando livros com consulta: {consulta} (API externa)")
    """Busca livros usando a API do Google Books."""
    dados_livros = buscar_dados_livro(consulta)
    if not dados_livros or "items" not in dados_livros:
        raise HTTPException(status_code=404, detail="Nenhum livro encontrado")

    livros = []
    for item in dados_livros["items"]:
        info_volume = item["volumeInfo"]
        livro = Book(
            id=item["id"],
            title=info_volume.get("title", "N/A"),
            authors=info_volume.get("authors", ["N/A"]),
            description=info_volume.get("description", "N/A"),
            image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
        )
        livros.append(livro)
    return livros


@router.get("/movies", response_model=List[Movie])
async def search_movies_public(
    query: str,
    limit: int = 10,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    genre: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
):
    """Busca pública de filmes usando a API do OMDb (não requer autenticação)."""
    normalized_sort_by = sort_by if sort_by in VALID_OMDB_SORT else None
    normalized_sort_order = sort_order.upper() if sort_order and sort_order.upper() in VALID_SORT_ORDER else None

    movie_data = buscar_dados_filme(
        query,
        limite=limit,
        ano_inicio=start_year,
        ano_fim=end_year,
        generos=[genre] if genre else None,
        ordenar_por=normalized_sort_by,
        ordem_ordenacao=normalized_sort_order,
    )
    if not movie_data or "results" not in movie_data:
        raise HTTPException(status_code=404, detail="Nenhum filme encontrado")

    # Buscar detalhes completos de cada filme para obter gêneros
    # A busca inicial do OMDb (s=query) não retorna gêneros, apenas busca detalhada (i=imdbID)
    import asyncio
    import concurrent.futures
    
    results = movie_data["results"]
    
    async def fetch_movie_with_details(item: Dict[str, Any]) -> Optional[Movie]:
        """Busca detalhes completos do filme se tiver IMDb ID"""
        imdb_id = item.get("imdbID") or item.get("imdbid")
        
        if not imdb_id:
            # Sem IMDb ID, retornar resultado da busca inicial
            return _omdb_title_to_movie(item)
        
        # Buscar detalhes completos em thread pool para não bloquear
        loop = asyncio.get_event_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            try:
                details = await loop.run_in_executor(
                    executor, 
                    buscar_detalhes_filme, 
                    imdb_id
                )
                # Se encontrou detalhes válidos, usar eles (têm gêneros)
                if details and details.get("Response") == "True":
                    return _omdb_title_to_movie(details)
            except Exception as e:
                logger.warning(f"Erro ao buscar detalhes para {imdb_id}: {e}")
        
        # Se falhou, usar resultado da busca inicial (sem gêneros)
        return _omdb_title_to_movie(item)
    
    # Buscar todos os detalhes em paralelo e filtrar None (itens inválidos)
    movies = await asyncio.gather(*[fetch_movie_with_details(item) for item in results])
    
    # Filtrar resultados None (itens que não são filmes válidos) e remover duplicatas
    seen_ids = set()
    valid_movies = []
    for m in movies:
        if m is not None and m.id:
            # Remover duplicatas baseadas no ID
            if m.id not in seen_ids:
                seen_ids.add(m.id)
                valid_movies.append(m)
    
    return valid_movies

@router.get("/users/{user_id}/library", response_model=List[BookRead], tags=["library"])
async def get_user_library(user_id: int, session: Session = Depends(get_session)):
    """Obtém a biblioteca de livros do usuário (mantido para compatibilidade com versões anteriores)."""
    logger.info(f"Obtendo biblioteca de livros para o usuário: {user_id}")
    entries = session.exec(select(UserLibrary).where(UserLibrary.user_id == user_id)).all()
    books: List[BookRead] = []
    for entry in entries:
        try:
            book = await get_book(entry.book_external_id, session)
            if book:
                books.append(book)
        except Exception:
            logger.exception("Failed to fetch book details for %s", entry.book_external_id)
    return books

@router.get("/users/{user_id}/library/movies", response_model=List[Movie], tags=["library"])
async def get_user_movie_library(user_id: int, session: Session = Depends(get_session)):
    """Obtém a biblioteca de filmes do usuário."""
    logger.info(f"Obtendo biblioteca de filmes para o usuário: {user_id}")
    entries = session.exec(select(UserMovieLibrary).where(UserMovieLibrary.user_id == user_id)).all()
    movies: List[Movie] = []
    seen_ids = set()
    for entry in entries:
        try:
            movie_data = buscar_detalhes_filme(entry.movie_external_id)
            if movie_data:
                movie = _omdb_title_to_movie(movie_data)
                # Filtrar None e remover duplicatas
                if movie is not None and movie.id and movie.id not in seen_ids:
                    seen_ids.add(movie.id)
                    movies.append(movie)
        except Exception:
            logger.exception("Failed to fetch movie details for %s", entry.movie_external_id)
    return movies

@router.get("/users/{user_id}/reviews", response_model=List[Dict[str, Any]], tags=["reviews"])
async def get_user_reviews(user_id: int, session: Session = Depends(get_session)):
    logger.info(f"Obtendo avaliações para o usuário: {user_id}")
    # Fetch ratings for the user
    ratings = session.exec(select(Rating).where(Rating.user_id == user_id)).all()
    # Enriquecer com external_ids e dados completos do livro/filme
    reviews_with_external = []
    for rating in ratings:
        review_dict = {
            "id": rating.id,
            "user_id": rating.user_id,
            "book_id": rating.book_id,
            "movie_id": rating.movie_id,
            "score": rating.score,
            "rating": rating.score,  # Adicionar alias para compatibilidade
            "comment": rating.comment,
            "created_at": rating.created_at,
            "book_external_id": None,
            "movie_external_id": None,
            "book": None,
            "movie": None,
        }
        if rating.book_id:
            db_book = session.get(DBBook, rating.book_id)
            if db_book:
                if db_book.external_id:
                    review_dict["book_external_id"] = db_book.external_id
                # Incluir dados completos do livro
                review_dict["book"] = {
                    "id": db_book.id,
                    "title": db_book.title,
                    "author": db_book.author,
                    "genres": db_book.genres or [],
                    "genre": ", ".join(db_book.genres) if db_book.genres else None,
                }
        if rating.movie_id:
            db_movie = session.get(DBMovie, rating.movie_id)
            if db_movie:
                if db_movie.external_id:
                    review_dict["movie_external_id"] = db_movie.external_id
                # Incluir dados completos do filme
                review_dict["movie"] = {
                    "id": db_movie.id,
                    "title": db_movie.title,
                    "director": db_movie.director,
                    "genres": db_movie.genres or [],
                    "genre": ", ".join(db_movie.genres) if db_movie.genres else None,
                }
        reviews_with_external.append(review_dict)
    return reviews_with_external

@router.post("/library/add", tags=["library"])
async def add_book_to_library(book_id: Dict[str, str], current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Adicionando livro {book_id} à biblioteca do usuário {current_user.username}")
    id_livro_str = book_id.get("book_id")
    # Verificar se o livro existe
    livro = await get_book(id_livro_str, session)
    if not livro:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    # Verificar se já está na biblioteca
    existente = session.exec(
        select(UserLibrary).where(
            (UserLibrary.user_id == current_user.id) & (UserLibrary.book_external_id == id_livro_str)
        )
    ).first()
    if existente:
        return {"message": "Livro já está na biblioteca"}
    entrada = UserLibrary(user_id=current_user.id, book_external_id=id_livro_str)
    session.add(entrada)
    session.commit()
    session.refresh(entrada)
    return {"message": "Livro adicionado à biblioteca", "book_id": id_livro_str}

@router.delete("/library/remove", tags=["library"])
async def remove_book_from_library(book_id: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Removendo livro {book_id} da biblioteca do usuário {current_user.username}")
    
    # Encontrar a entrada da biblioteca
    entrada_biblioteca = session.exec(
        select(UserLibrary).where(
            (UserLibrary.user_id == current_user.id) & (UserLibrary.book_external_id == book_id)
        )
    ).first()
    
    if not entrada_biblioteca:
        raise HTTPException(status_code=404, detail="Livro não encontrado na biblioteca")
    
    session.delete(entrada_biblioteca)
    session.commit()
    return {"message": "Livro removido da biblioteca", "book_id": book_id}

@router.post("/library/movies/add", tags=["library"])
async def add_movie_to_library(movie_id: Dict[str, str], current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Adicionando filme {movie_id} à biblioteca do usuário {current_user.username}")
    id_filme_str = movie_id.get("movie_id")
    # Verificar se o filme existe
    dados_filme = buscar_detalhes_filme(id_filme_str)
    if not dados_filme:
        raise HTTPException(status_code=404, detail="Filme não encontrado")

    # Verificar se já está na biblioteca
    existente = session.exec(
        select(UserMovieLibrary).where(
            (UserMovieLibrary.user_id == current_user.id) & (UserMovieLibrary.movie_external_id == id_filme_str)
        )
    ).first()
    if existente:
        return {"message": "Filme já está na biblioteca"}
    entrada = UserMovieLibrary(user_id=current_user.id, movie_external_id=id_filme_str)
    session.add(entrada)
    session.commit()
    session.refresh(entrada)
    return {"message": "Filme adicionado à biblioteca", "movie_id": id_filme_str}

@router.delete("/library/movies/remove", tags=["library"])
async def remove_movie_from_library(movie_id: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    logger.info(f"Removendo filme {movie_id} da biblioteca do usuário {current_user.username}")
    
    # Encontrar a entrada da biblioteca
    entrada_biblioteca = session.exec(
        select(UserMovieLibrary).where(
            (UserMovieLibrary.user_id == current_user.id) & (UserMovieLibrary.movie_external_id == movie_id)
        )
    ).first()
    
    if not entrada_biblioteca:
        raise HTTPException(status_code=404, detail="Filme não encontrado na biblioteca")
    
    session.delete(entrada_biblioteca)
    session.commit()
    return {"message": "Filme removido da biblioteca", "movie_id": movie_id}

@router.put("/books/{book_id}/update-genres", tags=["books"])
async def update_book_genres(book_id: int, session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de um livro existente no banco de dados buscando da API do Google Books.
    """
    logger.info(f"Atualizando gêneros do livro com id: {book_id}")
    db_book = session.get(DBBook, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    
    if not db_book.external_id:
        raise HTTPException(status_code=400, detail="Book does not have an external_id")
    
    # Buscar dados atualizados da API
    try:
        book_data = await get_book(db_book.external_id, session)
        if book_data and book_data.genres:
            db_book.genres = book_data.genres
            session.add(db_book)
            session.commit()
            session.refresh(db_book)
            return {"message": "Genres updated successfully", "genres": db_book.genres}
        else:
            return {"message": "No genres found in API response"}
    except Exception as e:
        logger.exception("Erro ao atualizar gêneros do livro")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar gêneros: {str(e)}")

@router.put("/movies/{movie_id}/update-genres", tags=["movies"])
async def update_movie_genres(movie_id: int, session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de um filme existente no banco de dados buscando da API do OMDb.
    """
    logger.info(f"Atualizando gêneros do filme com id: {movie_id}")
    db_movie = session.get(DBMovie, movie_id)
    if not db_movie:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    
    if not db_movie.external_id:
        raise HTTPException(status_code=400, detail="Movie does not have an external_id")
    
    # Buscar dados atualizados da API
    try:
        movie_data = buscar_detalhes_filme(db_movie.external_id)
        if movie_data:
            movie_obj = _omdb_title_to_movie(movie_data)
            if movie_obj and movie_obj.genres:
                db_movie.genres = movie_obj.genres
                session.add(db_movie)
                session.commit()
                session.refresh(db_movie)
                return {"message": "Genres updated successfully", "genres": db_movie.genres}
            else:
                return {"message": "No genres found in API response"}
        else:
            return {"message": "Filme não encontrado na API externa"}
    except Exception as e:
        logger.exception("Erro ao atualizar gêneros do filme")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar gêneros: {str(e)}")

@router.post("/movies/update-all-genres", tags=["movies"])
async def update_all_movies_genres(session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de todos os filmes no banco de dados que têm external_id mas não têm gêneros.
    """
    logger.info("Atualizando gêneros para todos os filmes")
    # Buscar todos os filmes com external_id
    all_movies = session.exec(select(DBMovie).where(DBMovie.external_id.isnot(None))).all()
    
    # Filtrar filmes sem gêneros (None ou lista vazia)
    movies_to_update = [
        movie for movie in all_movies 
        if not movie.genres or (isinstance(movie.genres, list) and len(movie.genres) == 0)
    ]
    
    updated_count = 0
    failed_count = 0
    
    for db_movie in movies_to_update:
        try:
            movie_data = buscar_detalhes_filme(db_movie.external_id)
            if movie_data:
                movie_obj = _omdb_title_to_movie(movie_data)
                if movie_obj and movie_obj.genres:
                    db_movie.genres = movie_obj.genres
                    session.add(db_movie)
                    updated_count += 1
        except Exception as e:
            logger.exception(f"Erro ao atualizar gêneros do filme {db_movie.id}: {e}")
            failed_count += 1
    
    session.commit()
    
    return {
        "message": f"Updated genres for {updated_count} movies",
        "updated_count": updated_count,
        "failed_count": failed_count,
        "total_processed": len(movies_to_update)
    }

@router.post("/books/update-all-genres", tags=["books"])
async def update_all_books_genres(session: Session = Depends(get_session)):
    """
    Atualiza os gêneros de todos os livros no banco de dados que têm external_id mas não têm gêneros.
    """
    logger.info("Atualizando gêneros para todos os livros")
    # Buscar todos os livros com external_id
    all_books = session.exec(select(DBBook).where(DBBook.external_id.isnot(None))).all()
    
    # Filtrar livros sem gêneros (None ou lista vazia)
    books_to_update = [
        book for book in all_books 
        if not book.genres or (isinstance(book.genres, list) and len(book.genres) == 0)
    ]
    
    updated_count = 0
    failed_count = 0
    
    for db_book in books_to_update:
        try:
            book_data = await get_book(db_book.external_id, session)
            if book_data and book_data.genres:
                db_book.genres = book_data.genres
                session.add(db_book)
                updated_count += 1
        except Exception as e:
            logger.exception(f"Erro ao atualizar gêneros do livro {db_book.id}: {e}")
            failed_count += 1
    
    session.commit()
    return {
        "message": "Genres update completed",
        "updated": updated_count,
        "failed": failed_count,
        "total": len(books_to_update)
    }

@router.get("/users/{user_id}/recommendations/books", response_model=List[BookRead], tags=["recommendations"])
async def get_book_recommendations(user_id: int, session: Session = Depends(get_session)):
    """
    Busca recomendações de livros baseadas nos livros da biblioteca pessoal do usuário.
    Usa os gêneros e autores dos livros na biblioteca para encontrar livros similares.
    """
    logger.info(f"Obtendo recomendações de livros para o usuário: {user_id}")
    
    # Buscar livros da biblioteca do usuário
    library_entries = session.exec(select(UserLibrary).where(UserLibrary.user_id == user_id)).all()
    
    if not library_entries:
        logger.info(f"Usuário {user_id} não tem livros na biblioteca")
        return []
    
    # Coletar external_ids e buscar detalhes dos livros
    library_book_ids = [entry.book_external_id for entry in library_entries]
    library_books = []
    all_genres = set()
    all_authors = set()
    
    for external_id in library_book_ids:
        try:
            book_data = await get_book(external_id, session)
            if book_data:
                library_books.append(book_data)
                # Coletar gêneros
                if book_data.genres:
                    all_genres.update(book_data.genres)
                # Coletar autores
                if book_data.authors:
                    if isinstance(book_data.authors, list):
                        all_authors.update(book_data.authors)
                    else:
                        all_authors.add(book_data.authors)
        except Exception as e:
            logger.exception(f"Erro ao buscar livro {external_id} para recomendações: {e}")
    
    if not all_genres and not all_authors:
        logger.info(f"Nenhum gênero ou autor encontrado na biblioteca do usuário {user_id}")
        return []
    
    # Buscar livros similares baseado nos gêneros e autores
    recommended_books = []
    seen_book_ids = set(library_book_ids)  # Para evitar recomendar livros já na biblioteca
    
    # Buscar por gêneros
    for genre in list(all_genres)[:3]:  # Limitar a 3 gêneros para não fazer muitas requisições
        try:
            # Buscar livros do mesmo gênero
            # Codificar apenas o valor do gênero, mantendo o prefixo "subject:"
            encoded_genre = quote_plus(genre)
            consulta_busca = f"subject:{encoded_genre}"
            livros = google_buscar_livros(consulta_busca)
            
            for livro in livros[:10]:  # Limitar a 10 livros por gênero
                id_livro = livro.get("id")
                if id_livro and id_livro not in seen_book_ids:
                    seen_book_ids.add(id_livro)
                    info_volume = livro.get("volumeInfo", {})
                    categorias = info_volume.get("categories", [])
                    generos = categorias if isinstance(categorias, list) else []
                    
                    livro_lido = BookRead(
                        id=id_livro,
                        title=info_volume.get("title", "N/A"),
                        authors=info_volume.get("authors", ["N/A"]),
                        description=info_volume.get("description", "N/A"),
                        image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
                        genres=generos if generos else None,
                    )
                    recommended_books.append(livro_lido)
        except Exception as e:
            logger.exception(f"Erro ao buscar livros por gênero {genre}: {e}")
    
    # Buscar por autores (se ainda não tivermos muitas recomendações)
    if len(recommended_books) < 20:
        for author in list(all_authors)[:2]:  # Limitar a 2 autores
            try:
                # Codificar apenas o valor do autor, mantendo o prefixo "inauthor:"
                encoded_author = quote_plus(author)
                consulta_busca = f"inauthor:{encoded_author}"
                livros = google_buscar_livros(consulta_busca)
                
                for livro in livros[:10]:  # Limitar a 10 livros por autor
                    id_livro = livro.get("id")
                    if id_livro and id_livro not in seen_book_ids:
                        seen_book_ids.add(id_livro)
                        info_volume = livro.get("volumeInfo", {})
                        categorias = info_volume.get("categories", [])
                        generos = categorias if isinstance(categorias, list) else []
                        
                        livro_lido = BookRead(
                            id=id_livro,
                            title=info_volume.get("title", "N/A"),
                            authors=info_volume.get("authors", ["N/A"]),
                            description=info_volume.get("description", "N/A"),
                            image_url=info_volume.get("imageLinks", {}).get("thumbnail", None),
                            genres=generos if generos else None,
                        )
                        recommended_books.append(livro_lido)
                        
                        if len(recommended_books) >= 30:  # Limitar total de recomendações
                            break
            except Exception as e:
                logger.exception(f"Erro ao buscar livros por autor {author}: {e}")
            
            if len(recommended_books) >= 30:
                break
    
    # Limitar e retornar recomendações
    return recommended_books[:30]

@router.get("/users/{user_id}/recommendations/movies", response_model=List[Movie], tags=["recommendations"])
async def get_movie_recommendations(user_id: int, session: Session = Depends(get_session)):
    """
    Busca recomendações de filmes baseadas nos filmes da biblioteca pessoal do usuário.
    Usa os gêneros dos filmes na biblioteca para encontrar filmes similares.
    """
    logger.info(f"Obtendo recomendações de filmes para o usuário: {user_id}")
    
    # Buscar filmes da biblioteca do usuário
    library_entries = session.exec(select(UserMovieLibrary).where(UserMovieLibrary.user_id == user_id)).all()
    
    if not library_entries:
        logger.info(f"Usuário {user_id} não tem filmes na biblioteca")
        return []
    
    # Coletar external_ids e buscar detalhes dos filmes
    library_movie_ids = [entry.movie_external_id for entry in library_entries]
    library_movies = []
    all_genres = set()
    
    for external_id in library_movie_ids:
        try:
            movie_data = buscar_detalhes_filme(external_id)
            if movie_data:
                movie_obj = _omdb_title_to_movie(movie_data)
                if movie_obj:
                    library_movies.append(movie_obj)
                # Coletar gêneros do filme
                # OMDb retorna gêneros como string separada por vírgulas
                genres_str = movie_data.get("Genre") or movie_data.get("genre", "")
                if genres_str:
                    genres_list = [g.strip() for g in genres_str.split(",") if g.strip()]
                    all_genres.update(genres_list)
        except Exception as e:
            logger.exception(f"Erro ao buscar filme {external_id} para recomendações: {e}")
    
    if not all_genres:
        logger.info(f"Nenhum gênero encontrado na biblioteca de filmes do usuário {user_id}")
        return []
    
    # Buscar filmes similares baseado nos gêneros
    recommended_movies = []
    seen_movie_ids = set(library_movie_ids)  # Para evitar recomendar filmes já na biblioteca
    
    # Buscar por gêneros (usar o primeiro gênero mais comum)
    # OMDb não suporta busca por gênero diretamente, então vamos buscar por títulos populares
    # e filtrar por gênero nos resultados
    for genre in list(all_genres)[:3]:  # Limitar a 3 gêneros
        try:
            # Buscar filmes populares e filtrar por gênero
            # Usar busca genérica e depois filtrar resultados
            resultados_busca = buscar_dados_filme(genre, limite=20)
            if resultados_busca and "results" in resultados_busca:
                for movie_item in resultados_busca["results"][:15]:
                    movie_id = movie_item.get("imdbID")
                    if movie_id and movie_id not in seen_movie_ids:
                        # Verificar se o filme tem o gênero desejado
                        movie_genres_str = movie_item.get("Genre", "")
                        if movie_genres_str and genre.lower() in movie_genres_str.lower():
                            seen_movie_ids.add(movie_id)
                            movie_obj = _omdb_title_to_movie(movie_item)
                            if movie_obj:
                                recommended_movies.append(movie_obj)
                            
                            if len(recommended_movies) >= 30:
                                break
        except Exception as e:
            logger.exception(f"Erro ao buscar filmes por gênero {genre}: {e}")
        
        if len(recommended_movies) >= 30:
            break
    
    # Se ainda não tivermos muitas recomendações, buscar filmes populares em geral
    if len(recommended_movies) < 20:
        try:
            # Buscar filmes populares (usar termos genéricos)
            popular_terms = ["action", "drama", "comedy", "thriller"]
            for term in popular_terms[:2]:
                resultados_busca = buscar_dados_filme(term, limite=15)
                if resultados_busca and "results" in resultados_busca:
                    for movie_item in resultados_busca["results"]:
                        movie_id = movie_item.get("imdbID")
                        if movie_id and movie_id not in seen_movie_ids:
                            seen_movie_ids.add(movie_id)
                            movie_obj = _omdb_title_to_movie(movie_item)
                            if movie_obj:
                                recommended_movies.append(movie_obj)
                            
                            if len(recommended_movies) >= 30:
                                break
                if len(recommended_movies) >= 30:
                    break
        except Exception as e:
            logger.exception(f"Erro ao buscar filmes populares: {e}")
    
    # Limitar e retornar recomendações
    return recommended_movies[:30]