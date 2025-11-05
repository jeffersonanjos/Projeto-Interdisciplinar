import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ratingService } from '../services/apiService';
import './Library.css';

const Library = () => {
  const { user } = useAuth();
  const [libraryType, setLibraryType] = useState('books'); // 'books' ou 'movies'
  const [items, setItems] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [ratingForm, setRatingForm] = useState({ score: 5, comment: '' });

  useEffect(() => {
    loadLibrary();
  }, [libraryType, user]);

  const loadLibrary = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Buscar avaliações do usuário
      const ratingsResult = await ratingService.getUserRatings(user.id);
      if (ratingsResult.success) {
        const userRatings = ratingsResult.data;
        
        // Filtrar por tipo (livros ou filmes)
        const filteredRatings = libraryType === 'books' 
          ? userRatings.filter(r => r.book_id)
          : userRatings.filter(r => r.movie_id);
        
        setRatings(filteredRatings);
        
        // Aqui você normalmente buscaria os itens completos (livros/filmes)
        // Por enquanto, usamos os dados das avaliações
        setItems(filteredRatings.map(r => ({
          id: libraryType === 'books' ? r.book_id : r.movie_id,
          title: `Item ${libraryType === 'books' ? r.book_id : r.movie_id}`,
          rating: r
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar biblioteca:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRateItem = (item) => {
    setSelectedItem(item);
    const existingRating = ratings.find(r => 
      (libraryType === 'books' ? r.book_id : r.movie_id) === item.id
    );
    
    if (existingRating) {
      setRatingForm({
        score: existingRating.score,
        comment: existingRating.comment || ''
      });
    } else {
      setRatingForm({ score: 5, comment: '' });
    }
    
    setShowRatingModal(true);
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!selectedItem || !user) return;

    try {
      const ratingData = {
        score: parseFloat(ratingForm.score),
        comment: ratingForm.comment || null,
        user_id: user.id,
        [libraryType === 'books' ? 'book_id' : 'movie_id']: selectedItem.id
      };

      const result = await ratingService.createRating(ratingData);
      if (result.success) {
        alert('Avaliação salva com sucesso!');
        setShowRatingModal(false);
        loadLibrary();
      } else {
        alert('Erro ao salvar avaliação: ' + result.error);
      }
    } catch (error) {
      alert('Erro ao salvar avaliação');
    }
  };

  const renderStars = (score) => {
    const fullStars = Math.floor(score);
    const hasHalfStar = score % 1 >= 0.5;
    
    return (
      <div className="stars">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={i < fullStars ? 'star filled' : i === fullStars && hasHalfStar ? 'star half' : 'star'}>
            ★
          </span>
        ))}
        <span className="score-number">{score.toFixed(1)}</span>
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
            Livros ({items.filter(i => i.rating?.book_id).length})
          </button>
          <button
            className={libraryType === 'movies' ? 'active' : ''}
            onClick={() => setLibraryType('movies')}
          >
            Filmes ({items.filter(i => i.rating?.movie_id).length})
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-library">
          <p>Você ainda não tem {libraryType === 'books' ? 'livros' : 'filmes'} na sua biblioteca.</p>
          <p>Use a busca para adicionar {libraryType === 'books' ? 'livros' : 'filmes'}!</p>
        </div>
      ) : (
        <div className="library-grid">
          {items.map((item) => (
            <div key={item.id} className="library-card">
              <div className="library-card-header">
                <h3>{item.title}</h3>
                {item.rating && (
                  <div className="library-rating">
                    {renderStars(item.rating.score)}
                    {item.rating.comment && (
                      <p className="library-comment">{item.rating.comment}</p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRateItem(item)}
                className="rate-button"
              >
                {item.rating ? 'Editar Avaliação' : 'Avaliar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {showRatingModal && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Avaliar {selectedItem?.title}</h3>
            <form onSubmit={handleSubmitRating}>
              <div className="form-group">
                <label>Nota (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.5"
                  value={ratingForm.score}
                  onChange={(e) => setRatingForm({ ...ratingForm, score: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Comentário (opcional)</label>
                <textarea
                  value={ratingForm.comment}
                  onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })}
                  className="form-textarea"
                  rows="4"
                  placeholder="Digite seu comentário..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowRatingModal(false)} className="cancel-button">
                  Cancelar
                </button>
                <button type="submit" className="submit-button">
                  Salvar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;

