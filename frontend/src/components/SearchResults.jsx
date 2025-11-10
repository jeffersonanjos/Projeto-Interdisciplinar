import React from 'react';
import './SearchResults.css';
import { externalApiService } from '../services/apiService';

const SearchResults = ({ results, type }) => {
  if (!results || results.length === 0) {
    return <p>No results found.</p>;
  }

  const handleAddToLibrary = async (book) => {
    try {
      await externalApiService.addBookToLibrary(book.id);
      alert('Book added to library!'); // Replace with a better notification
    } catch (error) {
      console.error('Error adding book to library:', error);
      alert('Error adding book to library.'); // Replace with a better notification
    }
  };

  return (
    <div className="search-results-container">
      <h2>{type === 'book' ? 'Books' : 'Movies'}</h2>
      <div className="book-grid">
        {results.map((result) => (
          <div key={result.id} className="book-item">
            <img src={result.image_url} alt={result.title} className="book-cover" />
            <div className="add-to-library" onClick={() => handleAddToLibrary(result)}>
              +
            </div>
            <h3>{result.title}</h3>
            {type === 'book' && <p>Author: {result.authors}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;