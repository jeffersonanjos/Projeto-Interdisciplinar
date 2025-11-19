import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { profileService, ratingService, externalApiService, userService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import './Taskbar.css';
import './Profile.css';

const Taskbar = ({ user, metrics, timeline }) => {
  const [openModal, setOpenModal] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const { user: authUser, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { toast, showToast } = useToast();
  
  // Profile state
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ books: 0, movies: 0, ratings: 0 });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const [formData, setFormData] = useState({ bio: '', avatar_url: '' });
  const [accountFormData, setAccountFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalData, setPasswordModalData] = useState({ currentPassword: '', error: '' });
  const [pendingUpdate, setPendingUpdate] = useState(null);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  const avgRating =
    metrics?.avgRating && !Number.isNaN(metrics.avgRating)
      ? Number(metrics.avgRating).toFixed(1)
      : '--';

  const favoriteGenres = metrics?.favoriteGenres?.length
    ? metrics.favoriteGenres
    : [{ label: '???', count: 0 }];

  const safeTimeline = Array.isArray(timeline) && timeline.length
    ? timeline.slice(0, 6)
    : [];

  const toggleModal = (type) => {
    if (type === 'profile') {
      if (openModal !== 'profile') {
        loadProfile();
        loadStats();
        if (authUser) {
          setAccountFormData({
            username: authUser.username || '',
            email: authUser.email || '',
            password: '',
            confirmPassword: ''
          });
        }
      }
    }
    setOpenModal((prev) => (prev === type ? null : type));
  };

  const closeModal = () => {
    setOpenModal(null);
    setEditing(false);
    setEditingAccount(false);
  };
  const toggleVisibility = () => {
    setIsVisible((prev) => {
      if (prev) {
        // Ao ocultar, fecha os modais
        setOpenModal(null);
      }
      return !prev;
    });
  };

  // Profile functions
  const loadProfile = async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      const result = await profileService.getProfile(authUser.id);
      if (result.success && result.data) {
        setProfile(result.data);
        setFormData({
          bio: result.data.bio || '',
          avatar_url: result.data.avatar_url || ''
        });
        if (result.data.avatar_url && !result.data.avatar_url.startsWith('http')) {
          setFormData(prev => ({
            ...prev,
            avatar_url: `http://localhost:8001${result.data.avatar_url}`
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!authUser) return;
    try {
      const [ratingsResult, libraryResult] = await Promise.all([
        ratingService.getUserRatings(authUser.id),
        externalApiService.getUserLibrary(parseInt(authUser.id))
      ]);
      const ratingsArr = ratingsResult.success ? ratingsResult.data : [];
      const libraryArr = libraryResult.success ? libraryResult.data : [];
      setStats({
        books: Array.isArray(libraryArr) ? libraryArr.length : 0,
        movies: 0,
        ratings: ratingsArr.length
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!authUser) return;
    try {
      const result = await profileService.createOrUpdateProfile(authUser.id, { bio: formData.bio });
      if (result.success) {
        setProfile(result.data);
        setEditing(false);
        showToast('Perfil atualizado com sucesso!');
      } else {
        showToast('Erro ao salvar perfil: ' + result.error);
      }
    } catch (error) {
      showToast('Erro ao salvar perfil');
      console.error("Profile handleSave error:", error);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveAvatar = async () => {
    if (!authUser) return;
    if (!window.confirm('Tem certeza que deseja remover seu avatar?')) {
      return;
    }
    try {
      const result = await profileService.removeAvatar(authUser.id);
      if (result.success) {
        setFormData({ ...formData, avatar_url: '' });
        if (profile) {
          setProfile({ ...profile, avatar_url: null });
        }
        if (updateUser) {
          updateUser({ ...authUser, avatar_url: null });
        }
        showToast('Avatar removido com sucesso!');
      } else {
        showToast('Erro ao remover avatar: ' + result.error);
      }
    } catch (error) {
      showToast('Erro ao remover avatar');
      console.error("Profile handleRemoveAvatar error:", error);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem');
      return;
    }
    setUploadingAvatar(true);
    try {
      const result = await profileService.uploadAvatar(authUser.id, file);
      if (result.success) {
        const avatarUrl = result.data.avatar_url;
        const fullAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `http://localhost:8001${avatarUrl}`;
        setFormData({ ...formData, avatar_url: fullAvatarUrl });
        if (profile) {
          setProfile({ ...profile, avatar_url: fullAvatarUrl });
        }
        if (updateUser) {
          updateUser({ ...authUser, avatar_url: fullAvatarUrl });
        }
        showToast('Avatar atualizado com sucesso!');
      } else {
        showToast('Erro ao fazer upload do avatar: ' + result.error);
      }
    } catch (error) {
      showToast('Erro ao fazer upload do avatar');
      console.error("Profile handleFileChange error:", error);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProfile = async () => {
    if (!authUser) return;
    const confirmMessage = 'Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita e todos os seus dados serão perdidos.';
    if (!window.confirm(confirmMessage)) {
      return;
    }
    const doubleConfirm = 'Esta é sua última chance. Tem certeza absoluta?';
    if (!window.confirm(doubleConfirm)) {
      return;
    }
    try {
      const result = await profileService.deleteProfile(authUser.id);
      if (result.success) {
        showToast('Conta deletada com sucesso');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      } else {
        showToast('Erro ao deletar conta: ' + result.error);
      }
    } catch (error) {
      showToast('Erro ao deletar conta');
      console.error("Profile handleDeleteProfile error:", error);
    }
  };

  const handleAccountEdit = () => {
    setEditingAccount(true);
    setAccountFormData({
      username: authUser?.username || '',
      email: authUser?.email || '',
      password: '',
      confirmPassword: ''
    });
  };

  const handleAccountSave = () => {
    if (!authUser) return;
    if (!accountFormData.username || !accountFormData.email) {
      showToast('Nome de usuário e email são obrigatórios');
      return;
    }
    if (accountFormData.password) {
      if (accountFormData.password !== accountFormData.confirmPassword) {
        showToast('As senhas não coincidem');
        return;
      }
      if (accountFormData.password.length < 1) {
        showToast('A senha deve ter pelo menos 1 caractere');
        return;
      }
    }
    const updateData = {
      username: accountFormData.username !== authUser.username ? accountFormData.username : undefined,
      email: accountFormData.email !== authUser.email ? accountFormData.email : undefined,
      password: accountFormData.password || undefined
    };
    const hasChanges = updateData.username || updateData.email || updateData.password;
    if (!hasChanges) {
      showToast('Nenhuma alteração foi feita');
      return;
    }
    setPendingUpdate(updateData);
    setPasswordModalData({ currentPassword: '', error: '' });
    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async () => {
    if (!passwordModalData.currentPassword) {
      setPasswordModalData({ ...passwordModalData, error: 'Por favor, digite sua senha atual' });
      return;
    }
    if (!authUser || !pendingUpdate) return;
    try {
      const updatePayload = {
        current_password: passwordModalData.currentPassword
      };
      if (pendingUpdate.username !== undefined) {
        updatePayload.username = pendingUpdate.username;
      }
      if (pendingUpdate.email !== undefined) {
        updatePayload.email = pendingUpdate.email;
      }
      if (pendingUpdate.password !== undefined) {
        updatePayload.password = pendingUpdate.password;
      }
      const result = await userService.updateUser(authUser.id, updatePayload);
      if (result.success) {
        showToast('Dados atualizados com sucesso!');
        setShowPasswordModal(false);
        setEditingAccount(false);
        setPasswordModalData({ currentPassword: '', error: '' });
        setPendingUpdate(null);
        if (result.data) {
          localStorage.setItem('user', JSON.stringify(result.data));
        }
        try {
          const { authService } = await import('../services/authService');
          const userResponse = await authService.getCurrentUser();
          if (userResponse) {
            localStorage.setItem('user', JSON.stringify(userResponse));
          }
          window.location.reload();
        } catch (error) {
          console.error('Erro ao atualizar dados do usuário:', error);
          window.location.reload();
        }
      } else {
        setPasswordModalData({ ...passwordModalData, error: result.error || 'Erro ao atualizar dados' });
      }
    } catch (error) {
      console.error("Profile handlePasswordConfirm error:", error);
      setPasswordModalData({ ...passwordModalData, error: 'Erro ao atualizar dados' });
    }
  };

  const handlePasswordModalCancel = () => {
    setShowPasswordModal(false);
    setPasswordModalData({ currentPassword: '', error: '' });
    setPendingUpdate(null);
  };

  return (
    <>
      <div className={`taskbar ${!isVisible ? 'taskbar--hidden' : ''}`} role="navigation" aria-label="Atalhos do painel">
        <div className="taskbar-icons">
          <button
            type="button"
            className={`taskbar-icon ${openModal === 'timeline' ? 'active' : ''}`}
            onClick={() => toggleModal('timeline')}
            aria-pressed={openModal === 'timeline'}
            aria-label="Abrir linha do tempo"
          >
            <span className="taskbar-icon__glyph" aria-hidden="true">
              <i className="bi bi-clock-history" />
            </span>
          </button>

          <button
            type="button"
            className={`taskbar-icon ${openModal === 'metrics' ? 'active' : ''}`}
            onClick={() => toggleModal('metrics')}
            aria-pressed={openModal === 'metrics'}
            aria-label="Abrir métricas"
          >
            <span className="taskbar-icon__glyph" aria-hidden="true">
              <i className="bi bi-trophy" />
            </span>
          </button>

          <ThemeToggle />
        </div>

        <div className="taskbar-right">
          <button
            type="button"
            className="taskbar-profile"
            onClick={() => toggleModal('profile')}
            title="Abrir perfil"
          >
            <div className="taskbar-profile__avatar">
              {user?.avatar_url && (
                <img 
                  src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8001${user.avatar_url}`} 
                  alt={`Avatar de ${user.username}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const placeholder = e.target.nextElementSibling;
                    if (placeholder) {
                      placeholder.style.display = 'flex';
                    }
                  }}
                />
              )}
              <span style={{ display: user?.avatar_url ? 'none' : 'flex' }}>{initials}</span>
            </div>
            <div className="taskbar-profile__info">
              <span className="taskbar-profile__name">{user?.username || 'Usuário'}</span>
              <span className="taskbar-profile__email">{user?.email || 'email não informado'}</span>
            </div>
          </button>

          {isVisible && (
            <button
              type="button"
              className="taskbar-toggle"
              onClick={toggleVisibility}
              aria-label="Ocultar taskbar"
              title="Ocultar taskbar"
            >
              <span className="pixel-icon pixel-icon--arrow" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!isVisible && (
        <button
          type="button"
          className="taskbar-toggle taskbar-toggle--hidden"
          onClick={toggleVisibility}
          aria-label="Mostrar taskbar"
          title="Mostrar taskbar"
        >
          <span className="pixel-icon pixel-icon--arrow" aria-hidden="true" />
        </button>
      )}

      {openModal && isVisible && (
        <div className="taskbar-modal__backdrop" onClick={closeModal} role="presentation" />
      )}

      {openModal === 'timeline' && isVisible && (
        <div className="taskbar-modal taskbar-modal--timeline">
          <header className="taskbar-modal__header">
            <span>Hub da Comunidade</span>
            <button type="button" className="taskbar-modal__close" onClick={closeModal}>
              ✕
            </button>
          </header>
          <ul className="taskbar-timeline">
            {safeTimeline.length ? (
              safeTimeline.map((event) => (
                <li key={event.id} className="taskbar-timeline__event">
                  <div className="taskbar-timeline__avatar">
                    {event.avatar ? (
                      <img src={event.avatar} alt={`Avatar de ${event.nickname}`} />
                    ) : (
                      <span>{event.nickname?.slice(0, 2).toUpperCase() || '??'}</span>
                    )}
                  </div>
                  <div className="taskbar-timeline__details">
                    <strong>{event.nickname}</strong>
                    <p>
                      {event.action}
                      {event.highlight ? (
                        <span className="taskbar-timeline__highlight">
                          {` "${event.highlight}"`}
                        </span>
                      ) : null}
                      {event.rating ? ` · ${event.rating}★` : ''}
                    </p>
                    <span className="taskbar-timeline__time">{event.timestamp}</span>
                  </div>
                </li>
              ))
            ) : (
              <li className="taskbar-timeline__empty">Sem atividades recentes por aqui.</li>
            )}
          </ul>
        </div>
      )}

      {openModal === 'metrics' && isVisible && (
        <div className="taskbar-modal taskbar-modal--metrics">
          <header className="taskbar-modal__header">
            <span>Painel de Métricas</span>
            <button type="button" className="taskbar-modal__close" onClick={closeModal}>
              ✕
            </button>
          </header>

          <div className="taskbar-metrics">
            <div className="taskbar-metrics__card">
              <span className="taskbar-metrics__label">Média geral</span>
              <strong className="taskbar-metrics__value">{avgRating}</strong>
            </div>
            <div className="taskbar-metrics__card">
              <span className="taskbar-metrics__label">Total de avaliações</span>
              <strong className="taskbar-metrics__value">{metrics?.totalReviews ?? 0}</strong>
            </div>
          </div>

          <div className="taskbar-genres">
            <span className="taskbar-genres__title">Gêneros preferidos</span>
            <div className="taskbar-genres__chips">
              {favoriteGenres.map((genre) => (
                <span key={genre.label} className="taskbar-genres__chip">
                  {genre.label}
                  {genre.count ? ` · ${genre.count}` : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {openModal === 'profile' && isVisible && (
        <div className="taskbar-modal taskbar-modal--profile">
          <header className="taskbar-modal__header">
            <span>Meu Perfil</span>
            <button type="button" className="taskbar-modal__close" onClick={closeModal}>
              ✕
            </button>
          </header>

          {loading ? (
            <div className="taskbar-profile__loading">Carregando perfil...</div>
          ) : (
            <div className="taskbar-profile__content">
              <div className="taskbar-profile__sidebar">
                <div className="taskbar-profile__avatar-container" style={{ position: 'relative' }}>
                  {uploadingAvatar ? (
                    <div className="avatar-loading">Carregando...</div>
                  ) : formData.avatar_url ? (
                    <img 
                      src={formData.avatar_url.startsWith('http') ? formData.avatar_url : `http://localhost:8001${formData.avatar_url}`}
                      alt="Avatar" 
                      className="avatar-image"
                      onClick={handleAvatarClick}
                      style={{ cursor: 'pointer' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const placeholder = e.target.parentElement.querySelector('.avatar-placeholder');
                        if (placeholder) {
                          placeholder.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div 
                    className="avatar-placeholder" 
                    onClick={handleAvatarClick}
                    style={{ 
                      display: (formData.avatar_url && !uploadingAvatar) ? 'none' : 'flex',
                      cursor: 'pointer'
                    }}
                  >
                    {authUser?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  {formData.avatar_url && !uploadingAvatar && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAvatar();
                      }}
                      className="remove-avatar-button"
                      title="Remover avatar"
                    >
                      ×
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
                
                <div className="taskbar-profile__stats">
                  <div className="stat-card">
                    <h3>{stats.books}</h3>
                    <p>Livros</p>
                  </div>
                  <div className="stat-card">
                    <h3>{stats.movies}</h3>
                    <p>Filmes</p>
                  </div>
                  <div className="stat-card">
                    <h3>{stats.ratings}</h3>
                    <p>Avaliações</p>
                  </div>
                </div>
              </div>

              <div className="taskbar-profile__main">
                <div className="taskbar-profile__info">
                  {!editingAccount ? (
                    <>
                      <h3>{authUser?.username}</h3>
                      <p className="profile-email">{authUser?.email}</p>
                      {!editing && (
                        <button onClick={() => setEditing(true)} className="edit-button">
                          Editar Perfil
                        </button>
                      )}
                      <button onClick={handleAccountEdit} className="edit-account-button">
                        Editar Dados da Conta
                      </button>
                    </>
                  ) : (
                    <div className="account-edit-form">
                      <div className="form-group">
                        <label htmlFor="username-modal">Nome de Usuário</label>
                        <input
                          id="username-modal"
                          type="text"
                          value={accountFormData.username}
                          onChange={(e) => setAccountFormData({ ...accountFormData, username: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="email-modal">Email</label>
                        <input
                          id="email-modal"
                          type="email"
                          value={accountFormData.email}
                          onChange={(e) => setAccountFormData({ ...accountFormData, email: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="password-modal">Nova Senha (deixe em branco para não alterar)</label>
                        <input
                          id="password-modal"
                          type="password"
                          value={accountFormData.password}
                          onChange={(e) => setAccountFormData({ ...accountFormData, password: e.target.value })}
                          className="form-input"
                          placeholder="Nova senha"
                        />
                      </div>
                      {accountFormData.password && (
                        <div className="form-group">
                          <label htmlFor="confirmPassword-modal">Confirmar Nova Senha</label>
                          <input
                            id="confirmPassword-modal"
                            type="password"
                            value={accountFormData.confirmPassword}
                            onChange={(e) => setAccountFormData({ ...accountFormData, confirmPassword: e.target.value })}
                            className="form-input"
                            placeholder="Confirme a nova senha"
                          />
                        </div>
                      )}
                      <div className="form-actions">
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingAccount(false);
                            setAccountFormData({ username: authUser?.username || '', email: authUser?.email || '', password: '', confirmPassword: '' });
                          }} 
                          className="cancel-button"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="button" 
                          onClick={handleAccountSave} 
                          className="save-button"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {editing ? (
                    <form onSubmit={handleSave} className="profile-form">
                      <div className="form-group">
                        <label htmlFor="bio-modal">Biografia</label>
                        <textarea
                          id="bio-modal"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          className="form-textarea"
                          rows="6"
                          placeholder="Conte um pouco sobre você..."
                        />
                      </div>

                      <div className="form-actions">
                        <button type="button" onClick={() => setEditing(false)} className="cancel-button">
                          Cancelar
                        </button>
                        <button type="submit" className="save-button">
                          Salvar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="profile-bio">
                        {profile?.bio ? (
                          <p>{profile.bio}</p>
                        ) : (
                          <p className="no-bio">Nenhuma biografia adicionada ainda.</p>
                        )}
                      </div>
                      <div className="profile-actions">
                        <button 
                          onClick={handleDeleteProfile} 
                          className="delete-profile-button"
                        >
                          Deletar Conta
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal de confirmação de senha */}
          {showPasswordModal && (
            <div className="modal-overlay" onClick={handlePasswordModalCancel}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="modal-close-button"
                  onClick={handlePasswordModalCancel}
                  aria-label="Fechar modal"
                >
                  ×
                </button>
                <h3>Confirmar Senha Atual</h3>
                <p className="modal-description">
                  Para sua segurança, confirme sua senha atual para fazer alterações na conta.
                </p>
                {passwordModalData.error && (
                  <div className="modal-feedback error">
                    {passwordModalData.error}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="currentPassword-modal">Senha Atual</label>
                  <input
                    id="currentPassword-modal"
                    type="password"
                    value={passwordModalData.currentPassword}
                    onChange={(e) => setPasswordModalData({ ...passwordModalData, currentPassword: e.target.value, error: '' })}
                    className="form-input"
                    placeholder="Digite sua senha atual"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handlePasswordConfirm();
                      }
                    }}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={handlePasswordModalCancel}
                    className="cancel-button"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordConfirm}
                    className="submit-button"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Toast message={toast} />
    </>
  );
};

Taskbar.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string,
    email: PropTypes.string,
    avatar_url: PropTypes.string,
  }),
  metrics: PropTypes.shape({
    avgRating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    totalReviews: PropTypes.number,
    favoriteGenres: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        count: PropTypes.number,
      })
    ),
  }),
  timeline: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      nickname: PropTypes.string,
      action: PropTypes.string,
      highlight: PropTypes.string,
      rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      avatar: PropTypes.string,
      timestamp: PropTypes.string,
    })
  ),
};

Taskbar.defaultProps = {
  user: null,
  metrics: {
    avgRating: null,
    totalReviews: 0,
    favoriteGenres: [],
  },
  timeline: [],
};

export default Taskbar;

