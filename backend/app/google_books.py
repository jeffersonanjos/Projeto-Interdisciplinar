import requests
import os

GOOGLE_BOOKS_API_KEY = "AIzaSyD6kfay7V-d9u87DbQM5O_pNy6a-_J96ek"

def buscar_livros(consulta, tipo_busca="q"):
    """
    Busca livros na API do Google Books com base em uma consulta.

    Args:
        consulta (str): A consulta de busca.
        tipo_busca (str): O tipo de busca (q=geral, title=título, author=autor, isbn=isbn).

    Returns:
        list: Uma lista de dicionários de livros.
    """
    url = f"https://www.googleapis.com/books/v1/volumes?{tipo_busca}={consulta}&key={GOOGLE_BOOKS_API_KEY}"
    try:
        resposta = requests.get(url)
        resposta.raise_for_status()  # Levantar HTTPError para respostas ruins (4xx ou 5xx)
        dados = resposta.json()
        if "items" in dados:
            return dados["items"]
        else:
            return []
    except requests.exceptions.RequestException as erro:
        print(f"Erro durante requisição à API do Google Books: {erro}")
        return []


def obter_livro_por_id(id_livro):
    """
    Obtém um livro da API do Google Books pelo seu ID.

    Args:
        id_livro (str): O ID do livro.

    Returns:
        dict: Um dicionário contendo as informações do livro, ou None se não encontrado.
    """
    url = f"https://www.googleapis.com/books/v1/volumes/{id_livro}?key={GOOGLE_BOOKS_API_KEY}"
    try:
        resposta = requests.get(url)
        resposta.raise_for_status()
        return resposta.json()
    except requests.exceptions.RequestException as erro:
        print(f"Erro durante requisição à API do Google Books: {erro}")
        return None
