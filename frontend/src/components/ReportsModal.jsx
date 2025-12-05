import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { reportService, contentModerationService } from '../services/apiService';
import './ReportsModal.css';

const ReportsModal = ({ onClose, showToast }) => {
  const [view, setView] = useState('history');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  
  const [contentType, setContentType] = useState('books');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const result = await reportService.getReports(statusFilter || null);
      if (result.success) {
        setReports(result.data);
      } else {
        showToast(result.error || 'Erro ao carregar denúncias');
      }
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
      showToast('Erro ao carregar denúncias');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReport = async (reportId, status, note) => {
    try {
      const result = await reportService.updateReport(reportId, { 
        status, 
        resolution_note: note 
      });
      if (result.success) {
        showToast('Denúncia atualizada com sucesso');
        loadReports();
        setSelectedReport(null);
      } else {
        showToast(result.error || 'Erro ao atualizar denúncia');
      }
    } catch (error) {
      console.error('Erro ao atualizar denúncia:', error);
      showToast('Erro ao atualizar denúncia');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta denúncia?')) {
      return;
    }
    try {
      const result = await reportService.deleteReport(reportId);
      if (result.success) {
        showToast('Denúncia deletada com sucesso');
        loadReports();
        setSelectedReport(null);
      } else {
        showToast(result.error || 'Erro ao deletar denúncia');
      }
    } catch (error) {
      console.error('Erro ao deletar denúncia:', error);
      showToast('Erro ao deletar denúncia');
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendente',
      reviewing: 'Em Análise',
      resolved: 'Resolvida',
      dismissed: 'Descartada'
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type) => {
    const labels = {
      user: 'Usuário',
      rating: 'Avaliação',
      review: 'Review'
    };
    return labels[type] || type;
  };

  const handleSearchContent = async () => {
    if (!searchQuery.trim()) {
      showToast('Digite um termo para buscar');
      return;
    }
    
    setSearchLoading(true);
    try {
      const result = contentType === 'books' 
        ? await contentModerationService.searchBooks(searchQuery)
        : await contentModerationService.searchMovies(searchQuery);
        
      if (result.success) {
        setSearchResults(result.data);
        if (result.data.length === 0) {
          showToast(`Nenhum ${contentType === 'books' ? 'livro' : 'filme'} encontrado`);
        }
      } else {
        showToast(result.error || 'Erro ao buscar conteúdo');
      }
    } catch (error) {
      console.error('Erro ao buscar conteúdo:', error);
      showToast('Erro ao buscar conteúdo');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleContentAction = async (contentId, action) => {
    try {
      let result;
      if (contentType === 'books') {
        switch (action) {
          case 'ban':
            result = await contentModerationService.banBook(contentId);
            break;
          case 'unban':
            result = await contentModerationService.unbanBook(contentId);
            break;
          case 'mute':
            result = await contentModerationService.muteBook(contentId);
            break;
          case 'unmute':
            result = await contentModerationService.unmuteBook(contentId);
            break;
          default:
            return;
        }
      } else {
        switch (action) {
          case 'ban':
            result = await contentModerationService.banMovie(contentId);
            break;
          case 'unban':
            result = await contentModerationService.unbanMovie(contentId);
            break;
          case 'mute':
            result = await contentModerationService.muteMovie(contentId);
            break;
          case 'unmute':
            result = await contentModerationService.unmuteMovie(contentId);
            break;
          default:
            return;
        }
      }
      
      if (result.success) {
        showToast(result.data.message || 'Ação aplicada com sucesso');
        handleSearchContent();
        setSelectedContent(null);
      } else {
        showToast(result.error || 'Erro ao aplicar ação');
      }
    } catch (error) {
      console.error('Erro ao aplicar ação:', error);
      showToast('Erro ao aplicar ação');
    }
  };

  return (
    <div className="taskbar-modal taskbar-modal--reports">
      <header className="taskbar-modal__header">
        <span>Central de Denúncias</span>
        <button type="button" className="taskbar-modal__close" onClick={onClose}>
          ✕
        </button>
      </header>
      
      <div className="taskbar-reports__tabs">
        <button 
          className={`taskbar-reports__tab ${view === 'history' ? 'taskbar-reports__tab--active' : ''}`}
          onClick={() => setView('history')}
        >
          Histórico
        </button>
        <button 
          className={`taskbar-reports__tab ${view === 'search' ? 'taskbar-reports__tab--active' : ''}`}
          onClick={() => setView('search')}
        >
          Buscar Conteúdo
        </button>
      </div>

      {view === 'history' && (
        <>
          <div className="taskbar-reports__filter">
            <label htmlFor="status-filter">Status:</label>
            <select 
              id="status-filter"
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="taskbar-reports__select"
            >
              <option value="">Todos</option>
              <option value="pending">Pendente</option>
              <option value="reviewing">Em Análise</option>
              <option value="resolved">Resolvida</option>
              <option value="dismissed">Descartada</option>
            </select>
          </div>

      {loading ? (
        <div className="taskbar-reports__loading">Carregando...</div>
      ) : reports.length === 0 ? (
        <div className="taskbar-reports__empty">Nenhuma denúncia encontrada</div>
      ) : (
        <div className="taskbar-reports__list">
          {reports.map((report) => (
            <div 
              key={report.id} 
              className={`taskbar-reports__item ${selectedReport?.id === report.id ? 'taskbar-reports__item--selected' : ''}`}
              onClick={() => setSelectedReport(report)}
            >
              <div className="taskbar-reports__item-header">
                <span className={`taskbar-reports__status taskbar-reports__status--${report.status}`}>
                  {getStatusLabel(report.status)}
                </span>
                <span className="taskbar-reports__type">{getTypeLabel(report.report_type)}</span>
              </div>
              <div className="taskbar-reports__item-body">
                <p><strong>Motivo:</strong> {report.reason}</p>
                {report.description && <p><strong>Desc:</strong> {report.description}</p>}
                <p className="taskbar-reports__meta">
                  ID Reporter: {report.reporter_id} | Target: {report.target_id}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReport && (
        <div className="taskbar-reports__actions">
          <div className="taskbar-reports__actions-title">Denúncia #{selectedReport.id}</div>
          <div className="taskbar-reports__buttons">
            <button 
              onClick={() => handleUpdateReport(selectedReport.id, 'reviewing', 'Em análise')}
              disabled={selectedReport.status === 'reviewing'}
              className="taskbar-reports__button"
            >
              Em Análise
            </button>
            <button 
              onClick={() => handleUpdateReport(selectedReport.id, 'resolved', 'Resolvida')}
              disabled={selectedReport.status === 'resolved'}
              className="taskbar-reports__button"
            >
              Resolvida
            </button>
            <button 
              onClick={() => handleUpdateReport(selectedReport.id, 'dismissed', 'Descartada')}
              disabled={selectedReport.status === 'dismissed'}
              className="taskbar-reports__button"
            >
              Descartar
            </button>
            <button 
              className="taskbar-reports__button taskbar-reports__button--delete"
              onClick={() => handleDeleteReport(selectedReport.id)}
            >
              Deletar
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {view === 'search' && (
        <>
          <div className="taskbar-reports__content-type">
            <label htmlFor="content-type">Tipo:</label>
            <select 
              id="content-type"
              value={contentType} 
              onChange={(e) => {
                setContentType(e.target.value);
                setSearchResults([]);
                setSelectedContent(null);
              }}
              className="taskbar-reports__select"
            >
              <option value="books">Livros</option>
              <option value="movies">Filmes</option>
            </select>
          </div>

          <div className="taskbar-reports__search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchContent()}
              placeholder={`Buscar ${contentType === 'books' ? 'livro' : 'filme'}...`}
              className="taskbar-reports__search-input"
            />
            <button 
              onClick={handleSearchContent}
              disabled={searchLoading}
              className="taskbar-reports__search-button"
            >
              {searchLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="taskbar-reports__list">
              {searchResults.map((item) => (
                <div 
                  key={item.id} 
                  className={`taskbar-reports__content ${selectedContent?.id === item.id ? 'taskbar-reports__content--selected' : ''}`}
                  onClick={() => setSelectedContent(item)}
                >
                  <div className="taskbar-reports__content-header">
                    <span className="taskbar-reports__content-title">
                      {item.title}
                    </span>
                  </div>
                  <div className="taskbar-reports__content-body">
                    {contentType === 'books' && item.author && (
                      <p><strong>Autor:</strong> {item.author}</p>
                    )}
                    {contentType === 'movies' && item.director && (
                      <p><strong>Diretor:</strong> {item.director}</p>
                    )}
                    <p>
                      <strong>Status:</strong>
                      {item.is_banned && <span className="taskbar-reports__badge taskbar-reports__badge--banned"> BANIDO</span>}
                      {item.is_muted && <span className="taskbar-reports__badge taskbar-reports__badge--muted"> SILENCIADO</span>}
                      {!item.is_banned && !item.is_muted && <span className="taskbar-reports__badge taskbar-reports__badge--normal"> NORMAL</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedContent && (
            <div className="taskbar-reports__actions">
              <div className="taskbar-reports__actions-title">
                Ações para {selectedContent.title}
              </div>
              <div className="taskbar-reports__buttons">
                <button 
                  onClick={() => handleContentAction(selectedContent.id, 'ban')}
                  disabled={selectedContent.is_banned}
                  className="taskbar-reports__button taskbar-reports__button--ban"
                >
                  Banir
                </button>
                <button 
                  onClick={() => handleContentAction(selectedContent.id, 'unban')}
                  disabled={!selectedContent.is_banned}
                  className="taskbar-reports__button taskbar-reports__button--unban"
                >
                  Desbanir
                </button>
                <button 
                  onClick={() => handleContentAction(selectedContent.id, 'mute')}
                  disabled={selectedContent.is_muted}
                  className="taskbar-reports__button taskbar-reports__button--mute"
                >
                  Silenciar
                </button>
                <button 
                  onClick={() => handleContentAction(selectedContent.id, 'unmute')}
                  disabled={!selectedContent.is_muted}
                  className="taskbar-reports__button taskbar-reports__button--unmute"
                >
                  Dessilenciar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

ReportsModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired
};

export default ReportsModal;
