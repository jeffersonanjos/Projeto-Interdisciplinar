from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import router as api_router
from database import create_db_and_tables

#  importa as novas rotas
from profile import router as profile_router
from user_reviews import router as user_reviews_router
import logging

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
    logger.info("Starting up the application - on_startup")
    create_db_and_tables()
    logger.info("Database and tables created")
    import os
    logger.info(f"Environment variables: {os.environ}")


#  Inclui as rotas principais e as novas funcionalidades
app.include_router(api_router)
app.include_router(profile_router)
app.include_router(user_reviews_router)
logger.info("Routers included")


@app.get("/")
def root():
    logger.info("Root endpoint called")
    import uvicorn
    port = int(os.environ.get("PORT", 8001))  # Default port is 8000
    logger.info(f"The port being used is: {port}")
    logger.info(f"Application running on port: {port}")
    return {"message": "Bem-vindo ao Sistema de Recomendação de Livros e Filmes"}