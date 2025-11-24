from sqlmodel import SQLModel, create_engine, Session
from typing import Generator
import os
import logging

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)

def create_db_and_tables():
    logger.info("Criando banco de dados e tabelas")
    SQLModel.metadata.create_all(engine)
    logger.info("Banco de dados e tabelas criados")

def get_session() -> Generator[Session, None, None]:
    logger.info("Criando sessão do banco de dados")
    with Session(engine) as session:
        logger.info("Sessão do banco de dados criada")
        yield session

