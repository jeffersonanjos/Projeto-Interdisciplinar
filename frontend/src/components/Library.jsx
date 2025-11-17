import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ratingService, externalApiService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import './Library.css';

const Library = () => {
  const { user } = useAuth();
  const [libraryType, setLibraryType] = useState('books'); // 'books' ou 'movies'
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]); // Todos os itens (livros + filmes) para contagem
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [ratingForm, setRatingForm] = useState({ score: 0, comment: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isDeletingRating, setIsDeletingRating] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    loadLibrary();
  }, [libraryType, user]);

  const resetModalState = () => {
    setSelectedItem(null);
    setSelectedRating(null);
    setRatingForm({ score: 0, comment: '' });
    setHoverRating(0);
    setIsEditingRating(false);
    setFeedbackMessage('');
    setIsSubmittingRating(false);
    setIsDeletingRating(false);
  };

  const closeModal = () => {
    setShowRatingModal(false);
    resetModalState();
  };

  const loadLibrary = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userId = parseInt(user.id, 10);
      
      // Carregar livros e filmes em paralelo
      const [booksResult, moviesResult, ratingsResult] = await Promise.all([
        externalApiService.getUserLibrary(userId),
        externalApiService.getUserMovieLibrary(userId),
        ratingService.getUserRatings(userId)
      ]);

      const ratingsMap = {};
      if (ratingsResult.success && Array.isArray(ratingsResult.data)) {
        ratingsResult.data.forEach((rating) => {
          const externalId = rating.book_external_id || rating.movie_external_id;
          if (externalId) {
            ratingsMap[externalId] = {
              id: rating.id,
              score: rating.score,
              comment: rating.comment || '',
              created_at: rating.created_at,
            };
          }
        });
      }

      // Processar livros
      const libraryBooks = booksResult.success && Array.isArray(booksResult.data)
        ? booksResult.data
        : [];
      const filteredBooks = libraryBooks.filter((item) => item && item.id);
      const booksWithRatings = filteredBooks.map((item) => ({
        ...item,
        rating: ratingsMap[item.id] || null,
        type: 'book',
      }));

      // Processar filmes
      const libraryMovies = moviesResult.success && Array.isArray(moviesResult.data)
        ? moviesResult.data
        : [];
      const filteredMovies = libraryMovies.filter((item) => item && item.id);
      const moviesWithRatings = filteredMovies.map((item) => ({
        ...item,
        rating: ratingsMap[item.id] || null,
        type: 'movie',
      }));

      // Combinar todos os itens
      const allItems = [...booksWithRatings, ...moviesWithRatings];
      
      // Filtrar por tipo selecionado
      const filteredItems = libraryType === 'books' 
        ? allItems.filter(item => item.type === 'book')
        : allItems.filter(item => item.type === 'movie');

      setItems(filteredItems);
      setAllItems(allItems); // Manter todos os itens para contagem
      setRatings(ratingsMap);
    } catch (error) {
      console.error('Erro ao carregar biblioteca:', error);
      setItems([]);
      setRatings({});
    } finally {
      setLoading(false);
    }
  };

  const updateItemRating = (itemId, ratingData) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, rating: ratingData } : item
      )
    );
    setRatings((prevRatings) => {
      const updated = { ...prevRatings };
      if (ratingData) {
        updated[itemId] = ratingData;
      } else {
        delete updated[itemId];
      }
      return updated;
    });
    setSelectedItem((prev) =>
      prev && prev.id === itemId ? { ...prev, rating: ratingData } : prev
    );
  };

  const handleRateItem = (item) => {
    const existingRating = ratings[item.id] || null;
    setSelectedItem(item);
    setSelectedRating(existingRating);
    setRatingForm({
      score: existingRating ? Number(existingRating.score) : 0,
      comment: existingRating?.comment || '',
    });
    setHoverRating(0);
    setFeedbackMessage('');
    setIsEditingRating(!existingRating);
    setIsSubmittingRating(false);
    setIsDeletingRating(false);
    setShowRatingModal(true);
  };

  const handleStartEditing = () => {
    setRatingForm({
      score: selectedRating ? Number(selectedRating.score) : 0,
      comment: selectedRating?.comment || '',
    });
    setHoverRating(0);
    setFeedbackMessage('');
    setIsEditingRating(true);
  };

  const handleCancelEditing = () => {
    if (selectedRating) {
      setRatingForm({
        score: Number(selectedRating.score),
        comment: selectedRating.comment || '',
      });
      setIsEditingRating(false);
      setHoverRating(0);
      setFeedbackMessage('');
    } else {
      closeModal();
    }
  };

  const handleStarClick = (value) => {
    setRatingForm((prev) => ({ ...prev, score: value }));
    setHoverRating(0);
  };

  const handleSubmitRating = async (event) => {
    event.preventDefault();
    if (!selectedItem || !user || ratingForm.score === 0) {
      setFeedbackMessage('Selecione uma nota de 1 a 5 para continuar.');
      return;
    }

    setIsSubmittingRating(true);
    setFeedbackMessage('');

    const normalizedComment = ratingForm.comment?.trim() || null;
    const normalizedScore = Number(ratingForm.score);

    try {
      if (selectedRating) {
        const updatePayload = {
          score: normalizedScore,
          comment: normalizedComment,
        };
        const result = await ratingService.updateRating(selectedRating.id, updatePayload);
        if (result.success) {
          const updatedRating = {
            id: result.data.id,
            score: result.data.score,
            comment: result.data.comment || '',
            created_at: result.data.created_at,
          };
          updateItemRating(selectedItem.id, updatedRating);
          setSelectedRating(updatedRating);
          setIsEditingRating(false);
          setFeedbackMessage('Avaliação atualizada!');
        } else {
          setFeedbackMessage(result.error || 'Erro ao atualizar avaliação.');
        }
      } else {
        const itemType = selectedItem.type || libraryType;
        const createPayload = {
          score: normalizedScore,
          comment: normalizedComment,
          user_id: user.id,
          ...(itemType === 'book'
            ? { book_external_id: selectedItem.id }
            : { movie_external_id: selectedItem.id }),
        };
        const result = await ratingService.createRating(createPayload);
        if (result.success) {
          const newRating = {
            id: result.data.id,
            score: result.data.score,
            comment: result.data.comment || '',
            created_at: result.data.created_at,
          };
          updateItemRating(selectedItem.id, newRating);
          setSelectedRating(newRating);
          setIsEditingRating(false);
          setFeedbackMessage('Avaliação salva!');
        } else {
          setFeedbackMessage(result.error || 'Erro ao salvar avaliação.');
        }
      }
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      setFeedbackMessage('Erro ao salvar avaliação.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleDeleteRating = async () => {
    if (!selectedRating) return;

    setIsDeletingRating(true);
    setFeedbackMessage('');
    try {
      const result = await ratingService.deleteRating(selectedRating.id);
      if (result.success) {
        updateItemRating(selectedItem.id, null);
        setSelectedRating(null);
        setRatingForm({ score: 0, comment: '' });
        setIsEditingRating(true);
        setFeedbackMessage('Avaliação removida.');
      } else {
        setFeedbackMessage(result.error || 'Erro ao remover avaliação.');
      }
    } catch (error) {
      console.error('Erro ao remover avaliação:', error);
      setFeedbackMessage('Erro ao remover avaliação.');
    } finally {
      setIsDeletingRating(false);
    }
  };

  const handleRemoveItem = async (item) => {
    if (!item || !item.id) return;
    
    const itemType = item.type || libraryType;
    const itemName = itemType === 'book' ? 'livro' : 'filme';
    
    if (!window.confirm(`Tem certeza que deseja remover "${item.title}" da sua biblioteca?`)) {
      return;
    }

    try {
      const result = itemType === 'book'
        ? await externalApiService.removeBookFromLibrary(item.id)
        : await externalApiService.removeMovieFromLibrary(item.id);
      
      if (result.success) {
        // Remover o item da lista filtrada
        setItems((prevItems) => prevItems.filter((i) => i.id !== item.id));
        // Remover o item da lista completa
        setAllItems((prevAllItems) => prevAllItems.filter((i) => i.id !== item.id));
        // Remover a avaliação associada se existir
        setRatings((prevRatings) => {
          const updated = { ...prevRatings };
          delete updated[item.id];
          return updated;
        });
        showToast(`${itemType === 'book' ? 'Livro' : 'Filme'} removido da biblioteca!`);
      } else {
        showToast(result.error || `Erro ao remover ${itemName} da biblioteca`);
      }
    } catch (error) {
      console.error(`Erro ao remover ${itemName}:`, error);
      showToast(`Erro ao remover ${itemName} da biblioteca`);
    }
  };

  const renderStars = (score) => {
    const roundedScore = Math.round(score || 0);
    return (
      <div className="static-stars">
        {[1, 2, 3, 4, 5].map((value) => (
          <span
            key={value}
            className={`static-star ${value <= roundedScore ? 'filled' : ''}`}
          >
            ★
          </span>
        ))}
        <span className="score-number">{(score || 0).toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="library-container">
        <div className="loading-container">
          <p>Carregando biblioteca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="library-container">
      <div className="library-header">
        <h2>Minha Biblioteca</h2>
        <div className="library-type-toggle">
          <button
            className={libraryType === 'books' ? 'active' : ''}
            onClick={() => {
              setLibraryType('books');
              const filtered = allItems.filter(item => item.type === 'book');
              setItems(filtered);
            }}
          >
            Livros ({allItems.filter(item => item.type === 'book').length})
          </button>
          <button
            className={libraryType === 'movies' ? 'active' : ''}
            onClick={() => {
              setLibraryType('movies');
              const filtered = allItems.filter(item => item.type === 'movie');
              setItems(filtered);
            }}
          >
            Filmes ({allItems.filter(item => item.type === 'movie').length})
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-library">
          <p>Você ainda não tem {libraryType === 'books' ? 'livros' : 'filmes'} na sua biblioteca.</p>
          <p>Use a busca para adicionar {libraryType === 'books' ? 'livros' : 'filmes'}!</p>
        </div>
      ) : (
        <div className="book-grid library-compact">
          {items.map((item) => {
            const isBook = (item.type || libraryType) === 'book';
            const authors = isBook && Array.isArray(item.authors)
              ? item.authors.join(', ')
              : (isBook ? (item.authors || 'Autor desconhecido') : null);
            
            // Função para criar placeholder SVG melhorado
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
            const defaultCover = createDefaultCover(item.title || 'Sem Imagem');
            const coverImage = isBook 
              ? (item.image_url || defaultCover)
              : (item.poster_path || defaultCover);
            
            const handleImageError = (e) => {
              const img = e.target;
              
              // Evitar loop infinito
              if (img.dataset.finalFallback === 'true') {
                return;
              }
              
              // Se for filme e ainda não tentou todas as fontes
              if (!isBook && item.id) {
                // Tentar 1: API de pôsteres do OMDb (se ainda não tentou)
                if (!img.dataset.triedOmdb) {
                  img.dataset.triedOmdb = 'true';
                  const omdbPosterUrl = `http://img.omdbapi.com/?apikey=a3f0b40b&i=${item.id}`;
                  img.src = omdbPosterUrl;
                  return;
                }
              }
              
              // Fallback final: usar placeholder personalizado com título
              img.dataset.finalFallback = 'true';
              img.src = createDefaultCover(item.title || 'Sem Imagem');
            };
            
            return (
              <div key={item.id} className="book-item">
                <img 
                  src={coverImage} 
                  alt={item.title} 
                  className="book-cover"
                  onError={handleImageError}
                />
                <div className="book-content">
                  <h3 className="book-title">{item.title || 'Sem título'}</h3>
                  {isBook && <p className="book-authors">Autores: {authors}</p>}
                  {!isBook && (
                    <p className="book-authors">
                      {item.release_date ? `Lançamento: ${item.release_date}` : ''}
                      {item.rating && item.rating.score ? ` • Nota: ${item.rating.score.toFixed(1)}` : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRateItem(item)}
                  className="rate-button"
                >
                  {item.rating ? 'Editar Avaliação' : 'Avaliar'}
                </button>
                <button
                  onClick={() => handleRemoveItem(item)}
                  className="remove-button"
                >
                  Remover
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showRatingModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content rating-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-button"
              onClick={closeModal}
              aria-label="Fechar modal"
            >
              ×
            </button>
            <h3>Avaliar {selectedItem?.title}</h3>
            {feedbackMessage && (
              <div className="modal-feedback">
                {feedbackMessage}
              </div>
            )}

            {isEditingRating ? (
              <form onSubmit={handleSubmitRating} className="rating-form">
                <div
                  className="star-rating"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={`star-button ${
                        (hoverRating || ratingForm.score) >= value ? 'active' : ''
                      }`}
                      onMouseEnter={() => setHoverRating(value)}
                      onFocus={() => setHoverRating(value)}
                      onBlur={() => setHoverRating(0)}
                      onClick={() => handleStarClick(value)}
                      aria-label={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="rating-hint">
                  Nota selecionada: {ratingForm.score || '-'} / 5
                </p>
                <div className="form-group">
                  <label>Comentário (opcional)</label>
                  <textarea
                    value={ratingForm.comment}
                    onChange={(e) =>
                      setRatingForm((prev) => ({ ...prev, comment: e.target.value }))
                    }
                    className="form-textarea"
                    rows="4"
                    placeholder="Compartilhe o que achou do livro..."
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={handleCancelEditing}
                  >
                    {selectedRating ? 'Voltar' : 'Cancelar'}
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={isSubmittingRating || ratingForm.score === 0}
                  >
                    {isSubmittingRating ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rating-summary">
                <div className="rating-summary-stars">
                  {renderStars(selectedRating?.score || 0)}
                </div>
                <div className="rating-summary-comment">
                  {selectedRating?.comment ? (
                    <p>{selectedRating.comment}</p>
                  ) : (
                    <p className="empty-comment">Nenhum comentário adicionado.</p>
                  )}
                </div>
                <div className="rating-summary-actions">
                  <button
                    type="button"
                    className="icon-button edit"
                    onClick={handleStartEditing}
                    title="Editar avaliação"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="icon-button delete"
                    onClick={handleDeleteRating}
                    disabled={isDeletingRating}
                    title="Excluir avaliação"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  className="close-button"
                  onClick={closeModal}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
};

export default Library;
