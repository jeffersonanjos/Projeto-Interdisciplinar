import React, { useState, useMemo } from 'react';
import './SearchResults.css';
import { externalApiService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import DetailsModal from './DetailsModal';

const SearchResults = ({ results, type }) => {
  const { toast, showToast } = useToast();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsItem, setSelectedDetailsItem] = useState(null);
  if (!results || results.length === 0) {
    return <p>No results found.</p>;
  }

  const handleAddToLibrary = async (item) => {
    const isBook = type === 'book';
    try {
      const res = isBook
        ? await externalApiService.addBookToLibrary(item.id)
        : await externalApiService.addMovieToLibrary(item.id);
      if (res.success) {
        showToast(`${isBook ? 'Livro' : 'Filme'} adicionado à biblioteca!`);
      } else {
        showToast(res.error || `Erro ao adicionar ${isBook ? 'livro' : 'filme'} à biblioteca`);
      }
    } catch (error) {
      console.error(`Error adding ${isBook ? 'book' : 'movie'} to library:`, error);
      showToast(`Erro ao adicionar ${isBook ? 'livro' : 'filme'} à biblioteca.`);
    }
  };

  const isBook = type === 'book';
  // Placeholder SVG melhorado e mais bonito
  const createDefaultCover = (title = 'Sem Imagem') => {
    const svg = `
      <svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4a5568;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2d3748;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#grad)"/>
        <g transform="translate(100, 120)">
          <path d="M-30,-20 L30,-20 L30,20 L-30,20 Z" fill="none" stroke="#cbd5e0" stroke-width="3" stroke-linecap="round"/>
          <circle cx="0" cy="-5" r="8" fill="none" stroke="#cbd5e0" stroke-width="2"/>
          <path d="M-15,10 L0,25 L15,10" fill="none" stroke="#cbd5e0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <text x="100" y="200" font-family="Arial, sans-serif" font-size="14" fill="#cbd5e0" text-anchor="middle">${title.length > 20 ? title.substring(0, 20) + '...' : title}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  };
  const defaultCover = createDefaultCover('Sem Imagem');

  const handleMovieDetails = (movie) => {
    if (!movie?.id) return;
    window.open(`https://www.imdb.com/title/${movie.id}`, '_blank', 'noopener,noreferrer');
  };

  const handleImageError = (e, result) => {
    const img = e.target;
    
    // Evitar loop infinito
    if (img.dataset.finalFallback === 'true') {
      return;
    }
    
    // Se for filme e ainda não tentou todas as fontes
    if (!isBook && result.id) {
      // Tentar 1: API de pôsteres do OMDb (se ainda não tentou)
      if (!img.dataset.triedOmdb) {
        img.dataset.triedOmdb = 'true';
        const omdbPosterUrl = `http://img.omdbapi.com/?apikey=a3f0b40b&i=${result.id}`;
        img.src = omdbPosterUrl;
        return;
      }
      
      // Tentar 2: Usar um serviço proxy de imagens do TMDb (sem API key necessário)
      // TMDb permite acesso direto às imagens se você tiver o caminho, mas precisamos buscar primeiro
      // Por enquanto, vamos pular isso e ir direto para o placeholder
    }
    
    // Fallback final: usar placeholder personalizado com título do filme
    img.dataset.finalFallback = 'true';
    img.src = createDefaultCover(result.title || 'Sem Imagem');
  };

  // Filtrar resultados para garantir que correspondam ao tipo esperado
  // e remover duplicatas baseadas no ID
  const filteredResults = useMemo(() => {
    const seen = new Set();
    const filtered = [];
    
    for (const result of results) {
      // Criar uma chave única para detecção de duplicatas
      const id = result.id || result.external_id;
      const uniqueKey = id ? `${type}-${id}` : null;
      
      // Verificar se já vimos este item
      if (uniqueKey && seen.has(uniqueKey)) {
        continue; // Pular duplicatas
      }
      
      // Filtro rigoroso baseado no tipo esperado
      if (isBook) {
        // É um livro se tem authors ou image_url, E NÃO tem poster_path (característica de filme)
        // Também garantir que NÃO tem release_date (característica de filme)
        const hasBookCharacteristics = (result.authors || result.image_url);
        const hasNoMovieCharacteristics = !result.poster_path && !result.release_date;
        if (hasBookCharacteristics && hasNoMovieCharacteristics) {
          if (uniqueKey) seen.add(uniqueKey);
          filtered.push(result);
        }
      } else {
        // É um filme se tem poster_path ou release_date, E NÃO tem authors
        // Também garantir que não tem image_url (característica de livro)
        // Validação adicional: verificar se tem IMDb ID (característica de filme)
        const hasMovieCharacteristics = (result.poster_path || result.release_date || result.id);
        const hasNoBookCharacteristics = !result.authors && !result.image_url;
        if (hasMovieCharacteristics && hasNoBookCharacteristics) {
          if (uniqueKey) seen.add(uniqueKey);
          filtered.push(result);
        }
      }
    }
    
    return filtered;
  }, [results, type, isBook]);

  return (
    <div className="search-results-container">
      <div className="book-grid library-compact">
        {filteredResults.map((result, index) => {
          const authors =
            Array.isArray(result.authors) ? result.authors.join(', ') : (result.authors || 'Autor desconhecido');
          const coverImage = isBook ? (result.image_url || defaultCover) : (result.poster_path || defaultCover);
          // Usar uma chave única combinando tipo e ID, com fallback para índice
          const uniqueKey = `${type}-${result.id || result.external_id || index}`;
          return (
            <div key={uniqueKey} className="book-item">
              <img 
                src={coverImage} 
                alt={result.title} 
                className="book-cover"
                onError={(e) => handleImageError(e, result)}
                onClick={() => {
                  setSelectedDetailsItem({ ...result, type });
                  setShowDetailsModal(true);
                }}
                style={{ cursor: 'pointer' }}
              />
              <div 
                className="book-content"
                onClick={() => {
                  setSelectedDetailsItem({ ...result, type });
                  setShowDetailsModal(true);
                }}
                style={{ cursor: 'pointer', flex: 1 }}
              >
                <h3 className="book-title">{result.title || 'Sem título'}</h3>
                {isBook ? (
                  <p className="book-authors">Autores: {authors}</p>
                ) : (
                  <p className="book-authors">
                    {result.release_date ? `Lançamento: ${result.release_date}` : 'Sem data'}
                    {result.rating && (
                      <span> • Nota IMDb: {
                        typeof result.rating === 'number' 
                          ? result.rating.toFixed(1) 
                          : (result.rating?.score ? result.rating.score.toFixed(1) : result.rating)
                      }</span>
                    )}
                  </p>
                )}
                {(() => {
                  // Processar gêneros de forma robusta
                  let genres = [];
                  if (result.genres) {
                    if (Array.isArray(result.genres)) {
                      genres = result.genres.filter(g => g && g.trim());
                    } else if (typeof result.genres === 'string') {
                      genres = result.genres.split(/[,|]/).map(g => g.trim()).filter(g => g);
                    }
                  }
                  return genres.length > 0 && (
                    <div className="taskbar-genres__chips">
                      {genres.slice(0, 3).map((genre, index) => (
                        <span key={index} className="taskbar-genres__chip">{genre}</span>
                      ))}
                    </div>
                  );
                })()}
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
              {!isBook && (
                <button
                  type="button"
                  className="rate-button secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMovieDetails(result);
                  }}
                  style={{ marginTop: '5px' }}
                >
                  Ver no IMDb
                </button>
              )}
            </div>
          );
        })}
      </div>
      {filteredResults.length === 0 && results.length > 0 && (
        <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
          Nenhum {type === 'book' ? 'livro' : 'filme'} válido encontrado nos resultados.
        </p>
      )}
      <DetailsModal
        item={selectedDetailsItem}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedDetailsItem(null);
        }}
      />
      <Toast message={toast} />
    </div>
  );
};

export default SearchResults;