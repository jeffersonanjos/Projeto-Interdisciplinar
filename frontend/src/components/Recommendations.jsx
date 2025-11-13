import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { recommendationService } from '../services/apiService';
import SearchResults from './SearchResults';
import './Recommendations.css';

const Recommendations = () => {
  console.log("Recommendations component loaded");
  const { user } = useAuth();
  const [bookRecommendations, setBookRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log("Recommendations useEffect called");
    loadBookRecommendations();
  }, [user]);

  const loadBookRecommendations = async () => {
    console.log("Recommendations loadBookRecommendations called");
    if (!user) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await recommendationService.getBookRecommendations(user.id);
      console.log("Recommendations loadBookRecommendations result:", result);
      if (result.success) {
        setBookRecommendations(result.data || []);
      } else {
        setError(result.error || 'Erro ao carregar recomendações');
      }
    } catch (error) {
      console.error('Erro ao carregar recomendações:', error);
      setError('Erro ao carregar recomendações');
    } finally {
      setLoading(false);
      console.log("Recommendations loadBookRecommendations loading set to false");
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
        <p className="recommendations-subtitle">
          Livros recomendados com base nos gêneros e autores dos livros da sua biblioteca
        </p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {bookRecommendations.length === 0 && !error ? (
        <div className="no-recommendations">
          <p>Não há recomendações disponíveis no momento.</p>
          <p>Adicione livros à sua biblioteca para receber recomendações personalizadas!</p>
        </div>
      ) : (
        <div className="recommendations-content">
          <div className="recommendations-section">
            {bookRecommendations.length > 0 && (
              <div className="recommendations-group">
                <h3>Livros Recomendados ({bookRecommendations.length})</h3>
                <SearchResults results={bookRecommendations} type="book" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recommendations;
