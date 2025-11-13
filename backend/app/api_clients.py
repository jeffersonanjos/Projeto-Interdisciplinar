import requests
from typing import Dict, Any

def fetch_book_data(query: str) -> Dict[str, Any]:
    """Fetches book data from the Google Books API based on a search query."""
    try:
        response = requests.get(
            f"https://www.googleapis.com/books/v1/volumes?q={query}"
        )
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching book data: {e}")
        return {}

def fetch_movie_data(query: str) -> Dict[str, Any]:
    """Fetches movie data from the TMDB API based on a search query."""
    logger.info(f"fetch_movie_data called with query: {query}")
    try:
        # Replace 'YOUR_TMDB_BEARER_TOKEN' with your actual TMDB bearer token
        bearer_token = "YOUR_TMDB_BEARER_TOKEN"
        headers = {"Authorization": f"Bearer {bearer_token}"}
        response = requests.get(
            f"https://api.themoviedb.org/3/search/movie?query={query}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching movie data: {e}")
        return {}