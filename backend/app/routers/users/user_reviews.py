"""
Rotas relacionadas a avaliações de usuários (UserReview).
Diferente de ratings que são avaliações de livros/filmes.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from core.models import User, UserReview
from core.database import get_session
from typing import List, Optional

router = APIRouter(prefix="/user-reviews", tags=["Avaliações de Usuários"])


@router.post("/", response_model=UserReview)
def create_user_review(
    author_user_id: int,
    target_user_id: int,
    rating: float,
    comment: Optional[str] = None,
    session: Session = Depends(get_session)
):
    if not 1 <= rating <= 5:
        raise HTTPException(status_code=400, detail="Avaliação deve estar entre 1 e 5")
    if author_user_id == target_user_id:
        raise HTTPException(status_code=400, detail="Usuário não pode avaliar a si mesmo")

    author = session.get(User, author_user_id)
    target = session.get(User, target_user_id)

    if not author or not target:
        raise HTTPException(status_code=404, detail="Usuário autor ou alvo não encontrado")

    review = UserReview(
        author_user_id=author_user_id,
        target_user_id=target_user_id,
        rating=rating,
        comment=comment
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


@router.get("/user/{user_id}", response_model=List[UserReview])
def get_reviews_for_user(user_id: int, session: Session = Depends(get_session)):
    reviews = session.exec(select(UserReview).where(UserReview.target_user_id == user_id)).all()
    return reviews


@router.get("/authored/{user_id}", response_model=List[UserReview])
def get_reviews_by_user(user_id: int, session: Session = Depends(get_session)):
    reviews = session.exec(select(UserReview).where(UserReview.author_user_id == user_id)).all()
    return reviews

