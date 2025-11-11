import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchResults.css';
import { externalApiService } from '../services/apiService';

const SearchResults = ({ results, type }) => {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!results || results.length === 0) {
    return <p>No results found.</p>;
  }

  const handleAddToLibrary = async (book) => {
    try {
      const res = await externalApiService.addBookToLibrary(book.id);
      if (res.success) {
        setToast('Adicionado à biblioteca!');
      } else {
        setToast(res.error || 'Erro ao adicionar livro à biblioteca');
      }
    } catch (error) {
      console.error('Error adding book to library:', error);
      setToast('Erro ao adicionar livro à biblioteca.');
    }
  };

  return (
    <div className="search-results-container">
      <h2>{type === 'book' ? 'Books' : 'Movies'}</h2>
      <div className="book-grid">
        {results.map((result) => {
          const authors =
            Array.isArray(result.authors) ? result.authors.join(', ') : (result.authors || 'Autor desconhecido');
          return (
            <div key={result.id} className="book-item" onClick={() => handleAddToLibrary(result)}>
              <img src={result.image_url} alt={result.title} className="book-cover" />
              <button
                type="button"
                className="add-to-library"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToLibrary(result);
                }}
              >
                Adicionar
              </button>
              <h3 className="book-title">{result.title || 'Sem título'}</h3>
              {type === 'book' && <p className="book-authors">Autores: {authors}</p>}
            </div>
          );
        })}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default SearchResults;