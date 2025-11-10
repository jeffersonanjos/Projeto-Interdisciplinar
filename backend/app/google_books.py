import requests
import os

GOOGLE_BOOKS_API_KEY = "AIzaSyD6kfay7V-d9u87DbQM5O_pNy6a-_J96ek"

def search_books(query, search_type="q"):
    """
    Searches the Google Books API for books based on a query.

    Args:
        query (str): The search query.
        search_type (str): The type of search (q=general, title=title, author=author, isbn=isbn).

    Returns:
        list: A list of book dictionaries.
    """
    url = f"https://www.googleapis.com/books/v1/volumes?{search_type}={query}&key={GOOGLE_BOOKS_API_KEY}"
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        data = response.json()
        if "items" in data:
            return data["items"]
        else:
            return []
    except requests.exceptions.RequestException as e:
        print(f"Error during Google Books API request: {e}")
        return []


def get_book_by_id(book_id):
    """
    Retrieves a book from the Google Books API by its ID.

    Args:
        book_id (str): The ID of the book.

    Returns:
        dict: A dictionary containing the book information, or None if not found.
    """
    url = f"https://www.googleapis.com/books/v1/volumes/{book_id}?key={GOOGLE_BOOKS_API_KEY}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error during Google Books API request: {e}")
        return None
