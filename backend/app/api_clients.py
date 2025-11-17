import logging
import os
from typing import Any, Dict, Iterable, List, Optional

import requests

logger = logging.getLogger(__name__)

GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1"
IMDB_BASE_URL = "https://api.imdbapi.dev"
IMDB_ENABLE_FALLBACK = os.getenv("IMDB_ENABLE_FALLBACK", "true").lower() == "true"

IMDB_FALLBACK_RESULTS = [
    {
        "id": "tt0133093",
        "primaryTitle": "The Matrix",
        "originalTitle": "The Matrix",
        "plot": "A computer hacker learns about the true nature of reality and fights to free humanity.",
        "primaryImage": {"url": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"},
        "releaseDate": {"year": 1999, "month": 3, "day": 31},
        "rating": {"aggregateRating": 8.7, "voteCount": 1900000},
        "startYear": 1999,
    },
    {
        "id": "tt0234215",
        "primaryTitle": "The Matrix Reloaded",
        "originalTitle": "The Matrix Reloaded",
        "plot": "Neo, Trinity, and Morpheus continue their war against the machines as a new threat looms.",
        "primaryImage": {"url": "https://image.tmdb.org/t/p/w500/9TGHDvWrqKBzwDxDodHYXEmOE6J.jpg"},
        "releaseDate": {"year": 2003, "month": 5, "day": 15},
        "rating": {"aggregateRating": 7.2, "voteCount": 650000},
        "startYear": 2003,
    },
    {
        "id": "tt0242653",
        "primaryTitle": "The Matrix Revolutions",
        "originalTitle": "The Matrix Revolutions",
        "plot": "Zion defends itself as Neo fights to end the war between humans and machines.",
        "primaryImage": {"url": "https://image.tmdb.org/t/p/w500/fgm8OZ7o4G1G1I9EeGCBiPwXhEu.jpg"},
        "releaseDate": {"year": 2003, "month": 11, "day": 5},
        "rating": {"aggregateRating": 6.7, "voteCount": 500000},
        "startYear": 2003,
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


def _request_imdb(path: str, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Executes a GET request against the IMDb API and handles basic error reporting.
    An optional IMDB_API_KEY env var can be provided, though the public endpoints
    currently work without authentication.
    """
    params = dict(params or {})
    api_key = os.getenv("IMDB_API_KEY")
    if api_key:
        params.setdefault("apiKey", api_key)

    url = f"{IMDB_BASE_URL}{path}"
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
                "IMDb API request failed (%s) attempt %s/3: %s",
                url,
                attempt + 1,
                exc,
            )
            if attempt == 2:
                return {}
            continue

    if isinstance(payload, dict) and "code" in payload and payload.get("code"):
        logger.error(
            "IMDb API error for %s (code=%s): %s",
            path,
            payload.get("code"),
            payload.get("message"),
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
        return IMDB_FALLBACK_RESULTS
    return [
        title for title in IMDB_FALLBACK_RESULTS if lowered in (title.get("primaryTitle", "").lower())
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
    """Fetches movie search results from the IMDb API with filtering options."""
    logger.info("Fetching IMDb titles for query: %s", query)
    if not query:
        return {}

    params: Dict[str, Any] = {"query": query}
    params["limit"] = max(1, min(limit or 20, 50))
    params["types"] = "MOVIE"

    if start_year is not None:
        params["startYear"] = start_year
    if end_year is not None:
        params["endYear"] = end_year

    normalized_genres = _normalize_list_param(genres)
    if normalized_genres:
        params["genres"] = ",".join(normalized_genres)

    if sort_by:
        params["sortBy"] = sort_by
    if sort_order:
        params["sortOrder"] = sort_order

    payload = _request_imdb("/search/titles", params=params)
    titles: List[Dict[str, Any]] = []
    page_info = None
    if isinstance(payload, dict):
        titles = payload.get("titles", []) or []
        page_info = payload.get("pageInfo")

    if not titles and IMDB_ENABLE_FALLBACK:
        titles = _fallback_titles_for_query(query)

    return {
        "results": titles,
        "pageInfo": page_info,
    }


def fetch_movie_details(movie_id: str) -> Dict[str, Any]:
    """Fetches detailed movie information from IMDb by title ID."""
    logger.info("Fetching IMDb title details for id: %s", movie_id)
    if not movie_id:
        return {}

    payload = _request_imdb(f"/titles/{movie_id}")
    if isinstance(payload, dict) and payload:
        return payload

    if IMDB_ENABLE_FALLBACK:
        for title in IMDB_FALLBACK_RESULTS:
            if title.get("id") == movie_id:
                return title
    return {}