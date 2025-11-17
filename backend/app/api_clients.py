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
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"  # Base URL para imagens do TMDb
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


def fetch_book_data(query: str) -> Dict[str, Any]:
    """Fetches book data from the Google Books API based on a search query."""
    params = {"q": query}
    try:
        response = requests.get(
            f"{GOOGLE_BOOKS_BASE_URL}/volumes",
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as exc:
        logger.exception("Error fetching book data from Google Books: %s", exc)
        return {}


def _request_omdb(params: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Executes a GET request against the OMDb API and handles basic error reporting.
    Requires OMDB_API_KEY env var or uses default key.
    """
    params = dict(params or {})
    params.setdefault("apikey", OMDB_API_KEY)
    params.setdefault("r", "json")  # Return JSON format

    url = OMDB_BASE_URL
    last_error: Optional[Exception] = None
    payload: Any = {}
    for attempt in range(3):
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            payload = response.json()
            break
        except requests.exceptions.RequestException as exc:
            last_error = exc
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


def fetch_movie_data(
    query: str,
    *,
    limit: int = 20,
    start_year: Optional[int] = None,
    end_year: Optional[int] = None,
    genres: Optional[Iterable[str]] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetches movie search results from the OMDb API with filtering options."""
    logger.info("Fetching OMDb titles for query: %s", query)
    if not query:
        return {}

    params: Dict[str, Any] = {"s": query}
    params["type"] = "movie"

    if start_year is not None:
        params["y"] = start_year
    # OMDb doesn't support end_year directly, but we can filter results

    # OMDb doesn't support genres, sort_by, or sort_order in search
    # These parameters are ignored but kept for API compatibility

    # OMDb API returns 10 results per page by default
    # We may need to fetch multiple pages to get the requested limit
    all_results: List[Dict[str, Any]] = []
    page = 1
    max_pages = min((limit // 10) + 1, 10)  # OMDb free tier limits to 10 pages
    page_info = None
    
    while len(all_results) < limit and page <= max_pages:
        params_page = params.copy()
        params_page["page"] = page
        
        payload = _request_omdb(params=params_page)
        
        if isinstance(payload, dict) and payload.get("Response") == "True":
            search_results = payload.get("Search", []) or []
            if not search_results:
                break  # No more results
            
            # Get page_info from first request
            if page == 1:
                total_results = payload.get("totalResults", "0")
                try:
                    total = int(total_results)
                    page_info = {"totalResults": total}
                except (ValueError, TypeError):
                    pass
            
            all_results.extend(search_results)
            page += 1
        else:
            break  # Error or no more results
    
    # Filter by end_year if provided
    if end_year is not None:
        filtered_results = []
        for t in all_results:
            year_str = t.get("Year", "")
            if year_str:
                try:
                    # Extract year from string (could be "1999" or "1999-2000")
                    year = int(year_str.split("-")[0])
                    if year <= end_year:
                        filtered_results.append(t)
                except (ValueError, TypeError):
                    pass
        all_results = filtered_results
    
    # Limit to requested limit
    titles = all_results[:limit]

    if not titles and OMDB_ENABLE_FALLBACK:
        titles = _fallback_titles_for_query(query)

    return {
        "results": titles,
        "pageInfo": page_info,
    }


def fetch_movie_poster_from_tmdb(imdb_id: str) -> Optional[str]:
    """
    Busca o pôster de um filme no TMDb usando o IMDb ID.
    Retorna a URL do pôster ou None se não encontrar.
    """
    if not TMDB_API_KEY or not imdb_id:
        return None
    
    try:
        # TMDb permite buscar por IMDb ID externo
        url = f"{TMDB_BASE_URL}/find/{imdb_id}"
        params = {
            "api_key": TMDB_API_KEY,
            "external_source": "imdb_id"
        }
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # TMDb retorna resultados em movie_results
        movie_results = data.get("movie_results", [])
        if movie_results:
            poster_path = movie_results[0].get("poster_path")
            if poster_path:
                return f"{TMDB_IMAGE_BASE_URL}{poster_path}"
    except Exception as exc:
        logger.debug("TMDb poster fetch failed for %s: %s", imdb_id, exc)
    
    return None


def fetch_movie_details(movie_id: str) -> Dict[str, Any]:
    """Fetches detailed movie information from OMDb by IMDb ID."""
    logger.info("Fetching OMDb title details for id: %s", movie_id)
    if not movie_id:
        return {}

    # OMDb uses 'i' parameter for IMDb ID
    params = {"i": movie_id, "plot": "full"}  # Use full plot for details
    
    payload = _request_omdb(params=params)
    if isinstance(payload, dict) and payload.get("Response") == "True":
        return payload

    if OMDB_ENABLE_FALLBACK:
        for title in OMDB_FALLBACK_RESULTS:
            if title.get("imdbID") == movie_id:
                return title
    return {}