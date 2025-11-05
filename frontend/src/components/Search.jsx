import React, { useState } from 'react';
import { bookService, movieService, externalApiService } from '../services/apiService';
import './Search.css';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('books'); // 'books' ou 'movies'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Por favor, digite um termo de busca');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      if (searchType === 'books') {
        // Buscar na API externa (Google Books)
        const result = await externalApiService.searchBooks(searchQuery);
        if (result.success) {
          setResults(result.data);
        } else {
          setError(result.error);
        }
      } else {
        // Buscar filmes (quando a API estiver configurada)
        const result = await externalApiService.searchMovies(searchQuery);
        if (result.success) {
          setResults(result.data);
        } else {
          setError(result.error || 'Busca de filmes ainda não configurada');
        }
      }
    } catch (err) {
      setError('Erro inesperado ao buscar');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLibrary = async (item) => {
    try {
      if (searchType === 'books') {
        const result = await bookService.createBook(item);
        if (result.success) {
          alert('Livro adicionado à biblioteca!');
        } else {
          alert('Erro ao adicionar livro: ' + result.error);
        }
      } else {
        const result = await movieService.createMovie(item);
        if (result.success) {
          alert('Filme adicionado à biblioteca!');
        } else {
          alert('Erro ao adicionar filme: ' + result.error);
        }
      }
    } catch (err) {
      alert('Erro ao adicionar à biblioteca');
    }
  };

  return (
    <div className="search-container">
      <div className="search-header">
        <h2>Buscar {searchType === 'books' ? 'Livros' : 'Filmes'}</h2>
        <div className="search-type-toggle">
          <button
            className={searchType === 'books' ? 'active' : ''}
            onClick={() => {
              setSearchType('books');
              setResults([]);
              setSearchQuery('');
            }}
          >
            Livros
          </button>
          <button
            className={searchType === 'movies' ? 'active' : ''}
            onClick={() => {
              setSearchType('movies');
              setResults([]);
              setSearchQuery('');
            }}
          >
            Filmes
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Buscar ${searchType === 'books' ? 'livros' : 'filmes'}...`}
            className="search-input"
          />
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          <h3>Resultados ({results.length})</h3>
          <div className="results-grid">
            {results.map((item, index) => (
              <div key={index} className="result-card">
                {item.cover_url && (
                  <img src={item.cover_url} alt={item.title} className="result-cover" />
                )}
                <div className="result-info">
                  <h4>{item.title}</h4>
                  <p className="result-author">
                    {searchType === 'books' ? item.author : item.director || 'Diretor desconhecido'}
                  </p>
                  {item.description && (
                    <p className="result-description">
                      {item.description.length > 150 
                        ? item.description.substring(0, 150) + '...' 
                        : item.description}
                    </p>
                  )}
                  <button
                    onClick={() => handleAddToLibrary(item)}
                    className="add-button"
                  >
                    Adicionar à Biblioteca
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && searchQuery && !error && (
        <div className="no-results">
          <p>Nenhum resultado encontrado para "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default Search;

