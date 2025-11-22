import React, { useState, useMemo } from 'react';
import './SearchResults.css';
import { externalApiService } from '../services/apiService';
import { useUpdate } from '../contexts/UpdateContext';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import DetailsModal from './DetailsModal';

const SearchResults = ({ results, type }) => {
  const { toast, showToast } = useToast();
  const { notificarAtualizacaoBiblioteca } = useUpdate();
  const [mostrarModalDetalhes, setMostrarModalDetalhes] = useState(false);
  const [itemDetalhesSelecionado, setItemDetalhesSelecionado] = useState(null);
  if (!results || results.length === 0) {
    return <p>Nenhum resultado encontrado.</p>;
  }

  const handleAddToLibrary = async (item) => {
    const ehLivro = type === 'book';
    try {
      const resultado = ehLivro
        ? await externalApiService.addBookToLibrary(item.id)
        : await externalApiService.addMovieToLibrary(item.id);
      if (resultado.success) {
        showToast(`${ehLivro ? 'Livro' : 'Filme'} adicionado à biblioteca!`);
        notificarAtualizacaoBiblioteca();
      } else {
        showToast(resultado.error || `Erro ao adicionar ${ehLivro ? 'livro' : 'filme'} à biblioteca`);
      }
    } catch (erro) {
      console.error(`Erro ao adicionar ${ehLivro ? 'livro' : 'filme'} à biblioteca:`, erro);
      showToast(`Erro ao adicionar ${ehLivro ? 'livro' : 'filme'} à biblioteca.`);
    }
  };

  const ehLivro = type === 'book';
  // Placeholder SVG melhorado e mais bonito
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
  const capaPadrao = criarCapaPadrao('Sem Imagem');

  const handleMovieDetails = (filme) => {
    if (!filme?.id) return;
    window.open(`https://www.imdb.com/title/${filme.id}`, '_blank', 'noopener,noreferrer');
  };

  const handleImageError = (e, resultado) => {
    const img = e.target;
    
    // Evitar loop infinito
    if (img.dataset.finalFallback === 'true') {
      return;
    }
    
    // Se for filme e ainda não tentou todas as fontes
    if (!ehLivro && resultado.id) {
      // Tentar 1: API de pôsteres do OMDb (se ainda não tentou)
      if (!img.dataset.triedOmdb) {
        img.dataset.triedOmdb = 'true';
        const urlPosterOmdb = `http://img.omdbapi.com/?apikey=a3f0b40b&i=${resultado.id}`;
        img.src = urlPosterOmdb;
        return;
      }
      
      // Tentar 2: Usar um serviço proxy de imagens do TMDb (sem API key necessário)
      // TMDb permite acesso direto às imagens se você tiver o caminho, mas precisamos buscar primeiro
      // Por enquanto, vamos pular isso e ir direto para o placeholder
    }
    
    // Fallback final: usar placeholder personalizado com título do filme
    img.dataset.finalFallback = 'true';
    img.src = criarCapaPadrao(resultado.title || 'Sem Imagem');
  };

  // Filtrar resultados para garantir que correspondam ao tipo esperado
  // e remover duplicatas baseadas no ID
  const resultadosFiltrados = useMemo(() => {
    const vistos = new Set();
    const filtrados = [];
    
    for (const resultado of results) {
      // Criar uma chave única para detecção de duplicatas
      const id = resultado.id || resultado.external_id;
      const chaveUnica = id ? `${type}-${id}` : null;
      
      // Verificar se já vimos este item
      if (chaveUnica && vistos.has(chaveUnica)) {
        continue; // Pular duplicatas
      }
      
      // Filtro rigoroso baseado no tipo esperado
      if (ehLivro) {
        // É um livro se tem authors ou image_url, E NÃO tem poster_path (característica de filme)
        // Também garantir que NÃO tem release_date (característica de filme)
        const temCaracteristicasLivro = (resultado.authors || resultado.image_url);
        const naoTemCaracteristicasFilme = !resultado.poster_path && !resultado.release_date;
        if (temCaracteristicasLivro && naoTemCaracteristicasFilme) {
          if (chaveUnica) vistos.add(chaveUnica);
          filtrados.push(resultado);
        }
      } else {
        // É um filme se tem poster_path ou release_date, E NÃO tem authors
        // Também garantir que não tem image_url (característica de livro)
        // Validação adicional: verificar se tem IMDb ID (característica de filme)
        const temCaracteristicasFilme = (resultado.poster_path || resultado.release_date || resultado.id);
        const naoTemCaracteristicasLivro = !resultado.authors && !resultado.image_url;
        if (temCaracteristicasFilme && naoTemCaracteristicasLivro) {
          if (chaveUnica) vistos.add(chaveUnica);
          filtrados.push(resultado);
        }
      }
    }
    
    return filtrados;
  }, [results, type, ehLivro]);

  return (
    <div className="search-results-container">
      <div className="book-grid library-compact">
        {resultadosFiltrados.map((resultado, indice) => {
          const autores =
            Array.isArray(resultado.authors) ? resultado.authors.join(', ') : (resultado.authors || 'Autor desconhecido');
          const imagemCapa = ehLivro ? (resultado.image_url || capaPadrao) : (resultado.poster_path || capaPadrao);
          // Usar uma chave única combinando tipo e ID, com fallback para índice
          const chaveUnica = `${type}-${resultado.id || resultado.external_id || indice}`;
          return (
            <div key={chaveUnica} className="book-item">
              <img 
                src={imagemCapa} 
                alt={resultado.title} 
                className="book-cover"
                onError={(e) => handleImageError(e, resultado)}
                onClick={() => {
                  setItemDetalhesSelecionado({ ...resultado, type });
                  setMostrarModalDetalhes(true);
                }}
                style={{ cursor: 'pointer' }}
              />
              <div 
                className="book-content"
                onClick={() => {
                  setItemDetalhesSelecionado({ ...resultado, type });
                  setMostrarModalDetalhes(true);
                }}
                style={{ cursor: 'pointer', flex: 1 }}
              >
                <h3 className="book-title">{resultado.title || 'Sem título'}</h3>
                {ehLivro ? (
                  <p className="book-authors">Autores: {autores}</p>
                ) : (
                  <p className="book-authors">
                    {resultado.release_date ? `Lançamento: ${resultado.release_date}` : 'Sem data'}
                    {resultado.rating && (
                      <span> • Nota IMDb: {
                        typeof resultado.rating === 'number' 
                          ? resultado.rating.toFixed(1) 
                          : (resultado.rating?.score ? resultado.rating.score.toFixed(1) : resultado.rating)
                      }</span>
                    )}
                  </p>
                )}
                {(() => {
                  // Processar gêneros de forma robusta
                  let generos = [];
                  if (resultado.genres) {
                    if (Array.isArray(resultado.genres)) {
                      generos = resultado.genres.filter(g => g && g.trim());
                    } else if (typeof resultado.genres === 'string') {
                      generos = resultado.genres.split(/[,|]/).map(g => g.trim()).filter(g => g);
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
                type="button"
                className="rate-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToLibrary(resultado);
                }}
              >
                Adicionar
              </button>
              {!ehLivro && (
                <button
                  type="button"
                  className="rate-button secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMovieDetails(resultado);
                  }}
                  style={{ marginTop: '5px' }}
                >
                  Ver no IMDb
                </button>
              )}
            </div>
          );
        })}
      </div>
      {resultadosFiltrados.length === 0 && results.length > 0 && (
        <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
          Nenhum {type === 'book' ? 'livro' : 'filme'} válido encontrado nos resultados.
        </p>
      )}
      <DetailsModal
        item={itemDetalhesSelecionado}
        isOpen={mostrarModalDetalhes}
        onClose={() => {
          setMostrarModalDetalhes(false);
          setItemDetalhesSelecionado(null);
        }}
      />
      <Toast message={toast} />
    </div>
  );
};

export default SearchResults;