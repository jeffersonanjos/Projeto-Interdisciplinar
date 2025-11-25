from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import router as api_router
from core.database import create_db_and_tables
from core.seed import seed_initial_data
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Sistema de Recomendação de Livros e Filmes",
    description="Backend com FastAPI para cadastro, avaliação, recomendação de livros e filmes",
    version="0.2.0"
)

# Configuração de CORS para permitir requisições do frontend
origins = [
    "http://localhost:5173",  # padrão Vite
    "http://localhost:3000",  # alternativo
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    logger.info("Iniciando a aplicação - on_startup")
    create_db_and_tables()
    logger.info("Banco de dados e tabelas criados")
    seed_initial_data()
    logger.info("Seed inicial executado")
    import os
    logger.info(f"Variáveis de ambiente: {os.environ}")


#  Inclui todas as rotas (agregadas no router principal)
app.include_router(api_router)
logger.info("Rotas incluídas")

# Servir arquivos estáticos (avatares)
if os.path.exists("uploads/avatars"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    logger.info("Endpoint raiz chamado")
    port = int(os.environ.get("PORT", 8001))  # Porta padrão é 8001
    logger.info(f"A porta sendo usada é: {port}")
    logger.info(f"Aplicação rodando na porta: {port}")
    return {"message": "Bem-vindo ao Sistema de Recomendação de Livros e Filmes"}