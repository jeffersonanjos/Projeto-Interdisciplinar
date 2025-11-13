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
      const [libraryResult, ratingsResult] = await Promise.all([
        externalApiService.getUserLibrary(userId),
        ratingService.getUserRatings(userId)
      ]);

      const ratingsMap = {};
      if (ratingsResult.success && Array.isArray(ratingsResult.data)) {
        ratingsResult.data.forEach((rating) => {
          if (rating && rating.book_external_id) {
            ratingsMap[rating.book_external_id] = {
              id: rating.id,
              score: rating.score,
              comment: rating.comment || '',
              created_at: rating.created_at,
            };
          }
        });
      }

      const libraryItems = libraryResult.success && Array.isArray(libraryResult.data)
        ? libraryResult.data
        : [];

      const filteredItems = libraryItems.filter((item) => item && item.id);
      const itemsWithRatings = filteredItems.map((item) => ({
        ...item,
        rating: ratingsMap[item.id] || null,
      }));

      setItems(itemsWithRatings);
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
        const createPayload = {
          score: normalizedScore,
          comment: normalizedComment,
          user_id: user.id,
          ...(libraryType === 'books'
            ? { book_external_id: selectedItem.id }
            : { movie_id: selectedItem.id }),
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

  const handleRemoveBook = async (item) => {
    if (!item || !item.id) return;
    
    if (!window.confirm(`Tem certeza que deseja remover "${item.title}" da sua biblioteca?`)) {
      return;
    }

    try {
      const result = await externalApiService.removeBookFromLibrary(item.id);
      if (result.success) {
        // Remover o item da lista
        setItems((prevItems) => prevItems.filter((i) => i.id !== item.id));
        // Remover a avaliação associada se existir
        setRatings((prevRatings) => {
          const updated = { ...prevRatings };
          delete updated[item.id];
          return updated;
        });
        showToast('Livro removido da biblioteca!');
      } else {
        showToast(result.error || 'Erro ao remover livro da biblioteca');
      }
    } catch (error) {
      console.error('Erro ao remover livro:', error);
      showToast('Erro ao remover livro da biblioteca');
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
            onClick={() => setLibraryType('books')}
          >
            Livros ({items.length})
          </button>
          <button
            className={libraryType === 'movies' ? 'active' : ''}
            onClick={() => setLibraryType('movies')}
          >
            Filmes (0)
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
            const authors = Array.isArray(item.authors)
              ? item.authors.join(', ')
              : item.authors || 'Autor desconhecido';
            // Imagem padrão SVG para livros sem capa
            const defaultBookCover = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iIzhCNzM1NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNGRkZGRkYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TZW0gQ2FwYTwvdGV4dD48L3N2Zz4=';
            const coverImage = item.image_url || defaultBookCover;
            return (
              <div key={item.id} className="book-item">
                <img 
                  src={coverImage} 
                  alt={item.title} 
                  className="book-cover"
                  onError={(e) => {
                    // Se a imagem falhar ao carregar, usar a imagem padrão
                    e.target.src = defaultBookCover;
                  }}
                />
                <div className="book-content">
                  <h3 className="book-title">{item.title || 'Sem título'}</h3>
                  {libraryType === 'books' && <p className="book-authors">Autores: {authors}</p>}
                </div>
                <button
                  onClick={() => handleRateItem(item)}
                  className="rate-button"
                >
                  {item.rating ? 'Editar Avaliação' : 'Avaliar'}
                </button>
                <button
                  onClick={() => handleRemoveBook(item)}
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
