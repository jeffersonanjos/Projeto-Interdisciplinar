import logging
import os
from typing import Any, Dict, Iterable, List, Optional

import requests

logger = logging.getLogger(__name__)

GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1"
OMDB_BASE_URL = "http://www.omdbapi.com"
OMDB_POSTER_BASE_URL = "http://img.omdbapi.com"  # API de pôsteres do OMDb
OMDB_API_KEY = os.getenv("OMDB_API_KEY", "a3f0b40b")
OMDB_ENABLE_FALLBACK = os.getenv("OMDB_ENABLE_FALLBACK", "true").lower() == "true"

# TMDb API para pôsteres (mais confiável que OMDb)
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"  # URL base para imagens do TMDb
TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")  # Opcional: requer cadastro gratuito em themoviedb.org

OMDB_FALLBACK_RESULTS = [
    {
        "imdbID": "tt0133093",
        "Title": "The Matrix",
        "Plot": "A computer hacker learns about the true nature of reality and fights to free humanity.",
        "Poster": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
        "Year": "1999",
        "imdbRating": "8.7",
        "imdbVotes": "1,900,000",
    },
    {
        "imdbID": "tt0234215",
        "Title": "The Matrix Reloaded",
        "Plot": "Neo, Trinity, and Morpheus continue their war against the machines as a new threat looms.",
        "Poster": "https://image.tmdb.org/t/p/w500/9TGHDvWrqKBzwDxDodHYXEmOE6J.jpg",
        "Year": "2003",
        "imdbRating": "7.2",
        "imdbVotes": "650,000",
    },
    {
        "imdbID": "tt0242653",
        "Title": "The Matrix Revolutions",
        "Plot": "Zion defends itself as Neo fights to end the war between humans and machines.",
        "Poster": "https://image.tmdb.org/t/p/w500/fgm8OZ7o4G1G1I9EeGCBiPwXhEu.jpg",
        "Year": "2003",
        "imdbRating": "6.7",
        "imdbVotes": "500,000",
    },
]


def buscar_dados_livro(consulta: str) -> Dict[str, Any]:
    """Busca dados de livros da API do Google Books com base em uma consulta de busca."""
    params = {"q": consulta}
    try:
        resposta = requests.get(
            f"{GOOGLE_BOOKS_BASE_URL}/volumes",
            params=params,
            timeout=10,
        )
        resposta.raise_for_status()
        return resposta.json()
    except requests.exceptions.RequestException as exc:
        logger.exception("Erro ao buscar dados de livros do Google Books: %s", exc)
        return {}


