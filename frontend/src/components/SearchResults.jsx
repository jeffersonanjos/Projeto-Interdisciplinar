import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchResults.css';
import { externalApiService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';

const SearchResults = ({ results, type }) => {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  if (!results || results.length === 0) {
    return <p>No results found.</p>;
  }

  const handleAddToLibrary = async (book) => {
    try {
      const res = await externalApiService.addBookToLibrary(book.id);
      if (res.success) {
        showToast('Adicionado à biblioteca!');
      } else {
        showToast(res.error || 'Erro ao adicionar livro à biblioteca');
      }
    } catch (error) {
      console.error('Error adding book to library:', error);
      showToast('Erro ao adicionar livro à biblioteca.');
    }
  };

  // Imagem padrão SVG para livros sem capa
  const defaultBookCover = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iIzhCNzM1NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNGRkZGRkYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TZW0gQ2FwYTwvdGV4dD48L3N2Zz4=';

  return (
    <div className="search-results-container">
      <div className="book-grid library-compact">
        {results.map((result) => {
          const authors =
            Array.isArray(result.authors) ? result.authors.join(', ') : (result.authors || 'Autor desconhecido');
          const coverImage = result.image_url || defaultBookCover;
          return (
            <div key={result.id} className="book-item">
              <img 
                src={coverImage} 
                alt={result.title} 
                className="book-cover"
                onError={(e) => {
                  // Se a imagem falhar ao carregar, usar a imagem padrão
                  e.target.src = defaultBookCover;
                }}
              />
              <div className="book-content">
                <h3 className="book-title">{result.title || 'Sem título'}</h3>
                {type === 'book' && <p className="book-authors">Autores: {authors}</p>}
              </div>
              <button
                type="button"
                className="rate-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToLibrary(result);
                }}
              >
                Adicionar
              </button>
            </div>
          );
        })}
      </div>
      <Toast message={toast} />
    </div>
  );
};

export default SearchResults;