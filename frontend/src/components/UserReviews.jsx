import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ratingService } from '../services/apiService';
import './UserReviews.css';

const UserReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadReviews = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const response = await ratingService.getUserRatings(user.id);
        if (response.success) {
          setReviews(response.data);
        } else {
          setError('Erro ao carregar avaliações');
          console.error('Erro ao carregar avaliações:', response.message);
        }
      } catch (error) {
        setError('Erro ao carregar avaliações');
        console.error('Erro ao carregar avaliações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [user]);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="user-reviews-container">
      <h2>Minhas Avaliações</h2>
      {reviews.length === 0 ? (
        <p>Nenhuma avaliação encontrada.</p>
      ) : (
        <table className="reviews-table">
          <thead>
            <tr>
              <th>Livro/Filme</th>
              <th>Avaliação</th>
              <th>Comentário</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(review => (
              <tr key={review.id}>
                <td>
                  {review.book_id && <span>Livro: {review.book_id}</span>}
                  {review.movie_id && <span>Filme: {review.movie_id}</span>}
                </td>
                <td>{review.score}</td>
                <td>{review.comment || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserReviews;