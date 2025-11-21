import React from 'react';
import './DetailsModal.css';

const DetailsModal = ({ item, isOpen, onClose }) => {
  if (!isOpen || !item) return null;

  // Detectar se é livro ou filme
  // Prioridade: type explícito > presença de director (filme) > presença de authors (livro)
  const isBook = item.type === 'book' || 
                 (item.type !== 'movie' && !item.director && (item.authors || item.description));
  
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
    ? (item.image_url || createDefaultCover(item.title))
    : (item.poster_path || createDefaultCover(item.title));

  const handleImageError = (e) => {
    const img = e.target;
    if (img.dataset.finalFallback === 'true') return;
    img.dataset.finalFallback = 'true';
    img.src = createDefaultCover(item.title || 'Sem Imagem');
  };

  const authors = isBook && Array.isArray(item.authors) 
    ? item.authors.join(', ') 
    : (isBook ? (item.authors || 'Autor desconhecido') : null);

  const genres = item.genres && Array.isArray(item.genres) 
    ? item.genres 
    : (item.genres ? [item.genres] : []);

  const cast = item.cast && Array.isArray(item.cast) 
    ? item.cast 
    : (item.cast ? [item.cast] : []);

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
              alt={item.title} 
              className="details-cover-image"
              onError={handleImageError}
            />
          </div>
          
          <div className="details-modal-info">
            <h2 className="details-title">{item.title || 'Sem título'}</h2>
            
            {isBook ? (
              <>
                {authors && (
                  <div className="details-field">
                    <span className="details-label">Autor(es):</span>
                    <span className="details-value">{authors}</span>
                  </div>
                )}
                {item.published_date && (
                  <div className="details-field">
                    <span className="details-label">Ano de Publicação:</span>
                    <span className="details-value">{item.published_date}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {item.director && (
                  <div className="details-field">
                    <span className="details-label">Diretor:</span>
                    <span className="details-value">{item.director}</span>
                  </div>
                )}
                {item.release_date && (
                  <div className="details-field">
                    <span className="details-label">Ano de Lançamento:</span>
                    <span className="details-value">{item.release_date}</span>
                  </div>
                )}
                {(item.rating || (item.rating && item.rating.score)) && (
                  <div className="details-field">
                    <span className="details-label">Nota IMDb:</span>
                    <span className="details-value">
                      {typeof item.rating === 'number' 
                        ? item.rating.toFixed(1) 
                        : (item.rating?.score ? item.rating.score.toFixed(1) : 'N/A')}
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
                <div className="details-genres">
                  {genres.map((genre, index) => (
                    <span key={index} className="genre-tag">{genre}</span>
                  ))}
                </div>
              </div>
            )}
            
            {((item.description && item.description !== 'N/A') || (item.overview && item.overview !== 'N/A')) && (
              <div className="details-field details-synopsis">
                <span className="details-label">Sinopse:</span>
                <p className="details-synopsis-text">
                  {item.description && item.description !== 'N/A' ? item.description : (item.overview && item.overview !== 'N/A' ? item.overview : '')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;

