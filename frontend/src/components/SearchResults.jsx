import React from 'react';
import './SearchResults.css';
import { externalApiService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';

const SearchResults = ({ results, type }) => {
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

  const isBook = type === 'book';
  // Imagem padrão SVG
  const defaultCover = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iIzhCNzM1NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNGRkZGRkYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TZSBJbWFnZW48L3RleHQ+PC9zdmc+';

  const handleMovieDetails = (movie) => {
    if (!movie?.id) return;
    window.open(`https://www.imdb.com/title/${movie.id}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="search-results-container">
      <div className="book-grid library-compact">
        {results.map((result) => {
          const authors =
            Array.isArray(result.authors) ? result.authors.join(', ') : (result.authors || 'Autor desconhecido');
          const coverImage = isBook ? (result.image_url || defaultCover) : (result.poster_path || defaultCover);
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
                {isBook ? (
                  <p className="book-authors">Autores: {authors}</p>
                ) : (
                  <>
                    <p className="book-authors">
                      Lançamento: {result.release_date || 'Sem data'} {result.rating ? `• Nota IMDb: ${result.rating}` : ''}
                    </p>
                    {result.overview && <p className="book-authors movie-overview">{result.overview}</p>}
                  </>
                )}
              </div>
              {isBook ? (
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
              ) : (
                <button
                  type="button"
                  className="rate-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMovieDetails(result);
                  }}
                >
                  Ver no IMDb
                </button>
              )}
            </div>
          );
        })}
      </div>
      <Toast message={toast} />
    </div>
  );
};

export default SearchResults;