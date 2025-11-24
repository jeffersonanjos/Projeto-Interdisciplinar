"""
Funções auxiliares compartilhadas entre os routers.
"""
from typing import Optional, Dict, Any
from core.schemas import Movie
from services.api_clients import buscar_poster_filme_tmdb, buscar_detalhes_filme

VALID_OMDB_SORT = {
    "SORT_BY_POPULARITY",
    "SORT_BY_RELEASE_DATE",
    "SORT_BY_USER_RATING",
    "SORT_BY_USER_RATING_COUNT",
    "SORT_BY_YEAR",
}

VALID_SORT_ORDER = {"ASC", "DESC"}


def parse_omdb_rating(string_avaliacao: Optional[str]) -> Optional[float]:
    """Converte string de avaliação do OMDb (ex: '8.7') para float."""
    if not string_avaliacao:
        return None
    try:
        return float(string_avaliacao)
    except (ValueError, TypeError):
        return None


def parse_omdb_votes(string_votos: Optional[str]) -> Optional[int]:
    """Converte string de votos do OMDb (ex: '1,900,000') para int."""
    if not string_votos:
        return None
    try:
        # Remove vírgulas e converte para int
        return int(string_votos.replace(",", ""))
    except (ValueError, TypeError):
        return None


def omdb_title_to_movie(item: Dict[str, Any]) -> Optional[Movie]:
    """Converte resposta da API do OMDb para schema Movie."""
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
    avaliacao = parse_omdb_rating(string_avaliacao)
    contagem_votos = parse_omdb_votes(string_votos)
    
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

