import React, { useState, useEffect } from 'react';
import './Search.css';
import SearchResults from './SearchResults';

const Search = () => {
  const [query, setQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [movieResults, setMovieResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Clear results when query changes
    setBookResults([]);
    setMovieResults([]);
  }, [query]);

  const handleSearch = async () => {
    setLoading(true);
    setError('');

    try {
      const bookResponse = await apiService.getBooksFromBackend(query);
      if (bookResponse.success) {
        setBookResults(bookResponse.data);
      } else {
        setError(bookResponse.error || 'Erro ao buscar livros');
      }

      const movieResponse = await apiService.getMoviesFromBackend(query);
      if (movieResponse.success) {
        setMovieResults(movieResponse.data);
      } else {
        setError(movieResponse.error || 'Erro ao buscar filmes');
      }
    } catch (error) {
      setError('Erro ao realizar a busca.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-container">
      <input
        type="text"
        placeholder="Search for books or movies..."
        className="search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button className="search-button" onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>

      {error && <div className="error-message">{error}</div>}

      {bookResults.length > 0 && (
        <SearchResults results={bookResults} type="book" />
      )}

      {movieResults.length > 0 && (
        <SearchResults results={movieResults} type="movie" />
      )}
    </div>
  );
};

export default Search;
