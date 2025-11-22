import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { recommendationService } from '../services/apiService';
import SearchResults from './SearchResults';
import PixelLoader from './PixelLoader';
import './Recommendations.css';

const Recommendations = () => {
  console.log("Recommendations component loaded");
  const { user: usuario } = useAuth();
  const [recomendacoesLivros, setRecomendacoesLivros] = useState([]);
  const [recomendacoesFilmes, setRecomendacoesFilmes] = useState([]);
  const [livrosCarregados, setLivrosCarregados] = useState([]); // Livros carregados incrementalmente
  const [filmesCarregados, setFilmesCarregados] = useState([]); // Filmes carregados incrementalmente
  const [carregando, setCarregando] = useState(true);
  const [carregandoLivros, setCarregandoLivros] = useState(true);
  const [carregandoFilmes, setCarregandoFilmes] = useState(true);
  const [erro, setErro] = useState('');
  const [tipoRecomendacao, setTipoRecomendacao] = useState('books'); // 'books' ou 'movies' - agora é apenas um filtro

  useEffect(() => {
    console.log("Recommendations useEffect called");
    carregarRecomendacoes();
  }, [usuario]);

  const carregarRecomendacoes = async () => {
    console.log("Recommendations carregarRecomendacoes called");
    if (!usuario) return;
    
    setCarregando(true);
    setCarregandoLivros(true);
    setCarregandoFilmes(true);
    setErro('');
    setRecomendacoesLivros([]);
    setRecomendacoesFilmes([]);
    setLivrosCarregados([]);
    setFilmesCarregados([]);

    // Carregar recomendações de livros e filmes em paralelo
    const promessaLivros = recommendationService.getBookRecommendations(usuario.id)
      .then(async (resultado) => {
        console.log("Recommendations carregarRecomendacoes livro resultado:", resultado);
        if (resultado.success && Array.isArray(resultado.data)) {
          const livros = resultado.data || [];
          setRecomendacoesLivros(livros);
          
          // Mostrar livros imediatamente
          setLivrosCarregados(livros);
        } else {
          console.error("Recommendations carregarRecomendacoes livro erro:", resultado.error);
        }
        setCarregandoLivros(false);
        return resultado;
      })
      .catch((erro) => {
        console.error("Recommendations carregarRecomendacoes livro erro:", erro);
        setRecomendacoesLivros([]);
        setCarregandoLivros(false);
        return { success: false, error: erro.message };
      });

    const promessaFilmes = recommendationService.getMovieRecommendations(usuario.id)
      .then(async (resultado) => {
        console.log("Recommendations carregarRecomendacoes filme resultado:", resultado);
        if (resultado.success && Array.isArray(resultado.data)) {
          const filmes = resultado.data || [];
          setRecomendacoesFilmes(filmes);
          
          // Mostrar filmes imediatamente
          setFilmesCarregados(filmes);
        } else {
          console.error("Recommendations carregarRecomendacoes filme erro:", resultado.error);
        }
        setCarregandoFilmes(false);
        return resultado;
      })
      .catch((erro) => {
        console.error("Recommendations carregarRecomendacoes filme erro:", erro);
        setRecomendacoesFilmes([]);
        setCarregandoFilmes(false);
        return { success: false, error: erro.message };
      });

    // Aguardar ambas as buscas terminarem para verificar erros finais
    Promise.all([promessaLivros, promessaFilmes])
      .then(([resultadoLivros, resultadoFilmes]) => {
        // Verificar se houve erros apenas se ambas falharam
        if (!resultadoLivros.success && !resultadoFilmes.success) {
          setErro('Erro ao carregar recomendações. Tente novamente.');
        } else if (!resultadoLivros.success && resultadoFilmes.success) {
          // Se apenas livros falharam, não mostrar erro (filmes funcionaram)
          console.warn('Recomendações de livros falharam, mas filmes foram encontrados.');
        } else if (resultadoLivros.success && !resultadoFilmes.success) {
          // Se apenas filmes falharam, não mostrar erro (livros funcionaram)
          console.warn('Recomendações de filmes falharam, mas livros foram encontrados.');
        }
        setCarregando(false);
        console.log("Recommendations carregarRecomendacoes carregando set to false");
      })
      .catch((erro) => {
        setErro('Erro ao carregar recomendações.');
        console.error("Recommendations carregarRecomendacoes erro geral:", erro);
        setCarregando(false);
        setCarregandoLivros(false);
        setCarregandoFilmes(false);
      });
  };

  // Determinar qual resultado mostrar baseado no filtro
  // Durante o carregamento, mostrar itens carregados incrementalmente
  const recomendacoesAtuais = tipoRecomendacao === 'books' 
    ? (carregandoLivros ? livrosCarregados : recomendacoesLivros)
    : (carregandoFilmes ? filmesCarregados : recomendacoesFilmes);
  const carregamentoAtual = tipoRecomendacao === 'books' ? carregandoLivros : carregandoFilmes;
  const tipoAtual = tipoRecomendacao === 'books' ? 'book' : 'movie';

  return (
    <div className="recommendations-container">
      <div className="recommendations-header">
        <h2>Recomendações para Você</h2>
        <p className="recommendations-subtitle">
          Recomendações personalizadas com base nos itens da sua biblioteca
        </p>
        <div className="recommendation-type-toggle">
          <button
            className={tipoRecomendacao === 'books' ? 'active' : ''}
            onClick={() => setTipoRecomendacao('books')}
            disabled={carregando}
          >
            Livros ({recomendacoesLivros.length})
            {carregandoLivros && <span className="loading-indicator">...</span>}
          </button>
          <button
            className={tipoRecomendacao === 'movies' ? 'active' : ''}
            onClick={() => setTipoRecomendacao('movies')}
            disabled={carregando}
          >
            Filmes ({recomendacoesFilmes.length})
            {carregandoFilmes && <span className="loading-indicator">...</span>}
          </button>
        </div>
      </div>

      {erro && (
        <div className="error-message">
          {erro}
        </div>
      )}

      {carregamentoAtual && recomendacoesAtuais.length === 0 ? (
        <PixelLoader message={`Carregando recomendações de ${tipoRecomendacao === 'books' ? 'livros' : 'filmes'}...`} />
      ) : recomendacoesAtuais.length === 0 && !erro && !carregamentoAtual ? (
        <div className="no-recommendations">
          <p>Não há recomendações de {tipoRecomendacao === 'books' ? 'livros' : 'filmes'} disponíveis no momento.</p>
          <p>Adicione {tipoRecomendacao === 'books' ? 'livros' : 'filmes'} à sua biblioteca para receber recomendações personalizadas!</p>
        </div>
      ) : (
        <div className="recommendations-content">
          <div className="recommendations-section">
            {(recomendacoesAtuais.length > 0 || carregamentoAtual) && (
              <div className="recommendations-group">
                <h3>
                  {tipoRecomendacao === 'books' ? 'Livros' : 'Filmes'} Recomendados 
                  {!carregamentoAtual && ` (${recomendacoesAtuais.length})`}
                  {carregamentoAtual && recomendacoesAtuais.length > 0 && ` (${recomendacoesAtuais.length}...)`}
                </h3>
                {recomendacoesAtuais.length > 0 && (
                  <SearchResults results={recomendacoesAtuais} type={tipoAtual} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recommendations;
