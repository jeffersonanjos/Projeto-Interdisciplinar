import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { recommendationService, bookService, movieService } from '../services/apiService';
import './Recommendations.css';

const Recommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [user]);

  const loadRecommendations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await recommendationService.getUserRecommendations(user.id);
      if (result.success && result.data.length > 0) {
        // Pegar a recomendação mais recente
        const latest = result.data[result.data.length - 1];
        setRecommendations(latest);
      }
    } catch (error) {
      console.error('Erro ao carregar recomendações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!user) return;
    
    setGenerating(true);
    try {
      const result = await recommendationService.generateRecommendations(user.id);
      if (result.success) {
        alert('Recomendações geradas com sucesso!');
        loadRecommendations();
      } else {
        alert('Erro ao gerar recomendações: ' + result.error);
      }
    } catch (error) {
      alert('Erro ao gerar recomendações');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="recommendations-container">
        <div className="loading-container">
          <p>Carregando recomendações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <h2>Recomendações para Você</h2>
        <button
          onClick={handleGenerateRecommendations}
          className="generate-button"
          disabled={generating}
        >
          {generating ? 'Gerando...' : 'Gerar Recomendações'}
        </button>
      </div>

      {!recommendations ? (
        <div className="no-recommendations">
          <p>Você ainda não tem recomendações personalizadas.</p>
          <p>Clique em "Gerar Recomendações" para receber sugestões baseadas no seu histórico!</p>
        </div>
      ) : (
        <div className="recommendations-content">
          <div className="recommendations-section">
            {recommendations.recommended_books && recommendations.recommended_books.length > 0 && (
              <div className="recommendations-group">
                <h3>Livros Recomendados</h3>
                <div className="recommendations-grid">
                  {recommendations.recommended_books.map((bookId, index) => (
                    <div key={index} className="recommendation-card">
                      <div className="recommendation-placeholder">
                        <p>Livro ID: {bookId}</p>
                        <p className="recommendation-note">Carregando detalhes...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recommendations.recommended_movies && recommendations.recommended_movies.length > 0 && (
              <div className="recommendations-group">
                <h3>Filmes Recomendados</h3>
                <div className="recommendations-grid">
                  {recommendations.recommended_movies.map((movieId, index) => (
                    <div key={index} className="recommendation-card">
                      <div className="recommendation-placeholder">
                        <p>Filme ID: {movieId}</p>
                        <p className="recommendation-note">Carregando detalhes...</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!recommendations.recommended_books || recommendations.recommended_books.length === 0) &&
             (!recommendations.recommended_movies || recommendations.recommended_movies.length === 0) && (
              <div className="no-recommendations">
                <p>Não há recomendações disponíveis no momento.</p>
                <p>Faça mais avaliações para receber recomendações personalizadas!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recommendations;

