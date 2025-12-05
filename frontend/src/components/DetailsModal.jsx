import React, { useState, useEffect } from 'react';
import './DetailsModal.css';
import { externalApiService, reportService } from '../services/apiService';
import { useUpdate } from '../contexts/UpdateContext';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';

const DetailsModal = ({ item: item, isOpen: estaAberto, onClose: aoFechar }) => {
  const { toast, showToast } = useToast();
  const { notificarAtualizacaoBiblioteca } = useUpdate();
  const [itemDetalhado, setItemDetalhado] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  useEffect(() => {
    if (estaAberto && item) {
      setItemDetalhado(item);
      // Se for filme e não tiver sinopse, buscar detalhes completos
      const ehLivro = item.type === 'book' || 
                     (item.type !== 'movie' && !item.director && (item.authors || item.description));
      
      if (!ehLivro && item.id && (!item.overview || item.overview === 'N/A') && (!item.description || item.description === 'N/A')) {
        setCarregandoDetalhes(true);
        externalApiService.getMovieById(item.id)
          .then(resultado => {
            if (resultado.success && resultado.data) {
              setItemDetalhado({ ...item, ...resultado.data });
            } else {
              // Se falhar, manter o item original
              setItemDetalhado(item);
            }
          })
          .catch(erro => {
            console.error('Erro ao buscar detalhes do filme:', erro);
            // Se falhar, manter o item original
            setItemDetalhado(item);
          })
          .finally(() => {
            setCarregandoDetalhes(false);
          });
      }
    } else if (!estaAberto) {
      // Limpar quando o modal fechar
      setItemDetalhado(null);
      setCarregandoDetalhes(false);
    }
  }, [estaAberto, item]);

  if (!estaAberto || !item || !itemDetalhado) return null;

  // Detectar se é livro ou filme
  // Prioridade: type explícito > presença de director (filme) > presença de authors (livro)
  const ehLivro = itemDetalhado.type === 'book' || 
                 (itemDetalhado.type !== 'movie' && !itemDetalhado.director && (itemDetalhado.authors || itemDetalhado.description));
  
  const lidarComAdicionarABiblioteca = async () => {
    try {
      const resposta = ehLivro
        ? await externalApiService.addBookToLibrary(itemDetalhado.id)
        : await externalApiService.addMovieToLibrary(itemDetalhado.id);
      if (resposta.success) {
        showToast(`${ehLivro ? 'Livro' : 'Filme'} adicionado à biblioteca!`);
        notificarAtualizacaoBiblioteca();
      } else {
        showToast(resposta.error || `Erro ao adicionar ${ehLivro ? 'livro' : 'filme'} à biblioteca`);
      }
    } catch (erro) {
      console.error(`Erro ao adicionar ${ehLivro ? 'livro' : 'filme'} à biblioteca:`, erro);
      showToast(`Erro ao adicionar ${ehLivro ? 'livro' : 'filme'} à biblioteca.`);
    }
  };

  const lidarComDenunciar = async () => {
    const motivo = prompt(`Por que você está denunciando este ${ehLivro ? 'livro' : 'filme'}?`);
    if (!motivo || motivo.trim() === '') {
      showToast('Denúncia cancelada');
      return;
    }

    try {
      const dadosDenuncia = {
        report_type: ehLivro ? 'rating' : 'rating',
        target_id: parseInt(itemDetalhado.id) || 0,
        reason: motivo,
        description: `${ehLivro ? 'Livro' : 'Filme'}: ${itemDetalhado.title}`
      };

      const resposta = await reportService.createReport(dadosDenuncia);
      if (resposta.success) {
        showToast('Denúncia enviada com sucesso!');
      } else {
        showToast(resposta.error || 'Erro ao enviar denúncia');
      }
    } catch (erro) {
      console.error('Erro ao enviar denúncia:', erro);
      showToast('Erro ao enviar denúncia');
    }
  };
  
  // Função para criar placeholder SVG
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
        <text x="100" y="200" font-family="Arial, sans-serif" font-size="14" fill="#cbd5e0" text-anchor="middle">${titulo.length > 20 ? titulo.substring(0, 20) + '...' : titulo}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  };

  const imagemCapa = ehLivro 
    ? (itemDetalhado.image_url || criarCapaPadrao(itemDetalhado.title))
    : (itemDetalhado.poster_path || criarCapaPadrao(itemDetalhado.title));

  const lidarComErroImagem = (e) => {
    const imagem = e.target;
    if (imagem.dataset.finalFallback === 'true') return;
    imagem.dataset.finalFallback = 'true';
    imagem.src = criarCapaPadrao(itemDetalhado.title || 'Sem Imagem');
  };

  const autores = ehLivro && Array.isArray(itemDetalhado.authors) 
    ? itemDetalhado.authors.join(', ') 
    : (ehLivro ? (itemDetalhado.authors || 'Autor desconhecido') : null);

  const generos = itemDetalhado.genres && Array.isArray(itemDetalhado.genres) 
    ? itemDetalhado.genres 
    : (itemDetalhado.genres ? [itemDetalhado.genres] : []);

  const elenco = itemDetalhado.cast && Array.isArray(itemDetalhado.cast) 
    ? itemDetalhado.cast 
    : (itemDetalhado.cast ? [itemDetalhado.cast] : []);

  return (
    <div className="modal-overlay details-modal-overlay" onClick={aoFechar}>
      <div className="modal-content details-modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close-button"
          onClick={aoFechar}
          aria-label="Fechar modal"
        >
          ×
        </button>
        
        <div className="details-modal-body">
          <div className="details-modal-cover">
            <img 
              src={imagemCapa} 
              alt={itemDetalhado.title} 
              className="details-cover-image"
              onError={lidarComErroImagem}
            />
          </div>
          
          <div className="details-modal-info">
            <h2 className="details-title">{itemDetalhado.title || 'Sem título'}</h2>
            {carregandoDetalhes && (
              <p style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Carregando detalhes...
              </p>
            )}
            
            {ehLivro ? (
              <>
                {autores && (
                  <div className="details-field">
                    <span className="details-label">Autor(es):</span>
                    <span className="details-value">{autores}</span>
                  </div>
                )}
                {itemDetalhado.published_date && (
                  <div className="details-field">
                    <span className="details-label">Ano de Publicação:</span>
                    <span className="details-value">{itemDetalhado.published_date}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {itemDetalhado.director && (
                  <div className="details-field">
                    <span className="details-label">Diretor:</span>
                    <span className="details-value">{itemDetalhado.director}</span>
                  </div>
                )}
                {itemDetalhado.release_date && (
                  <div className="details-field">
                    <span className="details-label">Ano de Lançamento:</span>
                    <span className="details-value">{itemDetalhado.release_date}</span>
                  </div>
                )}
                {(itemDetalhado.rating || (itemDetalhado.rating && itemDetalhado.rating.score)) && (
                  <div className="details-field">
                    <span className="details-label">Nota IMDb:</span>
                    <span className="details-value">
                      {typeof itemDetalhado.rating === 'number' 
                        ? itemDetalhado.rating.toFixed(1) 
                        : (itemDetalhado.rating?.score ? itemDetalhado.rating.score.toFixed(1) : 'N/A')}
                    </span>
                  </div>
                )}
                {elenco.length > 0 && (
                  <div className="details-field">
                    <span className="details-label">Principais Atores:</span>
                    <span className="details-value">{elenco.join(', ')}</span>
                  </div>
                )}
              </>
            )}
            
            {generos.length > 0 && (
              <div className="details-field">
                <span className="details-label">Gêneros:</span>
                <div className="details-genres taskbar-genres__chips">
                  {generos.map((genero, indice) => (
                    <span key={indice} className="taskbar-genres__chip">{genero}</span>
                  ))}
                </div>
              </div>
            )}
            
            {((itemDetalhado.description && itemDetalhado.description !== 'N/A') || (itemDetalhado.overview && itemDetalhado.overview !== 'N/A')) && (
              <div className="details-field details-synopsis">
                <span className="details-label">Sinopse:</span>
                <p className="details-synopsis-text">
                  {itemDetalhado.description && itemDetalhado.description !== 'N/A' ? itemDetalhado.description : (itemDetalhado.overview && itemDetalhado.overview !== 'N/A' ? itemDetalhado.overview : '')}
                </p>
              </div>
            )}
            
            <div className="details-modal-actions">
              <button
                type="button"
                className="details-add-button"
                onClick={lidarComAdicionarABiblioteca}
              >
                Adicionar à Biblioteca
              </button>
              <button
                type="button"
                className="details-report-button"
                onClick={lidarComDenunciar}
                title="Denunciar"
              >
                <i className="bi bi-flag" /> Denunciar
              </button>
            </div>
          </div>
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
};

export default DetailsModal;

