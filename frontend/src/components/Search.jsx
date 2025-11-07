import React, { useState, useEffect } from 'react';
import './Search.css';
import SearchResults from './SearchResults';
import * as apiService from '../services/apiService';

const Search = () => {
  console.log("Search component loaded");
  const [query, setQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [movieResults, setMovieResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
	console.log("Search useEffect called");
    // Clear results when query changes
    setBookResults([]);
    setMovieResults([]);
  }, [query]);

  const handleSearch = async () => {
	console.log("Search handleSearch called with query:", query);
    setLoading(true);
    setError('');

    try {
      const bookResponse = await apiService.getBooksFromBackend(query);
	  console.log("Search handleSearch bookResponse:", bookResponse);
      if (bookResponse.success) {
        setBookResults(bookResponse.data);
		console.log("Search handleSearch bookResults set:", bookResponse.data);
      } else {
        setError(bookResponse.error || 'Erro ao buscar livros');
		console.error("Search handleSearch getBooksFromBackend error:", bookResponse.error);
      }

      const movieResponse = await apiService.getMoviesFromBackend(query);
	  console.log("Search handleSearch movieResponse:", movieResponse);
      if (movieResponse.success) {
        setMovieResults(movieResponse.data);
		console.log("Search handleSearch movieResults set:", movieResponse.data);
      } else {
        setError(movieResponse.error || 'Erro ao buscar filmes');
		console.error("Search handleSearch getMoviesFromBackend error:", movieResponse.error);
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
