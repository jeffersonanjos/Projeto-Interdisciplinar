import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import router as api_router
from core.database import create_db_and_tables
from core.seed import seed_initial_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando ciclo de vida da aplicação...")
    try:
        create_db_and_tables()
        logger.info("Banco de dados verificado.")
        seed_initial_data()
        logger.info("Seed de dados executado.")
    except Exception as e:
        logger.error(f"Erro na inicialização: {e}")
    
    yield
    
    logger.info("Encerrando ciclo de vida da aplicação.")


app = FastAPI(
    title="Sistema de Recomendação de Livros e Filmes",
    description="Backend com FastAPI v0.2.1",
    version="0.2.1",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
uploads_dir = os.path.join(base_dir, "uploads")

if os.path.exists(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
    logger.info(f"Diretório de uploads montado: {uploads_dir}")
else:
    logger.warning(f"Diretório de uploads não encontrado em: {uploads_dir}")


@app.get("/")
def root():
    return {
        "message": "Bem-vindo ao Sistema de Recomendação",
        "docs": "/docs",
        "version": app.version
    }