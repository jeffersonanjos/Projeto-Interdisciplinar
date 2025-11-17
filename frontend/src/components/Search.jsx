import React, { useState, useEffect } from 'react';
import './Search.css';
import SearchResults from './SearchResults';
import { externalApiService } from '../services/apiService';

const Search = () => {
  console.log("Search component loaded");
  const [query, setQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [movieResults, setMovieResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState('books'); // 'books' ou 'movies' - agora é apenas um filtro
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    console.log("Search useEffect called");
    // Clear results when query changes
    setBookResults([]);
    setMovieResults([]);
    setHasSearched(false);
    setError('');
  }, [query]);

  const handleSearch = async () => {
    console.log("Search handleSearch called with query:", query);
    if (!query.trim()) {
      setError('Digite um termo para buscar.');
      return;
    }
    
    setLoading(true);
    setLoadingBooks(true);
    setLoadingMovies(true);
    setError('');
    setHasSearched(true);
    setBookResults([]);
    setMovieResults([]);

    // Buscar livros e filmes em paralelo
    // Cada busca atualiza os resultados assim que termina, sem esperar a outra
    const bookPromise = externalApiService.getBooksFromBackend(query)
      .then((bookResponse) => {
        console.log("Search handleSearch bookResponse:", bookResponse);
        if (bookResponse.success) {
          setBookResults(bookResponse.data || []);
          console.log("Search handleSearch bookResults set:", bookResponse.data);
        } else {
          console.error("Search handleSearch getBooksFromBackend error:", bookResponse.error);
          setBookResults([]);
        }
        setLoadingBooks(false);
        return bookResponse;
      })
      .catch((error) => {
        console.error("Search handleSearch book error:", error);
        setBookResults([]);
        setLoadingBooks(false);
        return { success: false, error: error.message };
      });

    const moviePromise = externalApiService.getMoviesFromBackend(query)
      .then((movieResponse) => {
        console.log("Search handleSearch movieResponse:", movieResponse);
        if (movieResponse.success) {
          setMovieResults(movieResponse.data || []);
        } else {
          console.error("Search handleSearch getMoviesFromBackend error:", movieResponse.error);
          setMovieResults([]);
        }
        setLoadingMovies(false);
        return movieResponse;
      })
      .catch((error) => {
        console.error("Search handleSearch movie error:", error);
        setMovieResults([]);
        setLoadingMovies(false);
        return { success: false, error: error.message };
      });

    // Aguardar ambas as buscas terminarem para verificar erros finais
    Promise.all([bookPromise, moviePromise])
      .then(([bookResponse, movieResponse]) => {
        // Verificar se houve erros apenas se ambas falharam
        if (!bookResponse.success && !movieResponse.success) {
          setError('Erro ao buscar livros e filmes. Tente novamente.');
        } else if (!bookResponse.success && movieResponse.success) {
          // Se apenas livros falharam, não mostrar erro (filmes funcionaram)
          console.warn('Busca de livros falhou, mas filmes foram encontrados.');
        } else if (bookResponse.success && !movieResponse.success) {
          // Se apenas filmes falharam, não mostrar erro (livros funcionaram)
          console.warn('Busca de filmes falhou, mas livros foram encontrados.');
        }
        setLoading(false);
        console.log("Search handleSearch loading set to false");
      })
      .catch((error) => {
        setError('Erro ao realizar a busca.');
        console.error("Search handleSearch general error:", error);
        setLoading(false);
        setLoadingBooks(false);
        setLoadingMovies(false);
      });
  };
 
  // Determinar qual resultado mostrar baseado no filtro
  const currentResults = searchType === 'books' ? bookResults : movieResults;
  const currentLoading = searchType === 'books' ? loadingBooks : loadingMovies;
  const currentType = searchType === 'books' ? 'book' : 'movie';

  return (
    <div className="search-container">
      <div className="search-form">
        <input
          type="text"
          placeholder="Buscar livros e filmes..."
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <button className="search-button" onClick={handleSearch} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {hasSearched && (
        <>
          <div className="search-header">
            <h2>Resultados da Busca</h2>
            <div className="search-type-toggle">
              <button
                className={searchType === 'books' ? 'active' : ''}
                onClick={() => setSearchType('books')}
                disabled={loading}
              >
                Livros ({bookResults.length})
                {loadingBooks && <span className="loading-indicator">...</span>}
              </button>
              <button
                className={searchType === 'movies' ? 'active' : ''}
                onClick={() => setSearchType('movies')}
                disabled={loading}
              >
                Filmes ({movieResults.length})
                {loadingMovies && <span className="loading-indicator">...</span>}
              </button>
            </div>
          </div>
          
          {currentLoading ? (
            <div className="loading-message">Carregando {searchType === 'books' ? 'livros' : 'filmes'}...</div>
          ) : (
            <SearchResults
              results={currentResults}
              type={currentType}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Search;
