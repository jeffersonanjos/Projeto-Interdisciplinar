import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { moderationService } from '../services/apiService';
import './ModerationModal.css';

const ModerationModal = ({ onClose, showToast }) => {
  const [view, setView] = useState('history');
  const [moderations, setModerations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedModeration, setSelectedModeration] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadModerations();
  }, [statusFilter]);

  const loadModerations = async () => {
    setLoading(true);
    try {
      const result = await moderationService.getModerations(statusFilter || null);
      if (result.success) {
        setModerations(result.data);
      } else {
        showToast(result.error || 'Erro ao carregar ações de moderação');
      }
    } catch (error) {
      console.error('Erro ao carregar ações de moderação:', error);
      showToast('Erro ao carregar ações de moderação');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateModeration = async (moderationId, status) => {
    try {
      const result = await moderationService.updateModeration(moderationId, { status });
      if (result.success) {
        showToast('Ação de moderação atualizada com sucesso');
        loadModerations();
        setSelectedModeration(null);
      } else {
        showToast(result.error || 'Erro ao atualizar ação de moderação');
      }
    } catch (error) {
      console.error('Erro ao atualizar ação de moderação:', error);
      showToast('Erro ao atualizar ação de moderação');
    }
  };

  const handleDeleteModeration = async (moderationId) => {
    if (!window.confirm('Tem certeza que deseja deletar esta ação de moderação?')) {
      return;
    }
    try {
      const result = await moderationService.deleteModeration(moderationId);
      if (result.success) {
        showToast('Ação de moderação deletada com sucesso');
        loadModerations();
        setSelectedModeration(null);
      } else {
        showToast(result.error || 'Erro ao deletar ação de moderação');
      }
    } catch (error) {
      console.error('Erro ao deletar ação de moderação:', error);
      showToast('Erro ao deletar ação de moderação');
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Ativa',
      expired: 'Expirada',
      revoked: 'Revogada'
    };
    return labels[status] || status;
  };

  const getActionLabel = (action) => {
    const labels = {
      warning: 'Aviso',
      mute: 'Silenciar',
      ban: 'Banir',
      unban: 'Desbanir',
      unmute: 'Dessilenciar'
    };
    return labels[action] || action;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      showToast('Digite um termo para buscar');
      return;
    }
    
    setSearchLoading(true);
    try {
      const result = await moderationService.searchUsers(searchQuery);
      if (result.success) {
        setSearchResults(result.data);
        if (result.data.length === 0) {
          showToast('Nenhum usuário encontrado');
        }
      } else {
        showToast(result.error || 'Erro ao buscar usuários');
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      showToast('Erro ao buscar usuários');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      let result;
      switch (action) {
        case 'ban':
          result = await moderationService.banUser(userId);
          break;
        case 'unban':
          result = await moderationService.unbanUser(userId);
          break;
        case 'mute':
          result = await moderationService.muteUser(userId);
          break;
        case 'unmute':
          result = await moderationService.unmuteUser(userId);
          break;
        default:
          return;
      }
      
      if (result.success) {
        showToast(result.data.message || 'Ação aplicada com sucesso');
        handleSearchUsers();
        setSelectedUser(null);
      } else {
        showToast(result.error || 'Erro ao aplicar ação');
      }
    } catch (error) {
      console.error('Erro ao aplicar ação:', error);
      showToast('Erro ao aplicar ação');
    }
  };

  return (
    <div className="taskbar-modal taskbar-modal--moderation">
      <header className="taskbar-modal__header">
        <span>Central de Moderação</span>
        <button type="button" className="taskbar-modal__close" onClick={onClose}>
          ✕
        </button>
      </header>
      
      <div className="taskbar-moderation__tabs">
        <button 
          className={`taskbar-moderation__tab ${view === 'history' ? 'taskbar-moderation__tab--active' : ''}`}
          onClick={() => setView('history')}
        >
          Histórico
        </button>
        <button 
          className={`taskbar-moderation__tab ${view === 'search' ? 'taskbar-moderation__tab--active' : ''}`}
          onClick={() => setView('search')}
        >
          Buscar Usuários
        </button>
      </div>

      {view === 'history' && (
        <>
          <div className="taskbar-moderation__filter">
            <label htmlFor="status-filter">Status:</label>
            <select 
              id="status-filter"
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="taskbar-moderation__select"
            >
              <option value="">Todos</option>
              <option value="active">Ativa</option>
              <option value="expired">Expirada</option>
              <option value="revoked">Revogada</option>
            </select>
          </div>

      {loading ? (
        <div className="taskbar-moderation__loading">Carregando...</div>
      ) : moderations.length === 0 ? (
        <div className="taskbar-moderation__empty">Nenhuma ação de moderação encontrada</div>
      ) : (
        <div className="taskbar-moderation__list">
          {moderations.map((moderation) => (
            <div 
              key={moderation.id} 
              className={`taskbar-moderation__item ${selectedModeration?.id === moderation.id ? 'taskbar-moderation__item--selected' : ''}`}
              onClick={() => setSelectedModeration(moderation)}
            >
              <div className="taskbar-moderation__item-header">
                <span className={`taskbar-moderation__status taskbar-moderation__status--${moderation.status}`}>
                  {getStatusLabel(moderation.status)}
                </span>
                <span className="taskbar-moderation__action">{getActionLabel(moderation.action_type)}</span>
              </div>
              <div className="taskbar-moderation__item-body">
                <p><strong>Motivo:</strong> {moderation.reason}</p>
                {moderation.description && <p><strong>Desc:</strong> {moderation.description}</p>}
                <p className="taskbar-moderation__meta">
                  Usuário: {moderation.target_user_id} | Moderador: {moderation.moderator_id}
                </p>
                {moderation.expires_at && (
                  <p className="taskbar-moderation__meta">
                    Expira em: {formatDate(moderation.expires_at)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedModeration && (
        <div className="taskbar-moderation__actions">
          <div className="taskbar-moderation__actions-title">Moderação #{selectedModeration.id}</div>
          <div className="taskbar-moderation__buttons">
            <button 
              onClick={() => handleUpdateModeration(selectedModeration.id, 'revoked')}
              disabled={selectedModeration.status === 'revoked'}
              className="taskbar-moderation__button"
            >
              Revogar
            </button>
            <button 
              onClick={() => handleUpdateModeration(selectedModeration.id, 'expired')}
              disabled={selectedModeration.status === 'expired'}
              className="taskbar-moderation__button"
            >
              Marcar Expirada
            </button>
            <button 
              onClick={() => handleUpdateModeration(selectedModeration.id, 'active')}
              disabled={selectedModeration.status === 'active'}
              className="taskbar-moderation__button"
            >
              Reativar
            </button>
            <button 
              className="taskbar-moderation__button taskbar-moderation__button--delete"
              onClick={() => handleDeleteModeration(selectedModeration.id)}
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
          <div className="taskbar-moderation__search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
              placeholder="Buscar usuário por nome ou email..."
              className="taskbar-moderation__search-input"
            />
            <button 
              onClick={handleSearchUsers}
              disabled={searchLoading}
              className="taskbar-moderation__search-button"
            >
              {searchLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="taskbar-moderation__list">
              {searchResults.map((user) => (
                <div 
                  key={user.id} 
                  className={`taskbar-moderation__user ${selectedUser?.id === user.id ? 'taskbar-moderation__user--selected' : ''}`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="taskbar-moderation__user-header">
                    <span className="taskbar-moderation__user-name">{user.username}</span>
                    <span className="taskbar-moderation__user-role">{user.role}</span>
                  </div>
                  <div className="taskbar-moderation__user-body">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p>
                      <strong>Status:</strong> 
                      {user.is_banned && <span className="taskbar-moderation__badge taskbar-moderation__badge--banned"> BANIDO</span>}
                      {user.is_muted && <span className="taskbar-moderation__badge taskbar-moderation__badge--muted"> SILENCIADO</span>}
                      {!user.is_banned && !user.is_muted && <span className="taskbar-moderation__badge taskbar-moderation__badge--normal"> NORMAL</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="taskbar-moderation__actions">
              <div className="taskbar-moderation__actions-title">
                Ações para {selectedUser.username}
              </div>
              <div className="taskbar-moderation__buttons">
                <button 
                  onClick={() => handleUserAction(selectedUser.id, 'ban')}
                  disabled={selectedUser.is_banned}
                  className="taskbar-moderation__button taskbar-moderation__button--ban"
                >
                  Banir
                </button>
                <button 
                  onClick={() => handleUserAction(selectedUser.id, 'unban')}
                  disabled={!selectedUser.is_banned}
                  className="taskbar-moderation__button taskbar-moderation__button--unban"
                >
                  Desbanir
                </button>
                <button 
                  onClick={() => handleUserAction(selectedUser.id, 'mute')}
                  disabled={selectedUser.is_muted}
                  className="taskbar-moderation__button taskbar-moderation__button--mute"
                >
                  Silenciar
                </button>
                <button 
                  onClick={() => handleUserAction(selectedUser.id, 'unmute')}
                  disabled={!selectedUser.is_muted}
                  className="taskbar-moderation__button taskbar-moderation__button--unmute"
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

ModerationModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired
};

export default ModerationModal;
