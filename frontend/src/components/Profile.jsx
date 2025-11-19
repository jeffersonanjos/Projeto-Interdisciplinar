import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { profileService, ratingService, externalApiService, userService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import './Profile.css';

const Profile = () => {
  console.log("Profile component loaded");
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ books: 0, movies: 0, ratings: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const [formData, setFormData] = useState({ bio: '', avatar_url: '' });
  const [accountFormData, setAccountFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalData, setPasswordModalData] = useState({ currentPassword: '', error: '' });
  const [pendingUpdate, setPendingUpdate] = useState(null); // Armazena os dados que serão atualizados após confirmação
  const { toast, showToast } = useToast();

  useEffect(() => {
	console.log("Profile useEffect called");
    loadProfile();
    loadStats();
    if (user) {
      setAccountFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const loadProfile = async () => {
	console.log("Profile loadProfile called");
    if (!user) return;
    
    try {
      const result = await profileService.getProfile(user.id);
	  console.log("Profile loadProfile result:", result);
      if (result.success && result.data) {
        setProfile(result.data);
		console.log("Profile loadProfile profile set:", result.data);
        setFormData({
          bio: result.data.bio || '',
          avatar_url: result.data.avatar_url || ''
        });
        // Se houver avatar, garantir que a URL está completa
        if (result.data.avatar_url && !result.data.avatar_url.startsWith('http')) {
          setFormData(prev => ({
            ...prev,
            avatar_url: `http://localhost:8001${result.data.avatar_url}`
          }));
        }
		console.log("Profile loadProfile formData set:", formData);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
	  console.log("Profile loadProfile loading set to false");
    }
  };

  const loadStats = async () => {
	console.log("Profile loadStats called");
    if (!user) return;
    
    try {
      const [ratingsResult, libraryResult] = await Promise.all([
        ratingService.getUserRatings(user.id),
        externalApiService.getUserLibrary(parseInt(user.id))
      ]);
      console.log("Profile loadStats ratingsResult:", ratingsResult, "libraryResult:", libraryResult);
      const ratingsArr = ratingsResult.success ? ratingsResult.data : [];
      const libraryArr = libraryResult.success ? libraryResult.data : [];
      setStats({
        books: Array.isArray(libraryArr) ? libraryArr.length : 0,
        movies: 0,
        ratings: ratingsArr.length
      });
      console.log("Profile loadStats stats set:", {
        books: Array.isArray(libraryArr) ? libraryArr.length : 0,
        movies: 0,
        ratings: ratingsArr.length
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleSave = async (e) => {
	console.log("Profile handleSave called");
    e.preventDefault();
    if (!user) return;

    try {
      const result = await profileService.createOrUpdateProfile(user.id, { bio: formData.bio });
	  console.log("Profile handleSave createOrUpdateProfile result:", result);
      if (result.success) {
        setProfile(result.data);
		console.log("Profile handleSave profile set:", result.data);
        setEditing(false);
		console.log("Profile handleSave editing set to false");
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
    if (!user) return;
    
    if (!window.confirm('Tem certeza que deseja remover seu avatar?')) {
      return;
    }

    try {
      const result = await profileService.removeAvatar(user.id);
      if (result.success) {
        setFormData({ ...formData, avatar_url: '' });
        if (profile) {
          setProfile({ ...profile, avatar_url: null });
        }
        // Atualizar o usuário no contexto para sincronizar com taskbar
        if (updateUser) {
          updateUser({ ...user, avatar_url: null });
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
    if (!file || !user) return;

    // Validar se é uma imagem
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem');
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await profileService.uploadAvatar(user.id, file);
      if (result.success) {
        // Atualizar o avatar na interface
        const avatarUrl = result.data.avatar_url;
        const fullAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `http://localhost:8001${avatarUrl}`;
        setFormData({ ...formData, avatar_url: fullAvatarUrl });
        if (profile) {
          setProfile({ ...profile, avatar_url: fullAvatarUrl });
        }
        // Atualizar o usuário no contexto para sincronizar com taskbar
        if (updateUser) {
          updateUser({ ...user, avatar_url: fullAvatarUrl });
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
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProfile = async () => {
    if (!user) return;
    
    const confirmMessage = 'Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita e todos os seus dados serão perdidos.';
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const doubleConfirm = 'Esta é sua última chance. Tem certeza absoluta?';
    if (!window.confirm(doubleConfirm)) {
      return;
    }

    try {
      const result = await profileService.deleteProfile(user.id);
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
      username: user?.username || '',
      email: user?.email || '',
      password: '',
      confirmPassword: ''
    });
  };

  const handleAccountSave = () => {
    if (!user) return;

    // Validar campos
    if (!accountFormData.username || !accountFormData.email) {
      showToast('Nome de usuário e email são obrigatórios');
      return;
    }

    // Se está alterando a senha, verificar se as senhas coincidem
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

    // Preparar dados para atualização
    const updateData = {
      username: accountFormData.username !== user.username ? accountFormData.username : undefined,
      email: accountFormData.email !== user.email ? accountFormData.email : undefined,
      password: accountFormData.password || undefined
    };

    // Verificar se há algo para atualizar
    const hasChanges = updateData.username || updateData.email || updateData.password;
    if (!hasChanges) {
      showToast('Nenhuma alteração foi feita');
      return;
    }

    // Armazenar dados pendentes e abrir modal de confirmação de senha
    setPendingUpdate(updateData);
    setPasswordModalData({ currentPassword: '', error: '' });
    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async () => {
    if (!passwordModalData.currentPassword) {
      setPasswordModalData({ ...passwordModalData, error: 'Por favor, digite sua senha atual' });
      return;
    }

    if (!user || !pendingUpdate) return;

    try {
      // Remover campos undefined do payload
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

      const result = await userService.updateUser(user.id, updatePayload);
      
      if (result.success) {
        showToast('Dados atualizados com sucesso!');
        setShowPasswordModal(false);
        setEditingAccount(false);
        setPasswordModalData({ currentPassword: '', error: '' });
        setPendingUpdate(null);
        
        // Atualizar dados do usuário no localStorage
        if (result.data) {
          localStorage.setItem('user', JSON.stringify(result.data));
        }
        
        // Buscar dados atualizados do servidor
        try {
          const { authService } = await import('../services/authService');
          const userResponse = await authService.getCurrentUser();
          if (userResponse) {
            localStorage.setItem('user', JSON.stringify(userResponse));
          }
          // Recarregar a página para atualizar o contexto e token se necessário
          window.location.reload();
        } catch (error) {
          console.error('Erro ao atualizar dados do usuário:', error);
          // Mesmo assim recarregar para garantir que os dados estejam atualizados
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

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <p>Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Meu Perfil</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} className="edit-button">
            Editar Perfil
          </button>
        )}
      </div>

      <div className="profile-content">
        <div className="profile-sidebar">
          <div 
            className="profile-avatar" 
            style={{ position: 'relative' }}
          >
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
              {user?.username?.charAt(0).toUpperCase() || 'U'}
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
          
          <div className="profile-stats">
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

        <div className="profile-main">
          <div className="profile-info">
            {!editingAccount ? (
              <>
                <h3>{user?.username}</h3>
                <p className="profile-email">{user?.email}</p>
                <button onClick={handleAccountEdit} className="edit-account-button">
                  Editar Dados da Conta
                </button>
              </>
            ) : (
              <div className="account-edit-form">
                <div className="form-group">
                  <label htmlFor="username">Nome de Usuário</label>
                  <input
                    id="username"
                    type="text"
                    value={accountFormData.username}
                    onChange={(e) => setAccountFormData({ ...accountFormData, username: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={accountFormData.email}
                    onChange={(e) => setAccountFormData({ ...accountFormData, email: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Nova Senha (deixe em branco para não alterar)</label>
                  <input
                    id="password"
                    type="password"
                    value={accountFormData.password}
                    onChange={(e) => setAccountFormData({ ...accountFormData, password: e.target.value })}
                    className="form-input"
                    placeholder="Nova senha"
                  />
                </div>
                {accountFormData.password && (
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                    <input
                      id="confirmPassword"
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
                      setAccountFormData({ username: user?.username || '', email: user?.email || '', password: '', confirmPassword: '' });
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
                  <label htmlFor="bio">Biografia</label>
                  <textarea
                    id="bio"
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
              <label htmlFor="currentPassword">Senha Atual</label>
              <input
                id="currentPassword"
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

      <Toast message={toast} />
    </div>
  );
};

export default Profile;
