"""
Rotas relacionadas a avaliações (ratings).
"""
from fastapi import APIRouter, HTTPException, Depends, status, Response
from typing import List, Dict, Any
import logging

from sqlmodel import Session, select
from core.models import User, Rating, Book as DBBook, Movie as DBMovie
from core.schemas import RatingCreate, RatingRead, RatingUpdate
from core.database import get_session
from core.auth import get_current_active_user
from services.api_clients import buscar_detalhes_filme
from services.google_books import obter_livro_por_id
from .utils import omdb_title_to_movie

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ratings"])


@router.post("/ratings/", response_model=RatingRead, status_code=status.HTTP_201_CREATED)
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
        livro_db = session.exec(select(DBBook).where(DBBook.external_id == id_externo)).first()
        if not livro_db:
            livro = None
            try:
                livro = obter_livro_por_id(id_externo)
            except Exception:
                logger.exception("Falha ao buscar detalhes do livro externo %s", id_externo)
            titulo = None
            autores = None
            url_imagem = None
            generos = None
            if livro:
                info_volume = livro.get("volumeInfo", {})
                titulo = info_volume.get("title", "Sem título")
                authors_list = info_volume.get("authors", [])
                if isinstance(authors_list, list) and authors_list:
                    autores = ", ".join(authors_list)
                elif isinstance(authors_list, str):
                    autores = authors_list
                image_links = info_volume.get("imageLinks", {})
                url_imagem = image_links.get("thumbnail") if image_links else None
                categorias = info_volume.get("categories", [])
                generos = categorias if isinstance(categorias, list) else []
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
        filme_db = session.exec(select(DBMovie).where(DBMovie.external_id == id_externo)).first()
        if not filme_db:
            dados_filme = buscar_detalhes_filme(id_externo)
            if dados_filme:
                objeto_filme = omdb_title_to_movie(dados_filme)
                data_lancamento = None
                if objeto_filme.release_date:
                    try:
                        if len(objeto_filme.release_date) == 4:
                            from datetime import date
                            data_lancamento = date(int(objeto_filme.release_date), 1, 1)
                        elif '-' in objeto_filme.release_date:
                            from datetime import datetime
                            data_lancamento = datetime.strptime(objeto_filme.release_date, '%Y-%m-%d').date()
                    except (ValueError, TypeError):
                        pass
                
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


@router.put("/ratings/{rating_id}", response_model=RatingRead)
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


@router.delete("/ratings/{rating_id}", status_code=status.HTTP_204_NO_CONTENT)
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


@router.get("/users/{user_id}/ratings", response_model=List[Dict[str, Any]])
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

