import React, { useState, useEffect } from 'react';
import './DetailsModal.css';
import { externalApiService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';

const DetailsModal = ({ item, isOpen, onClose }) => {
  const { toast, showToast } = useToast();
  const [detailedItem, setDetailedItem] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setDetailedItem(item);
      // Se for filme e não tiver sinopse, buscar detalhes completos
      const isBook = item.type === 'book' || 
                     (item.type !== 'movie' && !item.director && (item.authors || item.description));
      
      if (!isBook && item.id && (!item.overview || item.overview === 'N/A') && (!item.description || item.description === 'N/A')) {
        setLoadingDetails(true);
        externalApiService.getMovieById(item.id)
          .then(result => {
            if (result.success && result.data) {
              setDetailedItem({ ...item, ...result.data });
            } else {
              // Se falhar, manter o item original
              setDetailedItem(item);
            }
          })
          .catch(error => {
            console.error('Error fetching movie details:', error);
            // Se falhar, manter o item original
            setDetailedItem(item);
          })
          .finally(() => {
            setLoadingDetails(false);
          });
      }
    } else if (!isOpen) {
      // Limpar quando o modal fechar
      setDetailedItem(null);
      setLoadingDetails(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item || !detailedItem) return null;

  // Detectar se é livro ou filme
  // Prioridade: type explícito > presença de director (filme) > presença de authors (livro)
  const isBook = detailedItem.type === 'book' || 
                 (detailedItem.type !== 'movie' && !detailedItem.director && (detailedItem.authors || detailedItem.description));
  
  const handleAddToLibrary = async () => {
    try {
      const res = isBook
        ? await externalApiService.addBookToLibrary(detailedItem.id)
        : await externalApiService.addMovieToLibrary(detailedItem.id);
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
  
  // Função para criar placeholder SVG
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

  const coverImage = isBook 
    ? (detailedItem.image_url || createDefaultCover(detailedItem.title))
    : (detailedItem.poster_path || createDefaultCover(detailedItem.title));

  const handleImageError = (e) => {
    const img = e.target;
    if (img.dataset.finalFallback === 'true') return;
    img.dataset.finalFallback = 'true';
    img.src = createDefaultCover(detailedItem.title || 'Sem Imagem');
  };

  const authors = isBook && Array.isArray(detailedItem.authors) 
    ? detailedItem.authors.join(', ') 
    : (isBook ? (detailedItem.authors || 'Autor desconhecido') : null);

  const genres = detailedItem.genres && Array.isArray(detailedItem.genres) 
    ? detailedItem.genres 
    : (detailedItem.genres ? [detailedItem.genres] : []);

  const cast = detailedItem.cast && Array.isArray(detailedItem.cast) 
    ? detailedItem.cast 
    : (detailedItem.cast ? [detailedItem.cast] : []);

  return (
    <div className="modal-overlay details-modal-overlay" onClick={onClose}>
      <div className="modal-content details-modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-button"
          onClick={onClose}
          aria-label="Fechar modal"
        >
          ×
        </button>
        
        <div className="details-modal-body">
          <div className="details-modal-cover">
            <img 
              src={coverImage} 
              alt={detailedItem.title} 
              className="details-cover-image"
              onError={handleImageError}
            />
          </div>
          
          <div className="details-modal-info">
            <h2 className="details-title">{detailedItem.title || 'Sem título'}</h2>
            {loadingDetails && (
              <p style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Carregando detalhes...
              </p>
            )}
            
            {isBook ? (
              <>
                {authors && (
                  <div className="details-field">
                    <span className="details-label">Autor(es):</span>
                    <span className="details-value">{authors}</span>
                  </div>
                )}
                {detailedItem.published_date && (
                  <div className="details-field">
                    <span className="details-label">Ano de Publicação:</span>
                    <span className="details-value">{detailedItem.published_date}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {detailedItem.director && (
                  <div className="details-field">
                    <span className="details-label">Diretor:</span>
                    <span className="details-value">{detailedItem.director}</span>
                  </div>
                )}
                {detailedItem.release_date && (
                  <div className="details-field">
                    <span className="details-label">Ano de Lançamento:</span>
                    <span className="details-value">{detailedItem.release_date}</span>
                  </div>
                )}
                {(detailedItem.rating || (detailedItem.rating && detailedItem.rating.score)) && (
                  <div className="details-field">
                    <span className="details-label">Nota IMDb:</span>
                    <span className="details-value">
                      {typeof detailedItem.rating === 'number' 
                        ? detailedItem.rating.toFixed(1) 
                        : (detailedItem.rating?.score ? detailedItem.rating.score.toFixed(1) : 'N/A')}
                    </span>
                  </div>
                )}
                {cast.length > 0 && (
                  <div className="details-field">
                    <span className="details-label">Principais Atores:</span>
                    <span className="details-value">{cast.join(', ')}</span>
                  </div>
                )}
              </>
            )}
            
            {genres.length > 0 && (
              <div className="details-field">
                <span className="details-label">Gêneros:</span>
                <div className="details-genres taskbar-genres__chips">
                  {genres.map((genre, index) => (
                    <span key={index} className="taskbar-genres__chip">{genre}</span>
                  ))}
                </div>
              </div>
            )}
            
            {((detailedItem.description && detailedItem.description !== 'N/A') || (detailedItem.overview && detailedItem.overview !== 'N/A')) && (
              <div className="details-field details-synopsis">
                <span className="details-label">Sinopse:</span>
                <p className="details-synopsis-text">
                  {detailedItem.description && detailedItem.description !== 'N/A' ? detailedItem.description : (detailedItem.overview && detailedItem.overview !== 'N/A' ? detailedItem.overview : '')}
                </p>
              </div>
            )}
            
            <div className="details-modal-actions">
              <button
                type="button"
                className="details-add-button"
                onClick={handleAddToLibrary}
              >
                Adicionar à Biblioteca
              </button>
            </div>
          </div>
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
};

export default DetailsModal;

