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

  useEffect(() => {
 console.log("Search useEffect called");
    // Clear results when query changes
    setBookResults([]);
  }, [query]);

  const handleSearch = async () => {
 console.log("Search handleSearch called with query:", query);
    setLoading(true);
    setError('');

    try {
      const bookResponse = await externalApiService.searchBooksFromBackend(query);
   console.log("Search handleSearch bookResponse:", bookResponse);
      if (bookResponse.success) {
        setBookResults(bookResponse.data);
     console.log("Search handleSearch bookResults set:", bookResponse.data);
      } else {
        setError(bookResponse.error || 'Erro ao buscar livros');
  console.error("Search handleSearch getBooksFromBackend error:", bookResponse.error);
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
        placeholder="Search for books..."
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
    </div>
  );
};

export default Search;
