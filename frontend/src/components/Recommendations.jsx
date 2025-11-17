import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { recommendationService } from '../services/apiService';
import SearchResults from './SearchResults';
import './Recommendations.css';

const Recommendations = () => {
  console.log("Recommendations component loaded");
  const { user } = useAuth();
  const [bookRecommendations, setBookRecommendations] = useState([]);
  const [movieRecommendations, setMovieRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [error, setError] = useState('');
  const [recommendationType, setRecommendationType] = useState('books'); // 'books' ou 'movies' - agora é apenas um filtro

  useEffect(() => {
    console.log("Recommendations useEffect called");
    loadRecommendations();
  }, [user]);

  const loadRecommendations = async () => {
    console.log("Recommendations loadRecommendations called");
    if (!user) return;
    
    setLoading(true);
    setLoadingBooks(true);
    setLoadingMovies(true);
    setError('');
    setBookRecommendations([]);
    setMovieRecommendations([]);

    // Carregar recomendações de livros e filmes em paralelo
    const bookPromise = recommendationService.getBookRecommendations(user.id)
      .then((result) => {
        console.log("Recommendations loadRecommendations book result:", result);
        if (result.success) {
          setBookRecommendations(result.data || []);
        } else {
          console.error("Recommendations loadRecommendations book error:", result.error);
        }
        setLoadingBooks(false);
        return result;
      })
      .catch((error) => {
        console.error("Recommendations loadRecommendations book error:", error);
        setBookRecommendations([]);
        setLoadingBooks(false);
        return { success: false, error: error.message };
      });

    const moviePromise = recommendationService.getMovieRecommendations(user.id)
      .then((result) => {
        console.log("Recommendations loadRecommendations movie result:", result);
        if (result.success) {
          setMovieRecommendations(result.data || []);
        } else {
          console.error("Recommendations loadRecommendations movie error:", result.error);
        }
        setLoadingMovies(false);
        return result;
      })
      .catch((error) => {
        console.error("Recommendations loadRecommendations movie error:", error);
        setMovieRecommendations([]);
        setLoadingMovies(false);
        return { success: false, error: error.message };
      });

    // Aguardar ambas as buscas terminarem para verificar erros finais
    Promise.all([bookPromise, moviePromise])
      .then(([bookResult, movieResult]) => {
        // Verificar se houve erros apenas se ambas falharam
        if (!bookResult.success && !movieResult.success) {
          setError('Erro ao carregar recomendações. Tente novamente.');
        } else if (!bookResult.success && movieResult.success) {
          // Se apenas livros falharam, não mostrar erro (filmes funcionaram)
          console.warn('Recomendações de livros falharam, mas filmes foram encontrados.');
        } else if (bookResult.success && !movieResult.success) {
          // Se apenas filmes falharam, não mostrar erro (livros funcionaram)
          console.warn('Recomendações de filmes falharam, mas livros foram encontrados.');
        }
        setLoading(false);
        console.log("Recommendations loadRecommendations loading set to false");
      })
      .catch((error) => {
        setError('Erro ao carregar recomendações.');
        console.error("Recommendations loadRecommendations general error:", error);
        setLoading(false);
        setLoadingBooks(false);
        setLoadingMovies(false);
      });
  };

  // Determinar qual resultado mostrar baseado no filtro
  const currentRecommendations = recommendationType === 'books' ? bookRecommendations : movieRecommendations;
  const currentLoading = recommendationType === 'books' ? loadingBooks : loadingMovies;
  const currentType = recommendationType === 'books' ? 'book' : 'movie';

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <h2>Recomendações para Você</h2>
        <p className="recommendations-subtitle">
          Recomendações personalizadas com base nos itens da sua biblioteca
        </p>
        <div className="recommendation-type-toggle">
          <button
            className={recommendationType === 'books' ? 'active' : ''}
            onClick={() => setRecommendationType('books')}
            disabled={loading}
          >
            Livros ({bookRecommendations.length})
            {loadingBooks && <span className="loading-indicator">...</span>}
          </button>
          <button
            className={recommendationType === 'movies' ? 'active' : ''}
            onClick={() => setRecommendationType('movies')}
            disabled={loading}
          >
            Filmes ({movieRecommendations.length})
            {loadingMovies && <span className="loading-indicator">...</span>}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {currentLoading ? (
        <div className="loading-container">
          <p>Carregando recomendações de {recommendationType === 'books' ? 'livros' : 'filmes'}...</p>
        </div>
      ) : currentRecommendations.length === 0 && !error ? (
        <div className="no-recommendations">
          <p>Não há recomendações de {recommendationType === 'books' ? 'livros' : 'filmes'} disponíveis no momento.</p>
          <p>Adicione {recommendationType === 'books' ? 'livros' : 'filmes'} à sua biblioteca para receber recomendações personalizadas!</p>
        </div>
      ) : (
        <div className="recommendations-content">
          <div className="recommendations-section">
            {currentRecommendations.length > 0 && (
              <div className="recommendations-group">
                <h3>
                  {recommendationType === 'books' ? 'Livros' : 'Filmes'} Recomendados ({currentRecommendations.length})
                </h3>
                <SearchResults results={currentRecommendations} type={currentType} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recommendations;
