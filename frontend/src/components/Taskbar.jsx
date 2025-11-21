import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { profileService, ratingService, externalApiService, userService, timelineService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import './Taskbar.css';
import './Profile.css';

const Taskbar = ({ user, metrics, timeline, followingTimeline = [] }) => {
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
  const [personalTimeline, setPersonalTimeline] = useState([]);
  const [personalTimelineLoading, setPersonalTimelineLoading] = useState(false);
  
  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [selectedUserStats, setSelectedUserStats] = useState({ books: 0, movies: 0, ratings: 0 });
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [canFollow, setCanFollow] = useState(false);
  const [selectedUserActivities, setSelectedUserActivities] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

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
  const safeFollowingTimeline = Array.isArray(followingTimeline) && followingTimeline.length
    ? followingTimeline.slice(0, 6)
    : [];

  const toggleModal = (type) => {
    if (type === 'profile') {
      if (openModal !== 'profile') {
        loadProfile();
        loadStats();
        loadPersonalTimeline();
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
    if (type === 'search') {
      if (openModal !== 'search') {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUser(null);
        setSelectedUserProfile(null);
      }
    }
    setOpenModal((prev) => (prev === type ? null : type));
  };

  const loadPersonalTimeline = async () => {
    if (!authUser) return;
    setPersonalTimelineLoading(true);
    try {
      const result = await userService.getUserActivities(authUser.id, 6);
      if (result.success && result.data) {
        // Buscar avatar do perfil ou do usuário
        const profileAvatar = profile?.avatar_url 
          ? (profile.avatar_url.startsWith('http') 
              ? profile.avatar_url 
              : `http://localhost:8001${profile.avatar_url}`)
          : null;
        const userAvatar = authUser.avatar_url 
          ? (authUser.avatar_url.startsWith('http') 
              ? authUser.avatar_url 
              : `http://localhost:8001${authUser.avatar_url}`)
          : null;
        const finalAvatar = profileAvatar || userAvatar;
        
        const timeline = result.data.map((activity) => {
          const date = activity.created_at ? new Date(activity.created_at) : new Date();
          return {
            id: activity.id,
            nickname: authUser.username,
            action: activity.action || 'avaliou',
            highlight: activity.highlight || null,
            rating: activity.rating || null,
            timestamp: formatRelativeTime(date),
            avatar: finalAvatar
          };
        });
        setPersonalTimeline(timeline);
      } else {
        setPersonalTimeline([]);
      }
    } catch (error) {
      console.error('Erro ao carregar timeline pessoal:', error);
      setPersonalTimeline([]);
    } finally {
      setPersonalTimelineLoading(false);
    }
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

  // User search functions
  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const result = await userService.searchUsers(searchQuery.trim(), 10);
      if (result.success) {
        setSearchResults(result.data || []);
      } else {
        setSearchResults([]);
        showToast('Erro ao buscar usuários: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setSearchResults([]);
      showToast('Erro ao buscar usuários');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setSelectedUserLoading(true);
    try {
      const userId = parseInt(user.id, 10);
      const [profileResult, ratingsResult, libraryResult, moviesResult, followStatusResult, activitiesResult, followersResult, followingResult] = await Promise.all([
        profileService.getProfile(user.id),
        ratingService.getUserRatings(user.id),
        externalApiService.getUserLibrary(userId),
        externalApiService.getUserMovieLibrary(userId),
        userService.checkFollowStatus(user.id),
        userService.getUserActivities(user.id, 6),
        userService.getFollowers(user.id),
        userService.getFollowing(user.id)
      ]);
      
      if (profileResult.success && profileResult.data) {
        setSelectedUserProfile(profileResult.data);
      } else {
        setSelectedUserProfile(null);
      }
      
      const ratingsArr = ratingsResult.success ? ratingsResult.data : [];
      const libraryArr = libraryResult.success ? libraryResult.data : [];
      const moviesArr = moviesResult.success ? moviesResult.data : [];
      setSelectedUserStats({
        books: Array.isArray(libraryArr) ? libraryArr.length : 0,
        movies: Array.isArray(moviesArr) ? moviesArr.length : 0,
        ratings: ratingsArr.length
      });
      
      // Atualizar status de follow
      if (followStatusResult.success && followStatusResult.data) {
        setIsFollowing(followStatusResult.data.following || false);
        setCanFollow(followStatusResult.data.can_follow || false);
      } else {
        setIsFollowing(false);
        setCanFollow(false);
      }
      
      // Carregar seguidores e seguindo
      if (followersResult.success && followersResult.data) {
        setFollowers(followersResult.data);
      } else {
        setFollowers([]);
      }
      
      if (followingResult.success && followingResult.data) {
        setFollowing(followingResult.data);
      } else {
        setFollowing([]);
      }
      
      // Processar atividades
      if (activitiesResult.success && activitiesResult.data) {
        const profileAvatar = profileResult.success && profileResult.data 
          ? (profileResult.data.avatar_url?.startsWith('http') 
              ? profileResult.data.avatar_url 
              : profileResult.data.avatar_url 
                ? `http://localhost:8001${profileResult.data.avatar_url}` 
                : null)
          : null;
        const userAvatar = user.avatar_url 
          ? (user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8001${user.avatar_url}`)
          : null;
        
        const activities = activitiesResult.data.map((activity) => {
          const date = activity.created_at ? new Date(activity.created_at) : new Date();
          return {
            id: activity.id,
            nickname: user.username,
            action: activity.action || 'avaliou',
            highlight: activity.highlight || null,
            rating: activity.rating || null,
            timestamp: formatRelativeTime(date),
            avatar: profileAvatar || userAvatar || null
          };
        });
        setSelectedUserActivities(activities);
      } else {
        setSelectedUserActivities([]);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
    } finally {
      setSelectedUserLoading(false);
    }
  };

  const formatRelativeTime = (date) => {
    if (!date) return 'há algum tempo';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;

    return date.toLocaleDateString('pt-BR');
  };

  const handleFollowToggle = async () => {
    if (!selectedUser || !canFollow) return;
    
    try {
      let result;
      if (isFollowing) {
        result = await userService.unfollowUser(selectedUser.id);
      } else {
        result = await userService.followUser(selectedUser.id);
      }
      
      if (result.success) {
        setIsFollowing(result.data.following || !isFollowing);
        showToast(isFollowing ? 'Deixou de seguir o usuário' : 'Agora você está seguindo este usuário');
      } else {
        showToast(result.error || 'Erro ao atualizar status de follow');
      }
    } catch (error) {
      console.error('Erro ao atualizar follow:', error);
      showToast('Erro ao atualizar status de follow');
    }
  };

  useEffect(() => {
    if (openModal === 'search' && searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearchUsers();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (openModal === 'search' && !searchQuery.trim()) {
      setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, openModal]);

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

          <button
            type="button"
            className={`taskbar-icon ${openModal === 'search' ? 'active' : ''}`}
            onClick={() => toggleModal('search')}
            aria-pressed={openModal === 'search'}
            aria-label="Buscar usuários"
            title="Buscar usuários"
          >
            <span className="taskbar-icon__glyph" aria-hidden="true">
              <i className="bi bi-search" />
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
          
          {safeFollowingTimeline.length > 0 && (
            <>
              <div className="taskbar-timeline__section-header">
                <span>Pessoas que você segue</span>
              </div>
              <ul className="taskbar-timeline">
                {safeFollowingTimeline.map((event) => (
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
                ))}
              </ul>
              <div className="taskbar-timeline__divider"></div>
            </>
          )}
          
          <div className="taskbar-timeline__section-header">
            <span>Atividades Gerais</span>
          </div>
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

                      {personalTimeline.length > 0 && (
                        <div className="taskbar-profile__activities">
                          <h4 style={{ 
                            fontSize: '10px', 
                            color: 'var(--text-tertiary)', 
                            marginBottom: '12px',
                            fontFamily: "'Press Start 2P', monospace"
                          }}>
                            Minhas Atividades Recentes
                          </h4>
                          {personalTimelineLoading ? (
                            <div className="taskbar-profile__loading">Carregando...</div>
                          ) : (
                            <ul className="taskbar-timeline" style={{ margin: 0, padding: 0 }}>
                              {personalTimeline.map((activity) => (
                                <li key={activity.id} className="taskbar-timeline__event">
                                  <div className="taskbar-timeline__avatar">
                                    {activity.avatar ? (
                                      <img 
                                        src={activity.avatar.startsWith('http') 
                                          ? activity.avatar 
                                          : `http://localhost:8001${activity.avatar}`} 
                                        alt={`Avatar de ${activity.nickname}`}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          const placeholder = e.target.nextElementSibling;
                                          if (placeholder) {
                                            placeholder.style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <span style={{ display: activity.avatar ? 'none' : 'flex' }}>
                                      {activity.nickname?.slice(0, 2).toUpperCase() || '??'}
                                    </span>
                                  </div>
                                  <div className="taskbar-timeline__details">
                                    <strong>{activity.nickname}</strong>
                                    <p>
                                      {activity.action}
                                      {activity.highlight ? (
                                        <span className="taskbar-timeline__highlight">
                                          {` "${activity.highlight}"`}
                                        </span>
                                      ) : null}
                                      {activity.rating ? ` · ${activity.rating}★` : ''}
                                    </p>
                                    <span className="taskbar-timeline__time">{activity.timestamp}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

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

      {openModal === 'search' && isVisible && (
        <div className="taskbar-modal taskbar-modal--search">
          <header className="taskbar-modal__header">
            <span>Buscar Usuários</span>
            <button type="button" className="taskbar-modal__close" onClick={closeModal}>
              ✕
            </button>
          </header>

          <div className="taskbar-search__content">
            <div className="taskbar-search__input-container">
              <input
                type="text"
                className="taskbar-search__input"
                placeholder="Digite o nome de usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchLoading && (
                <div className="taskbar-search__loading">Buscando...</div>
              )}
            </div>

            {selectedUser ? (
              <div className="taskbar-search__user-profile">
                <button
                  type="button"
                  className="taskbar-search__back-button"
                  onClick={() => {
                    setSelectedUser(null);
                    setSelectedUserProfile(null);
                    setIsFollowing(false);
                    setCanFollow(false);
                    setSelectedUserActivities([]);
                    setFollowers([]);
                    setFollowing([]);
                    setShowFollowersModal(false);
                    setShowFollowingModal(false);
                  }}
                >
                  ← Voltar
                </button>

                {selectedUserLoading ? (
                  <div className="taskbar-profile__loading">Carregando perfil...</div>
                ) : (
                  <div className="taskbar-profile__content">
                    <div className="taskbar-profile__sidebar">
                      <div className="taskbar-profile__avatar-container">
                        {selectedUserProfile?.avatar_url ? (
                          <img 
                            src={selectedUserProfile.avatar_url.startsWith('http') 
                              ? selectedUserProfile.avatar_url 
                              : `http://localhost:8001${selectedUserProfile.avatar_url}`}
                            alt="Avatar" 
                            className="avatar-image"
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
                          style={{ 
                            display: (selectedUserProfile?.avatar_url) ? 'none' : 'flex'
                          }}
                        >
                          {selectedUser?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </div>
                      
                      <div className="taskbar-profile__stats">
                        <div className="stat-card">
                          <h3>{selectedUserStats.books}</h3>
                          <p>Livros</p>
                        </div>
                        <div className="stat-card">
                          <h3>{selectedUserStats.movies}</h3>
                          <p>Filmes</p>
                        </div>
                        <div className="stat-card">
                          <h3>{selectedUserStats.ratings}</h3>
                          <p>Avaliações</p>
                        </div>
                      </div>
                    </div>

                    <div className="taskbar-profile__main">
                      <div className="taskbar-profile__info">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <h3 style={{ margin: 0 }}>{selectedUser?.username}</h3>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setShowFollowersModal(true)}
                                  className="followers-following-button"
                                  title="Ver seguidores"
                                >
                                  {followers.length} seguidores
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowFollowingModal(true)}
                                  className="followers-following-button"
                                  title="Ver seguindo"
                                >
                                  {following.length} seguindo
                                </button>
                              </div>
                            </div>
                            <p className="profile-email">{selectedUser?.email}</p>
                          </div>
                        </div>
                        
                        {canFollow && (
                          <div style={{ marginBottom: '16px' }}>
                            <button
                              type="button"
                              onClick={handleFollowToggle}
                              className={isFollowing ? "unfollow-button" : "follow-button"}
                            >
                              {isFollowing ? 'Seguindo' : 'Seguir'}
                            </button>
                          </div>
                        )}
                        
                        <div className="profile-bio">
                          {selectedUserProfile?.bio ? (
                            <p>{selectedUserProfile.bio}</p>
                          ) : (
                            <p className="no-bio">Nenhuma biografia adicionada ainda.</p>
                          )}
                        </div>

                        {selectedUserActivities.length > 0 && (
                          <div className="taskbar-profile__activities">
                            <h4 style={{ 
                              fontSize: '10px', 
                              color: 'var(--text-tertiary)', 
                              marginBottom: '12px',
                              fontFamily: "'Press Start 2P', monospace"
                            }}>
                              Atividades Recentes
                            </h4>
                            <ul className="taskbar-timeline" style={{ margin: 0, padding: 0 }}>
                              {selectedUserActivities.map((activity) => (
                                <li key={activity.id} className="taskbar-timeline__event">
                                  <div className="taskbar-timeline__avatar">
                                    {activity.avatar ? (
                                      <img 
                                        src={activity.avatar.startsWith('http') 
                                          ? activity.avatar 
                                          : `http://localhost:8001${activity.avatar}`} 
                                        alt={`Avatar de ${activity.nickname}`}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          const placeholder = e.target.nextElementSibling;
                                          if (placeholder) {
                                            placeholder.style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <span style={{ display: activity.avatar ? 'none' : 'flex' }}>
                                      {activity.nickname?.slice(0, 2).toUpperCase() || '??'}
                                    </span>
                                  </div>
                                  <div className="taskbar-timeline__details">
                                    <strong>{activity.nickname}</strong>
                                    <p>
                                      {activity.action}
                                      {activity.highlight ? (
                                        <span className="taskbar-timeline__highlight">
                                          {` "${activity.highlight}"`}
                                        </span>
                                      ) : null}
                                      {activity.rating ? ` · ${activity.rating}★` : ''}
                                    </p>
                                    <span className="taskbar-timeline__time">{activity.timestamp}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="taskbar-search__results">
                {searchResults.length > 0 ? (
                  <ul className="taskbar-search__results-list">
                    {searchResults.map((user) => (
                      <li 
                        key={user.id} 
                        className="taskbar-search__result-item"
                        onClick={() => handleSelectUser(user)}
                      >
                        <div className="taskbar-search__result-avatar">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url.startsWith('http') 
                                ? user.avatar_url 
                                : `http://localhost:8001${user.avatar_url}`}
                              alt={`Avatar de ${user.username}`}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const placeholder = e.target.nextElementSibling;
                                if (placeholder) {
                                  placeholder.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <span style={{ display: user.avatar_url ? 'none' : 'flex' }}>
                            {user.username?.slice(0, 2).toUpperCase() || '??'}
                          </span>
                        </div>
                        <div className="taskbar-search__result-info">
                          <strong>{user.username}</strong>
                          <span>{user.email}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : searchQuery.trim() && !searchLoading ? (
                  <div className="taskbar-search__empty">
                    Nenhum usuário encontrado.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Seguidores */}
      {showFollowersModal && (
        <div className="modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setShowFollowersModal(false)}
              aria-label="Fechar modal"
            >
              ×
            </button>
            <h3>Seguidores</h3>
            <div className="followers-list">
              {followers.length > 0 ? (
                <ul className="taskbar-search__results-list">
                  {followers.map((follower) => (
                    <li 
                      key={follower.id} 
                      className="taskbar-search__result-item"
                      onClick={() => {
                        setShowFollowersModal(false);
                        handleSelectUser(follower);
                      }}
                    >
                      <div className="taskbar-search__result-avatar">
                        <span>{follower.username?.slice(0, 2).toUpperCase() || '??'}</span>
                      </div>
                      <div className="taskbar-search__result-info">
                        <strong>{follower.username}</strong>
                        <span>{follower.email}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                  Nenhum seguidor ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seguindo */}
      {showFollowingModal && (
        <div className="modal-overlay" onClick={() => setShowFollowingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setShowFollowingModal(false)}
              aria-label="Fechar modal"
            >
              ×
            </button>
            <h3>Seguindo</h3>
            <div className="following-list">
              {following.length > 0 ? (
                <ul className="taskbar-search__results-list">
                  {following.map((followed) => (
                    <li 
                      key={followed.id} 
                      className="taskbar-search__result-item"
                      onClick={() => {
                        setShowFollowingModal(false);
                        handleSelectUser(followed);
                      }}
                    >
                      <div className="taskbar-search__result-avatar">
                        <span>{followed.username?.slice(0, 2).toUpperCase() || '??'}</span>
                      </div>
                      <div className="taskbar-search__result-info">
                        <strong>{followed.username}</strong>
                        <span>{followed.email}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                  Não está seguindo ninguém ainda.
                </p>
              )}
            </div>
          </div>
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
  followingTimeline: PropTypes.arrayOf(
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
  followingTimeline: PropTypes.arrayOf(
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
  followingTimeline: [],
};

export default Taskbar;