def _request_omdb(params: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Executa uma requisição GET na API do OMDb e trata relatórios básicos de erro.
    Requer variável de ambiente OMDB_API_KEY ou usa chave padrão.
    """
    params = dict(params or {})
    params.setdefault("apikey", OMDB_API_KEY)
    params.setdefault("r", "json")  # Retornar formato JSON

    url = OMDB_BASE_URL
    payload: Any = {}
    for attempt in range(3):
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            payload = response.json()
            break
        except requests.exceptions.RequestException as exc:
            logger.warning(
                "OMDb API request failed (%s) attempt %s/3: %s",
                url,
                attempt + 1,
                exc,
            )
            if attempt == 2:
                return {}
            continue

    if isinstance(payload, dict) and payload.get("Response") == "False":
        error_msg = payload.get("Error", "Unknown error")
        logger.error(
            "OMDb API error: %s",
            error_msg,
        )
        return {}

    return payload  # type: ignore[return-value]


def _normalize_list_param(value: Optional[Iterable[str]]) -> Optional[List[str]]:
    if not value:
        return None
    return [item for item in value if item]


def _fallback_titles_for_query(query: str) -> List[Dict[str, Any]]:
    lowered = (query or "").lower()
    if not lowered:
        return OMDB_FALLBACK_RESULTS
    return [
        title for title in OMDB_FALLBACK_RESULTS if lowered in (title.get("Title", "").lower())
    ]


def buscar_dados_filme(
    consulta: str,
    *,
    limite: int = 20,
    ano_inicio: Optional[int] = None,
    ano_fim: Optional[int] = None,
    generos: Optional[Iterable[str]] = None,
    ordenar_por: Optional[str] = None,
    ordem_ordenacao: Optional[str] = None,
) -> Dict[str, Any]:
    """Busca resultados de filmes da API do OMDb com opções de filtro."""
    logger.info("Buscando títulos do OMDb para consulta: %s", consulta)
    if not consulta:
        return {}

    params: Dict[str, Any] = {"s": consulta}
    params["type"] = "movie"

    if ano_inicio is not None:
        params["y"] = ano_inicio
    # OMDb não suporta ano_fim diretamente, mas podemos filtrar resultados

    # OMDb não suporta generos, ordenar_por ou ordem_ordenacao na busca
    # Esses parâmetros são ignorados mas mantidos para compatibilidade da API

    # A API do OMDb retorna 10 resultados por página por padrão
    # Podemos precisar buscar múltiplas páginas para obter o limite solicitado
    todos_resultados: List[Dict[str, Any]] = []
    pagina = 1
    max_paginas = min((limite // 10) + 1, 10)  # OMDb free tier limita a 10 páginas
    info_pagina = None
    
    while len(todos_resultados) < limite and pagina <= max_paginas:
        params_pagina = params.copy()
        params_pagina["page"] = pagina
        
        payload = _request_omdb(params=params_pagina)
        
        if isinstance(payload, dict) and payload.get("Response") == "True":
            resultados_busca = payload.get("Search", []) or []
            if not resultados_busca:
                break  # Sem mais resultados
            
            # Obter info_pagina da primeira requisição
            if pagina == 1:
                total_resultados = payload.get("totalResults", "0")
                try:
                    total = int(total_resultados)
                    info_pagina = {"totalResults": total}
                except (ValueError, TypeError):
                    pass
            
            todos_resultados.extend(resultados_busca)
            pagina += 1
        else:
            break  # Erro ou sem mais resultados
    
    # Filtrar por ano_fim se fornecido
    if ano_fim is not None:
        resultados_filtrados = []
        for titulo in todos_resultados:
            ano_str = titulo.get("Year", "")
            if ano_str:
                try:
                    # Extrair ano da string (pode ser "1999" ou "1999-2000")
                    ano = int(ano_str.split("-")[0])
                    if ano <= ano_fim:
                        resultados_filtrados.append(titulo)
                except (ValueError, TypeError):
                    pass
        todos_resultados = resultados_filtrados
    
    # Limitar ao limite solicitado
    titulos = todos_resultados[:limite]

    if not titulos and OMDB_ENABLE_FALLBACK:
        titulos = _fallback_titles_for_query(consulta)

    return {
        "results": titulos,
        "pageInfo": info_pagina,
    }


def buscar_poster_filme_tmdb(id_imdb: str) -> Optional[str]:
    """
    Busca o pôster de um filme no TMDb usando o IMDb ID.
    Retorna a URL do pôster ou None se não encontrar.
    """
    if not TMDB_API_KEY or not id_imdb:
        return None
    
    try:
        # TMDb permite buscar por IMDb ID externo
        url = f"{TMDB_BASE_URL}/find/{id_imdb}"
        params = {
            "api_key": TMDB_API_KEY,
            "external_source": "imdb_id"
        }
        resposta = requests.get(url, params=params, timeout=5)
        resposta.raise_for_status()
        dados = resposta.json()
        
        # TMDb retorna resultados em movie_results
        resultados_filmes = dados.get("movie_results", [])
        if resultados_filmes:
            caminho_poster = resultados_filmes[0].get("poster_path")
            if caminho_poster:
                return f"{TMDB_IMAGE_BASE_URL}{caminho_poster}"
    except Exception as exc:
        logger.debug("Falha ao buscar pôster do TMDb para %s: %s", id_imdb, exc)
    
    return None


def buscar_detalhes_filme(id_filme: str) -> Dict[str, Any]:
    """Busca informações detalhadas de filme do OMDb por IMDb ID."""
    logger.info("Buscando detalhes do título do OMDb para id: %s", id_filme)
    if not id_filme:
        return {}

    # OMDb usa parâmetro 'i' para IMDb ID
    params = {"i": id_filme, "plot": "full"}  # Usar sinopse completa para detalhes
    
    payload = _request_omdb(params=params)
    if isinstance(payload, dict) and payload.get("Response") == "True":
        return payload

    if OMDB_ENABLE_FALLBACK:
        for titulo in OMDB_FALLBACK_RESULTS:
            if titulo.get("imdbID") == id_filme:
                return titulo
    return {}

