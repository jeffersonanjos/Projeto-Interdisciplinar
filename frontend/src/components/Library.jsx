import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdate } from '../contexts/UpdateContext';
import { ratingService, externalApiService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import PixelLoader from './PixelLoader';
import DetailsModal from './DetailsModal';
import './Library.css';

const Library = () => {
  const { user } = useAuth();
  const { notificarAtualizacaoBiblioteca, notificarAtualizacaoAvaliacoes } = useUpdate();
  const [libraryType, setLibraryType] = useState('books'); // 'books' ou 'movies'
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]); // Todos os itens (livros + filmes) para contagem
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadedItems, setLoadedItems] = useState([]); // Itens carregados incrementalmente
  const [loadedBooks, setLoadedBooks] = useState([]); // Livros carregados incrementalmente
  const [loadedMovies, setLoadedMovies] = useState([]); // Filmes carregados incrementalmente
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [ratingForm, setRatingForm] = useState({ score: 0, comment: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isDeletingRating, setIsDeletingRating] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsItem, setSelectedDetailsItem] = useState(null);
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
    setLoadedItems([]);
    setLoadedBooks([]);
    setLoadedMovies([]);
    try {
      const idUsuario = parseInt(user.id, 10);
      
      // Carregar avaliações primeiro (mais rápido)
      const resultadoAvaliacoes = await ratingService.getUserRatings(idUsuario);
      const mapaAvaliacoes = {};
      if (resultadoAvaliacoes.success && Array.isArray(resultadoAvaliacoes.data)) {
        resultadoAvaliacoes.data.forEach((avaliacao) => {
          const idExterno = avaliacao.book_external_id || avaliacao.movie_external_id;
          if (idExterno) {
            mapaAvaliacoes[idExterno] = {
              id: avaliacao.id,
              score: avaliacao.score,
              comment: avaliacao.comment || '',
              created_at: avaliacao.created_at,
            };
          }
        });
      }
      setRatings(mapaAvaliacoes);

      // Carregar livros e filmes em paralelo
      const [resultadoLivros, resultadoFilmes] = await Promise.all([
        externalApiService.getUserLibrary(idUsuario),
        externalApiService.getUserMovieLibrary(idUsuario)
      ]);

      // Processar livros
      const livrosBiblioteca = resultadoLivros.success && Array.isArray(resultadoLivros.data)
        ? resultadoLivros.data
        : [];
      const livrosFiltrados = livrosBiblioteca.filter((item) => item && item.id);
      
      // Processar filmes
      const filmesBiblioteca = resultadoFilmes.success && Array.isArray(resultadoFilmes.data)
        ? resultadoFilmes.data
        : [];
      const filmesFiltrados = filmesBiblioteca.filter((item) => item && item.id);

      // Preparar itens com avaliações
      const livrosComAvaliacoes = livrosFiltrados.map((item) => {
        // Garantir que os gêneros sejam processados corretamente
        let generos = [];
        if (item.genres) {
          if (Array.isArray(item.genres)) {
            generos = item.genres;
          } else if (typeof item.genres === 'string') {
            generos = [item.genres];
          }
        }
        return {
          ...item,
          genres: generos.length > 0 ? generos : null,
          rating: mapaAvaliacoes[item.id] || null,
          type: 'book',
        };
      });

      const filmesComAvaliacoes = filmesFiltrados.map((item) => ({
        ...item,
        rating: mapaAvaliacoes[item.id] || null,
        type: 'movie',
      }));

      const todosItens = [...livrosComAvaliacoes, ...filmesComAvaliacoes];
      setAllItems(todosItens);

      // Carregar livros e filmes imediatamente
      setLoadedBooks(livrosComAvaliacoes);
      setLoadedMovies(filmesComAvaliacoes);

      // Filtrar por tipo selecionado e atualizar itens finais
      const itensFiltrados = libraryType === 'books' 
        ? todosItens.filter(item => item.type === 'book')
        : todosItens.filter(item => item.type === 'movie');

      setItems(itensFiltrados);
    } catch (erro) {
      console.error('Erro ao carregar biblioteca:', erro);
      setItems([]);
      setRatings({});
    } finally {
      setLoading(false);
    }
  };

  const updateItemRating = (idItem, dadosAvaliacao) => {
    setItems((itensAnteriores) =>
      itensAnteriores.map((item) =>
        item.id === idItem ? { ...item, rating: dadosAvaliacao } : item
      )
    );
    setRatings((avaliacoesAnteriores) => {
      const atualizado = { ...avaliacoesAnteriores };
      if (dadosAvaliacao) {
        atualizado[idItem] = dadosAvaliacao;
      } else {
        delete atualizado[idItem];
      }
      return atualizado;
    });
    setSelectedItem((itemAnterior) =>
      itemAnterior && itemAnterior.id === idItem ? { ...itemAnterior, rating: dadosAvaliacao } : itemAnterior
    );
  };

  const handleRateItem = (item) => {
    const avaliacaoExistente = ratings[item.id] || null;
    setSelectedItem(item);
    setSelectedRating(avaliacaoExistente);
    setRatingForm({
      score: avaliacaoExistente ? Number(avaliacaoExistente.score) : 0,
      comment: avaliacaoExistente?.comment || '',
    });
    setHoverRating(0);
    setFeedbackMessage('');
    setIsEditingRating(!avaliacaoExistente);
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

  const handleSubmitRating = async (evento) => {
    evento.preventDefault();
    if (!selectedItem || !user || ratingForm.score === 0) {
      setFeedbackMessage('Selecione uma nota de 1 a 5 para continuar.');
      return;
    }

    setIsSubmittingRating(true);
    setFeedbackMessage('');

    const comentarioNormalizado = ratingForm.comment?.trim() || null;
    const pontuacaoNormalizada = Number(ratingForm.score);

    try {
      if (selectedRating) {
        const payloadAtualizacao = {
          score: pontuacaoNormalizada,
          comment: comentarioNormalizado,
        };
        const resultado = await ratingService.updateRating(selectedRating.id, payloadAtualizacao);
        if (resultado.success) {
          const avaliacaoAtualizada = {
            id: resultado.data.id,
            score: resultado.data.score,
            comment: resultado.data.comment || '',
            created_at: resultado.data.created_at,
          };
          updateItemRating(selectedItem.id, avaliacaoAtualizada);
          setSelectedRating(avaliacaoAtualizada);
          setIsEditingRating(false);
          setFeedbackMessage('Avaliação atualizada!');
          notificarAtualizacaoAvaliacoes();
        } else {
          setFeedbackMessage(resultado.error || 'Erro ao atualizar avaliação.');
        }
      } else {
        const tipoItem = selectedItem.type || libraryType;
        const payloadCriacao = {
          score: pontuacaoNormalizada,
          comment: comentarioNormalizado,
          user_id: user.id,
          ...(tipoItem === 'book'
            ? { book_external_id: selectedItem.id }
            : { movie_external_id: selectedItem.id }),
        };
        const resultado = await ratingService.createRating(payloadCriacao);
        if (resultado.success) {
          const novaAvaliacao = {
            id: resultado.data.id,
            score: resultado.data.score,
            comment: resultado.data.comment || '',
            created_at: resultado.data.created_at,
          };
          updateItemRating(selectedItem.id, novaAvaliacao);
          setSelectedRating(novaAvaliacao);
          setIsEditingRating(false);
          setFeedbackMessage('Avaliação salva!');
          notificarAtualizacaoAvaliacoes();
        } else {
          setFeedbackMessage(resultado.error || 'Erro ao salvar avaliação.');
        }
      }
    } catch (erro) {
      console.error('Erro ao salvar avaliação:', erro);
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
      const resultado = await ratingService.deleteRating(selectedRating.id);
      if (resultado.success) {
        updateItemRating(selectedItem.id, null);
        setSelectedRating(null);
        setRatingForm({ score: 0, comment: '' });
        setIsEditingRating(true);
        setFeedbackMessage('Avaliação removida.');
        notificarAtualizacaoAvaliacoes();
      } else {
        setFeedbackMessage(resultado.error || 'Erro ao remover avaliação.');
      }
    } catch (erro) {
      console.error('Erro ao remover avaliação:', erro);
      setFeedbackMessage('Erro ao remover avaliação.');
    } finally {
      setIsDeletingRating(false);
    }
  };

  const handleRemoveItem = async (item) => {
    if (!item || !item.id) return;
    
    const tipoItem = item.type || libraryType;
    const nomeItem = tipoItem === 'book' ? 'livro' : 'filme';
    
    if (!window.confirm(`Tem certeza que deseja remover "${item.title}" da sua biblioteca?`)) {
      return;
    }

    try {
      const resultado = tipoItem === 'book'
        ? await externalApiService.removeBookFromLibrary(item.id)
        : await externalApiService.removeMovieFromLibrary(item.id);
      
      if (resultado.success) {
        // Remover o item da lista filtrada
        setItems((itensAnteriores) => itensAnteriores.filter((i) => i.id !== item.id));
        // Remover o item da lista completa
        setAllItems((todosItensAnteriores) => todosItensAnteriores.filter((i) => i.id !== item.id));
        // Remover a avaliação associada se existir
        setRatings((avaliacoesAnteriores) => {
          const atualizado = { ...avaliacoesAnteriores };
          delete atualizado[item.id];
          return atualizado;
        });
        showToast(`${tipoItem === 'book' ? 'Livro' : 'Filme'} removido da biblioteca!`);
        notificarAtualizacaoBiblioteca();
      } else {
        showToast(resultado.error || `Erro ao remover ${nomeItem} da biblioteca`);
      }
    } catch (erro) {
      console.error(`Erro ao remover ${nomeItem}:`, erro);
      showToast(`Erro ao remover ${nomeItem} da biblioteca`);
    }
  };

  const renderStars = (pontuacao) => {
    const pontuacaoArredondada = Math.round(pontuacao || 0);
    return (
      <div className="static-stars">
        {[1, 2, 3, 4, 5].map((valor) => (
          <span
            key={valor}
            className={`static-star ${valor <= pontuacaoArredondada ? 'filled' : ''}`}
          >
            ★
          </span>
        ))}
        <span className="score-number">{(pontuacao || 0).toFixed(1)}</span>
      </div>
    );
  };

  // Usar loadedItems durante o carregamento para mostrar itens incrementalmente
  // Se está carregando, usar os itens carregados do tipo atual
  // Se não está carregando mas há itens carregados do tipo atual, usar eles
  const itensExibidos = loading 
    ? (libraryType === 'books' ? loadedBooks : loadedMovies)
    : items;

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
              // Se ainda está carregando, mostrar os livros já carregados
              if (loading && loadedBooks.length > 0) {
                setLoadedItems(loadedBooks);
              }
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
              // Se ainda está carregando, mostrar os filmes já carregados
              if (loading && loadedMovies.length > 0) {
                setLoadedItems(loadedMovies);
              }
            }}
          >
            Filmes ({allItems.filter(item => item.type === 'movie').length})
          </button>
        </div>
      </div>

      {loading && loadedItems.length === 0 ? (
        <PixelLoader message="Carregando biblioteca..." />
      ) : itensExibidos.length === 0 && !loading ? (
        <div className="empty-library">
          <p>Você ainda não tem {libraryType === 'books' ? 'livros' : 'filmes'} na sua biblioteca.</p>
          <p>Use a busca para adicionar {libraryType === 'books' ? 'livros' : 'filmes'}!</p>
        </div>
      ) : (
        <div className="book-grid library-compact">
          {itensExibidos.map((item) => {
            const ehLivro = (item.type || libraryType) === 'book';
            const autores = ehLivro && Array.isArray(item.authors)
              ? item.authors.join(', ')
              : (ehLivro ? (item.authors || 'Autor desconhecido') : null);
            
            // Função para criar placeholder SVG melhorado
            const criarCapaPadrao = (titulo = 'Sem Imagem') => {
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
            const capaPadrao = criarCapaPadrao(item.title || 'Sem Imagem');
            const imagemCapa = ehLivro 
              ? (item.image_url || capaPadrao)
              : (item.poster_path || capaPadrao);
            
            const handleImageError = (e) => {
              const img = e.target;
              
              // Evitar loop infinito
              if (img.dataset.finalFallback === 'true') {
                return;
              }
              
              // Se for filme e ainda não tentou todas as fontes
              if (!ehLivro && item.id) {
                // Tentar 1: API de pôsteres do OMDb (se ainda não tentou)
                if (!img.dataset.triedOmdb) {
                  img.dataset.triedOmdb = 'true';
                  const urlPosterOmdb = `http://img.omdbapi.com/?apikey=a3f0b40b&i=${item.id}`;
                  img.src = urlPosterOmdb;
                  return;
                }
              }
              
              // Fallback final: usar placeholder personalizado com título
              img.dataset.finalFallback = 'true';
              img.src = criarCapaPadrao(item.title || 'Sem Imagem');
            };
            
            return (
              <div key={item.id} className="book-item">
                <img 
                  src={imagemCapa} 
                  alt={item.title} 
                  className="book-cover"
                  onError={handleImageError}
                  onClick={() => {
                    setSelectedDetailsItem({ ...item, type: item.type || libraryType });
                    setShowDetailsModal(true);
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <div 
                  className="book-content"
                  onClick={() => {
                    setSelectedDetailsItem({ ...item, type: item.type || libraryType });
                    setShowDetailsModal(true);
                  }}
                  style={{ cursor: 'pointer', flex: 1 }}
                >
                  <h3 className="book-title">{item.title || 'Sem título'}</h3>
                  {ehLivro && <p className="book-authors">Autores: {autores}</p>}
                  {!ehLivro && (
                    <p className="book-authors">
                      {item.release_date ? `Lançamento: ${item.release_date}` : ''}
                      {item.rating && item.rating.score ? ` • Nota: ${item.rating.score.toFixed(1)}` : ''}
                    </p>
                  )}
                  {(() => {
                    // Processar gêneros de forma robusta
                    let generos = [];
                    if (item.genres) {
                      if (Array.isArray(item.genres)) {
                        generos = item.genres.filter(g => g && g.trim());
                      } else if (typeof item.genres === 'string') {
                        generos = item.genres.split(/[,|]/).map(g => g.trim()).filter(g => g);
                      }
                    }
                    return generos.length > 0 && (
                      <div className="taskbar-genres__chips">
                        {generos.slice(0, 3).map((genero, indice) => (
                          <span key={indice} className="taskbar-genres__chip">{genero}</span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRateItem(item);
                  }}
                  className="rate-button"
                >
                  {item.rating ? 'Editar Avaliação' : 'Avaliar'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveItem(item);
                  }}
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

export default Library;
