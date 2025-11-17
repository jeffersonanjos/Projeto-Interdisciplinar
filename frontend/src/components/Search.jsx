import React, { useState, useEffect } from 'react';
import './Search.css';
import SearchResults from './SearchResults';
import { externalApiService } from '../services/apiService';

const Search = () => {
  console.log("Search component loaded");
  const [query, setQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState('books'); // 'books' ou 'movies'
  const [movieResults, setMovieResults] = useState([]);
  const [hasSearchedBooks, setHasSearchedBooks] = useState(false);
  const [hasSearchedMovies, setHasSearchedMovies] = useState(false);

  useEffect(() => {
 console.log("Search useEffect called");
    // Clear results when query changes
    setBookResults([]);
    setMovieResults([]);
    setHasSearchedBooks(false);
    setHasSearchedMovies(false);
  }, [query]);

  const handleSearch = async () => {
 console.log("Search handleSearch called with query:", query);
    if (!query.trim()) {
      setError('Digite um termo para buscar.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      if (searchType === 'books') {
        const bookResponse = await externalApiService.getBooksFromBackend(query);
 console.log("Search handleSearch bookResponse:", bookResponse);
        if (bookResponse.success) {
          setBookResults(bookResponse.data);
          setHasSearchedBooks(true);
     console.log("Search handleSearch bookResults set:", bookResponse.data);
        } else {
          setError(bookResponse.error || 'Erro ao buscar livros');
          setBookResults([]);
          setHasSearchedBooks(true);
  console.error("Search handleSearch getBooksFromBackend error:", bookResponse.error);
        }
      } else {
        const movieResponse = await externalApiService.getMoviesFromBackend(query);
        if (movieResponse.success) {
          setMovieResults(movieResponse.data);
          setHasSearchedMovies(true);
        } else {
          setError(movieResponse.error || 'Erro ao buscar filmes');
          setMovieResults([]);
          setHasSearchedMovies(true);
          console.error("Search handleSearch getMoviesFromBackend error:", movieResponse.error);
        }
      }
    } catch (error) {
      setError('Erro ao realizar a busca.');
      console.error("Search handleSearch general error:", error);
    } finally {
      setLoading(false);
   console.log("Search handleSearch loading set to false");
    }
  };
 
  return (
    <div className="search-container">
      <div className="search-form">
        <input
          type="text"
          placeholder={searchType === 'books' ? 'Search for books...' : 'Search for movies...'}
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="search-button" onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {((searchType === 'books' && hasSearchedBooks) || (searchType === 'movies' && hasSearchedMovies)) && (
        <>
          <div className="search-header">
            <h2>{searchType === 'books' ? 'Books' : 'Movies'}</h2>
            <div className="search-type-toggle">
              <button
                className={searchType === 'books' ? 'active' : ''}
                onClick={() => setSearchType('books')}
              >
                Livros ({bookResults.length})
              </button>
              <button
                className={searchType === 'movies' ? 'active' : ''}
                onClick={() => setSearchType('movies')}
              >
                Filmes ({movieResults.length})
              </button>
            </div>
          </div>
          <SearchResults
            results={searchType === 'books' ? bookResults : movieResults}
            type={searchType === 'books' ? 'book' : 'movie'}
          />
        </>
      )}
    </div>
  );
};

export default Search;
