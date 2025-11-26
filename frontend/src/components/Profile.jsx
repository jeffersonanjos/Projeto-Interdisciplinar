import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { profileService, ratingService, externalApiService, userService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import './Profile.css';

const Profile = () => {
  console.log("Profile component loaded");
  const { user: usuario, logout, updateUser } = useAuth();
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
  const [atualizacaoPendente, setAtualizacaoPendente] = useState(null); // Armazena os dados que serão atualizados após confirmação
  const { toast, showToast } = useToast();

  useEffect(() => {
    console.log("Profile useEffect called");
    carregarPerfil();
    carregarEstatisticas();
    if (usuario) {
      setAccountFormData({
        username: usuario.username || '',
        email: usuario.email || '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [usuario]);

  const carregarPerfil = async () => {
    console.log("Profile carregarPerfil called");
    if (!usuario) return;

    // 1) Tentar preencher a partir de cache local para carregamento rápido
    try {
      const chavePerfil = `alexandria_profile_${usuario.id}`;
      const cachePerfil = window.localStorage.getItem(chavePerfil);
      if (cachePerfil) {
        const perfilCacheado = JSON.parse(cachePerfil);
        if (perfilCacheado && typeof perfilCacheado === 'object') {
          setProfile(perfilCacheado);
          const urlAvatarCache = perfilCacheado.avatar_url;
          const urlAvatarCompletaCache = urlAvatarCache && !urlAvatarCache.startsWith('http')
            ? `http://localhost:8001${urlAvatarCache}`
            : urlAvatarCache || '';
          setFormData({
            bio: perfilCacheado.bio || '',
            avatar_url: urlAvatarCompletaCache,
          });
        }
      }
    } catch (erroCache) {
      console.warn('Erro ao ler cache de perfil na página Profile:', erroCache);
    }

    // 2) Buscar dados atualizados em background
    try {
      const resultado = await profileService.getProfile(usuario.id);
      console.log("Profile carregarPerfil resultado:", resultado);
      if (resultado.success && resultado.data) {
        setProfile(resultado.data);
        console.log("Profile carregarPerfil profile set:", resultado.data);
        setFormData({
          bio: resultado.data.bio || '',
          avatar_url: resultado.data.avatar_url || ''
        });
        // Se houver avatar, garantir que a URL está completa
        if (resultado.data.avatar_url && !resultado.data.avatar_url.startsWith('http')) {
          setFormData(prev => ({
            ...prev,
            avatar_url: `http://localhost:8001${resultado.data.avatar_url}`
          }));
        }
        console.log("Profile carregarPerfil formData set:", formData);

        // Atualizar cache local com o perfil completo
        try {
          const chavePerfil = `alexandria_profile_${usuario.id}`;
          window.localStorage.setItem(chavePerfil, JSON.stringify(resultado.data));
        } catch (erroCache) {
          console.warn('Erro ao salvar cache de perfil na página Profile:', erroCache);
        }
      }
    } catch (erro) {
      console.error('Erro ao carregar perfil:', erro);
    } finally {
      setLoading(false);
	  console.log("Profile carregarPerfil loading set to false");
    }
  };

  const carregarEstatisticas = async () => {
    console.log("Profile carregarEstatisticas called");
    if (!usuario) return;

    // 1) Tentar preencher a partir de cache local para resposta rápida
    try {
      const chaveStats = `alexandria_profile_stats_${usuario.id}`;
      const cacheStats = window.localStorage.getItem(chaveStats);
      if (cacheStats) {
        const statsCacheados = JSON.parse(cacheStats);
        if (statsCacheados && typeof statsCacheados === 'object') {
          setStats({
            books: statsCacheados.books || 0,
            movies: statsCacheados.movies || 0,
            ratings: statsCacheados.ratings || 0,
          });
        }
      }
    } catch (erroCache) {
      console.warn('Erro ao ler cache de estatísticas na página Profile:', erroCache);
    }

    // 2) Buscar estatísticas atualizadas em background
    try {
      const [resultadoAvaliacoes, resultadoBiblioteca] = await Promise.all([
        ratingService.getUserRatings(usuario.id),
        externalApiService.getUserLibrary(parseInt(usuario.id))
      ]);
      console.log("Profile carregarEstatisticas resultadoAvaliacoes:", resultadoAvaliacoes, "resultadoBiblioteca:", resultadoBiblioteca);
      const arrayAvaliacoes = resultadoAvaliacoes.success ? resultadoAvaliacoes.data : [];
      const arrayBiblioteca = resultadoBiblioteca.success ? resultadoBiblioteca.data : [];
      setStats({
        books: Array.isArray(arrayBiblioteca) ? arrayBiblioteca.length : 0,
        movies: 0,
        ratings: arrayAvaliacoes.length
      });
      console.log("Profile carregarEstatisticas stats set:", {
        books: Array.isArray(arrayBiblioteca) ? arrayBiblioteca.length : 0,
        movies: 0,
        ratings: arrayAvaliacoes.length
      });

      // Atualizar cache local das estatísticas
      try {
        const chaveStats = `alexandria_profile_stats_${usuario.id}`;
        window.localStorage.setItem(chaveStats, JSON.stringify({
          books: Array.isArray(arrayBiblioteca) ? arrayBiblioteca.length : 0,
          movies: 0,
          ratings: arrayAvaliacoes.length,
        }));
      } catch (erroCache) {
        console.warn('Erro ao salvar cache de estatísticas na página Profile:', erroCache);
      }
    } catch (erro) {
      console.error('Erro ao carregar estatísticas:', erro);
    }
  };

  const lidarComSalvar = async (e) => {
	console.log("Profile lidarComSalvar called");
    e.preventDefault();
    if (!usuario) return;

    try {
      const resultado = await profileService.createOrUpdateProfile(usuario.id, { bio: formData.bio });
	  console.log("Profile lidarComSalvar createOrUpdateProfile resultado:", resultado);
      if (resultado.success) {
        setProfile(resultado.data);
		console.log("Profile lidarComSalvar profile set:", resultado.data);
        setEditing(false);
		console.log("Profile lidarComSalvar editing set to false");
        showToast('Perfil atualizado com sucesso!');
      } else {
        showToast('Erro ao salvar perfil: ' + resultado.error);
      }
    } catch (erro) {
      showToast('Erro ao salvar perfil');
	  console.error("Profile lidarComSalvar erro:", erro);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const lidarComRemoverAvatar = async () => {
    if (!usuario) return;
    
    if (!window.confirm('Tem certeza que deseja remover seu avatar?')) {
      return;
    }

    try {
      const resultado = await profileService.removeAvatar(usuario.id);
      if (resultado.success) {
        setFormData({ ...formData, avatar_url: '' });
        if (profile) {
          setProfile({ ...profile, avatar_url: null });
        }
        // Atualizar o usuário no contexto para sincronizar com taskbar
        if (updateUser) {
          updateUser({ ...usuario, avatar_url: null });
        }
        showToast('Avatar removido com sucesso!');
      } else {
        showToast('Erro ao remover avatar: ' + resultado.error);
      }
    } catch (erro) {
      showToast('Erro ao remover avatar');
      console.error("Profile lidarComRemoverAvatar erro:", erro);
    }
  };

  const lidarComMudancaArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !usuario) return;

    // Validar se é uma imagem
    if (!arquivo.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem');
      return;
    }

    setUploadingAvatar(true);
    try {
      const resultado = await profileService.uploadAvatar(usuario.id, arquivo);
      if (resultado.success) {
        // Atualizar o avatar na interface
        const urlAvatar = resultado.data.avatar_url;
        const urlAvatarCompleta = urlAvatar.startsWith('http') ? urlAvatar : `http://localhost:8001${urlAvatar}`;
        setFormData({ ...formData, avatar_url: urlAvatarCompleta });
        if (profile) {
          setProfile({ ...profile, avatar_url: urlAvatarCompleta });
        }
        // Atualizar o usuário no contexto para sincronizar com taskbar
        if (updateUser) {
          updateUser({ ...usuario, avatar_url: urlAvatarCompleta });
        }
        showToast('Avatar atualizado com sucesso!');
      } else {
        showToast('Erro ao fazer upload do avatar: ' + resultado.error);
      }
    } catch (erro) {
      showToast('Erro ao fazer upload do avatar');
      console.error("Profile lidarComMudancaArquivo erro:", erro);
    } finally {
      setUploadingAvatar(false);
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const lidarComDeletarPerfil = async () => {
    if (!usuario) return;
    
    const mensagemConfirmacao = 'Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita e todos os seus dados serão perdidos.';
    if (!window.confirm(mensagemConfirmacao)) {
      return;
    }

    const confirmacaoDupla = 'Esta é sua última chance. Tem certeza absoluta?';
    if (!window.confirm(confirmacaoDupla)) {
      return;
    }

    try {
      const resultado = await profileService.deleteProfile(usuario.id);
      if (resultado.success) {
        showToast('Conta deletada com sucesso');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      } else {
        showToast('Erro ao deletar conta: ' + resultado.error);
      }
    } catch (erro) {
      showToast('Erro ao deletar conta');
      console.error("Profile lidarComDeletarPerfil erro:", erro);
    }
  };

  const lidarComEditarConta = () => {
    setEditingAccount(true);
    setAccountFormData({
      username: usuario?.username || '',
      email: usuario?.email || '',
      password: '',
      confirmPassword: ''
    });
  };

  const lidarComSalvarConta = () => {
    if (!usuario) return;

    // Validar campos obrigatórios
    if (!accountFormData.username || !accountFormData.email) {
      showToast('Nome de usuário e email são obrigatórios');
      return;
    }

    // Validar formato de email básico
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(accountFormData.email)) {
      showToast('Por favor, insira um email válido');
      return;
    }

    // Se está alterando a senha, verificar se as senhas coincidem
    if (accountFormData.password) {
      if (accountFormData.password !== accountFormData.confirmPassword) {
        showToast('As senhas não coincidem');
        return;
      }
      if (accountFormData.password.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres');
        return;
      }
    }

    // Preparar dados para atualização
    const dadosAtualizacao = {
      username: accountFormData.username !== usuario.username ? accountFormData.username : undefined,
      email: accountFormData.email !== usuario.email ? accountFormData.email : undefined,
      password: accountFormData.password && accountFormData.password.length > 0 ? accountFormData.password : undefined
    };

    // Verificar se há algo para atualizar
    const temAlteracoes = dadosAtualizacao.username || dadosAtualizacao.email || dadosAtualizacao.password;
    if (!temAlteracoes) {
      showToast('Nenhuma alteração foi feita');
      setEditingAccount(false);
      return;
    }

    // Armazenar dados pendentes e abrir modal de confirmação de senha
    setAtualizacaoPendente(dadosAtualizacao);
    setPasswordModalData({ currentPassword: '', error: '' });
    setShowPasswordModal(true);
  };

  const lidarComConfirmarSenha = async () => {
    if (!passwordModalData.currentPassword || passwordModalData.currentPassword.trim() === '') {
      setPasswordModalData({ ...passwordModalData, error: 'Por favor, digite sua senha atual' });
      return;
    }

    if (!usuario || !atualizacaoPendente) return;

    try {
      // Remover campos undefined do payload e construir objeto limpo
      const cargaAtualizacao = {
        current_password: passwordModalData.currentPassword.trim()
      };
      
      if (atualizacaoPendente.username !== undefined && atualizacaoPendente.username !== null) {
        cargaAtualizacao.username = atualizacaoPendente.username.trim();
      }
      if (atualizacaoPendente.email !== undefined && atualizacaoPendente.email !== null) {
        cargaAtualizacao.email = atualizacaoPendente.email.trim();
      }
      if (atualizacaoPendente.password !== undefined && atualizacaoPendente.password !== null && atualizacaoPendente.password.length > 0) {
        cargaAtualizacao.password = atualizacaoPendente.password;
      }

      const resultado = await userService.updateUser(usuario.id, cargaAtualizacao);
      
      if (resultado.success) {
        showToast('Dados atualizados com sucesso!');
        setShowPasswordModal(false);
        setEditingAccount(false);
        setPasswordModalData({ currentPassword: '', error: '' });
        setAtualizacaoPendente(null);
        
        // Atualizar dados do usuário no contexto
        if (resultado.data && updateUser) {
          updateUser(resultado.data);
        }
        
        // Recarregar perfil para sincronizar dados
        await carregarPerfil();
      } else {
        const mensagemErro = resultado.error || 'Erro ao atualizar dados';
        setPasswordModalData({ ...passwordModalData, error: mensagemErro });
      }
    } catch (erro) {
      console.error("Profile lidarComConfirmarSenha erro:", erro);
      const mensagemErro = erro.response?.data?.detail || erro.message || 'Erro ao atualizar dados';
      setPasswordModalData({ ...passwordModalData, error: mensagemErro });
    }
  };

  const lidarComCancelarModalSenha = () => {
    setShowPasswordModal(false);
    setPasswordModalData({ currentPassword: '', error: '' });
    setAtualizacaoPendente(null);
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
                  const marcador = e.target.parentElement.querySelector('.avatar-placeholder');
                  if (marcador) {
                    marcador.style.display = 'flex';
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
              {usuario?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            {formData.avatar_url && !uploadingAvatar && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  lidarComRemoverAvatar();
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
              onChange={lidarComMudancaArquivo}
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
                <h3>{usuario?.username}</h3>
                <p className="profile-email">{usuario?.email}</p>
                <button onClick={lidarComEditarConta} className="edit-account-button">
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
                      setAccountFormData({ username: usuario?.username || '', email: usuario?.email || '', password: '', confirmPassword: '' });
                    }} 
                    className="cancel-button"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={lidarComSalvarConta} 
                    className="save-button"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
            
            {editing ? (
              <form onSubmit={lidarComSalvar} className="profile-form">
                <div className="form-group">
                  <label htmlFor="bio">Biografia</label>
                  <textarea
                    id="bio"
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="form-textarea"
                    rows="6"
                    placeholder="Conte um pouco sobre você..."
                    disabled={false}
                    readOnly={false}
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
                    onClick={lidarComDeletarPerfil} 
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
        <div className="modal-overlay" onClick={lidarComCancelarModalSenha}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-button"
              onClick={lidarComCancelarModalSenha}
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
                    lidarComConfirmarSenha();
                  }
                }}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={lidarComCancelarModalSenha}
                className="cancel-button"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={lidarComConfirmarSenha}
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
