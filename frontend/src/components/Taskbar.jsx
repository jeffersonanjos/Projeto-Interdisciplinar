import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useUpdate } from '../contexts/UpdateContext';
import { useNavigate } from 'react-router-dom';
import { profileService, ratingService, externalApiService, userService, timelineService } from '../services/apiService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import './Taskbar.css';
import './Profile.css';

const Taskbar = ({ user: usuario, metrics: metricas, timeline: linhaDoTempo, followingTimeline: linhaDoTempoSeguindo = [] }) => {
  const [modalAberto, setModalAberto] = useState(null);
  const [estaVisivel, setEstaVisivel] = useState(true);
  const { user: usuarioAuth, logout, updateUser } = useAuth();
  const { atualizacaoBiblioteca, atualizacaoAvaliacoes, atualizacaoTimeline, atualizacaoMetricas } = useUpdate();
  const navigate = useNavigate();
  const referenciaInputArquivo = useRef(null);
  const { toast, showToast } = useToast();
  
  // Estado do perfil
  const [perfil, setPerfil] = useState(null);
  const [estatisticas, setEstatisticas] = useState({ books: 0, movies: 0, ratings: 0 });
  const [carregando, setCarregando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editandoConta, setEditandoConta] = useState(false);
  const [dadosFormulario, setDadosFormulario] = useState({ bio: '', avatar_url: '' });
  const [dadosFormularioConta, setDadosFormularioConta] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [enviandoAvatar, setEnviandoAvatar] = useState(false);
  const [mostrarModalSenha, setMostrarModalSenha] = useState(false);
  const [dadosModalSenha, setDadosModalSenha] = useState({ currentPassword: '', error: '' });
  const [atualizacaoPendente, setAtualizacaoPendente] = useState(null);
  const [linhaDoTempoPessoal, setLinhaDoTempoPessoal] = useState([]);
  const [carregandoLinhaDoTempoPessoal, setCarregandoLinhaDoTempoPessoal] = useState(false);
  
  // Estado de busca de usuários
  const [consultaBusca, setConsultaBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [perfilUsuarioSelecionado, setPerfilUsuarioSelecionado] = useState(null);
  const [estatisticasUsuarioSelecionado, setEstatisticasUsuarioSelecionado] = useState({ books: 0, movies: 0, ratings: 0 });
  const [carregandoUsuarioSelecionado, setCarregandoUsuarioSelecionado] = useState(false);
  const [estaSeguindo, setEstaSeguindo] = useState(false);
  const [podeSeguir, setPodeSeguir] = useState(false);
  const [atividadesUsuarioSelecionado, setAtividadesUsuarioSelecionado] = useState([]);
  const [seguidores, setSeguidores] = useState([]);
  const [seguindo, setSeguindo] = useState([]);
  const [mostrarModalSeguidores, setMostrarModalSeguidores] = useState(false);
  const [mostrarModalSeguindo, setMostrarModalSeguindo] = useState(false);

  const iniciais = usuario?.username
    ? usuario.username.slice(0, 2).toUpperCase()
    : '??';

  const mediaAvaliacao =
    metricas?.avgRating !== null && metricas?.avgRating !== undefined && !Number.isNaN(Number(metricas.avgRating))
      ? Number(metricas.avgRating).toFixed(1)
      : '--';

  const generosFavoritos = metricas?.favoriteGenres?.length
    ? metricas.favoriteGenres
    : [];

  const linhaDoTempoSegura = Array.isArray(linhaDoTempo) && linhaDoTempo.length
    ? linhaDoTempo.slice(0, 6)
    : [];
  const linhaDoTempoSeguindoSegura = Array.isArray(linhaDoTempoSeguindo) && linhaDoTempoSeguindo.length
    ? linhaDoTempoSeguindo.slice(0, 6)
    : [];

  const alternarModal = (tipo) => {
    if (tipo === 'profile') {
      if (modalAberto !== 'profile') {
        carregarPerfil();
        carregarEstatisticas();
        carregarLinhaDoTempoPessoal();
        if (usuarioAuth) {
          setDadosFormularioConta({
            username: usuarioAuth.username || '',
            email: usuarioAuth.email || '',
            password: '',
            confirmPassword: ''
          });
        }
      }
    }
    if (tipo === 'search') {
      if (modalAberto !== 'search') {
        setConsultaBusca('');
        setResultadosBusca([]);
        setUsuarioSelecionado(null);
        setPerfilUsuarioSelecionado(null);
      }
    }
    setModalAberto((anterior) => (anterior === tipo ? null : tipo));
  };

  const carregarLinhaDoTempoPessoal = async () => {
    if (!usuarioAuth) return;
    setCarregandoLinhaDoTempoPessoal(true);
    try {
      const resultado = await userService.getUserActivities(usuarioAuth.id, 6);
      if (resultado.success && resultado.data) {
        // Buscar avatar do perfil ou do usuário
        const avatarPerfil = perfil?.avatar_url 
          ? (perfil.avatar_url.startsWith('http') 
              ? perfil.avatar_url 
              : `http://localhost:8001${perfil.avatar_url}`)
          : null;
        const avatarUsuario = usuarioAuth.avatar_url 
          ? (usuarioAuth.avatar_url.startsWith('http') 
              ? usuarioAuth.avatar_url 
              : `http://localhost:8001${usuarioAuth.avatar_url}`)
          : null;
        const avatarFinal = avatarPerfil || avatarUsuario;
        
        const linhaDoTempo = resultado.data.map((atividade) => {
          const data = atividade.created_at ? new Date(atividade.created_at) : new Date();
          return {
            id: atividade.id,
            nickname: usuarioAuth.username,
            action: atividade.action || 'avaliou',
            highlight: atividade.highlight || null,
            rating: atividade.rating || null,
            timestamp: formatarTempoRelativo(data),
            avatar: avatarFinal
          };
        });
        setLinhaDoTempoPessoal(linhaDoTempo);
      } else {
        setLinhaDoTempoPessoal([]);
      }
    } catch (erro) {
      console.error('Erro ao carregar timeline pessoal:', erro);
      setLinhaDoTempoPessoal([]);
    } finally {
      setCarregandoLinhaDoTempoPessoal(false);
    }
  };

  const fecharModal = () => {
    setModalAberto(null);
    setEditando(false);
    setEditandoConta(false);
  };
  const alternarVisibilidade = () => {
    setEstaVisivel((anterior) => {
      if (anterior) {
        // Ao ocultar, fecha os modais
        setModalAberto(null);
      }
      return !anterior;
    });
  };

  // Funções do perfil
  const carregarPerfil = async () => {
    if (!usuarioAuth) return;
    setCarregando(true);
    try {
      const resultado = await profileService.getProfile(usuarioAuth.id);
      if (resultado.success && resultado.data) {
        setPerfil(resultado.data);
        setDadosFormulario({
          bio: resultado.data.bio || '',
          avatar_url: resultado.data.avatar_url || ''
        });
        if (resultado.data.avatar_url && !resultado.data.avatar_url.startsWith('http')) {
          setDadosFormulario(anterior => ({
            ...anterior,
            avatar_url: `http://localhost:8001${resultado.data.avatar_url}`
          }));
        }
      }
    } catch (erro) {
      console.error('Erro ao carregar perfil:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const carregarEstatisticas = async () => {
    if (!usuarioAuth) return;
    try {
      const [resultadoAvaliacoes, resultadoBiblioteca, resultadoBibliotecaFilmes] = await Promise.all([
        ratingService.getUserRatings(usuarioAuth.id),
        externalApiService.getUserLibrary(parseInt(usuarioAuth.id)),
        externalApiService.getUserMovieLibrary(parseInt(usuarioAuth.id))
      ]);
      const arrayAvaliacoes = resultadoAvaliacoes.success ? resultadoAvaliacoes.data : [];
      const arrayBiblioteca = resultadoBiblioteca.success ? resultadoBiblioteca.data : [];
      const arrayBibliotecaFilmes = resultadoBibliotecaFilmes.success ? resultadoBibliotecaFilmes.data : [];
      setEstatisticas({
        books: Array.isArray(arrayBiblioteca) ? arrayBiblioteca.length : 0,
        movies: Array.isArray(arrayBibliotecaFilmes) ? arrayBibliotecaFilmes.length : 0,
        ratings: arrayAvaliacoes.length
      });
    } catch (erro) {
      console.error('Erro ao carregar estatísticas:', erro);
    }
  };

  // Recarregar estatísticas quando houver atualizações
  useEffect(() => {
    if (atualizacaoBiblioteca > 0 || atualizacaoAvaliacoes > 0 || atualizacaoMetricas > 0) {
      carregarEstatisticas();
    }
  }, [atualizacaoBiblioteca, atualizacaoAvaliacoes, atualizacaoMetricas]);

  // Recarregar timeline pessoal quando houver atualizações
  useEffect(() => {
    if (atualizacaoTimeline > 0) {
      carregarLinhaDoTempoPessoal();
    }
  }, [atualizacaoTimeline]);

  const lidarComSalvar = async (e) => {
    e.preventDefault();
    if (!usuarioAuth) return;
    try {
      const resultado = await profileService.createOrUpdateProfile(usuarioAuth.id, { bio: dadosFormulario.bio });
      if (resultado.success) {
        setPerfil(resultado.data);
        setEditando(false);
        showToast('Perfil atualizado com sucesso!');
      } else {
        showToast('Erro ao salvar perfil: ' + resultado.error);
      }
    } catch (erro) {
      showToast('Erro ao salvar perfil');
      console.error("Profile lidarComSalvar erro:", erro);
    }
  };

  const lidarComCliqueAvatar = () => {
    if (referenciaInputArquivo.current) {
      referenciaInputArquivo.current.click();
    }
  };

  const lidarComRemoverAvatar = async () => {
    if (!usuarioAuth) return;
    if (!window.confirm('Tem certeza que deseja remover seu avatar?')) {
      return;
    }
    try {
      const resultado = await profileService.removeAvatar(usuarioAuth.id);
      if (resultado.success) {
        setDadosFormulario({ ...dadosFormulario, avatar_url: '' });
        if (perfil) {
          setPerfil({ ...perfil, avatar_url: null });
        }
        if (updateUser) {
          updateUser({ ...usuarioAuth, avatar_url: null });
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
    if (!arquivo || !usuarioAuth) return;
    if (!arquivo.type.startsWith('image/')) {
      showToast('Por favor, selecione um arquivo de imagem');
      return;
    }
    setEnviandoAvatar(true);
    try {
      const resultado = await profileService.uploadAvatar(usuarioAuth.id, arquivo);
      if (resultado.success) {
        const urlAvatar = resultado.data.avatar_url;
        const urlAvatarCompleta = urlAvatar.startsWith('http') ? urlAvatar : `http://localhost:8001${urlAvatar}`;
        setDadosFormulario({ ...dadosFormulario, avatar_url: urlAvatarCompleta });
        if (perfil) {
          setPerfil({ ...perfil, avatar_url: urlAvatarCompleta });
        }
        if (updateUser) {
          updateUser({ ...usuarioAuth, avatar_url: urlAvatarCompleta });
        }
        showToast('Avatar atualizado com sucesso!');
      } else {
        showToast('Erro ao fazer upload do avatar: ' + resultado.error);
      }
    } catch (erro) {
      showToast('Erro ao fazer upload do avatar');
      console.error("Profile lidarComMudancaArquivo erro:", erro);
    } finally {
      setEnviandoAvatar(false);
      if (referenciaInputArquivo.current) {
        referenciaInputArquivo.current.value = '';
      }
    }
  };

  const lidarComDeletarPerfil = async () => {
    if (!usuarioAuth) return;
    const mensagemConfirmacao = 'Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita e todos os seus dados serão perdidos.';
    if (!window.confirm(mensagemConfirmacao)) {
      return;
    }
    const confirmacaoDupla = 'Esta é sua última chance. Tem certeza absoluta?';
    if (!window.confirm(confirmacaoDupla)) {
      return;
    }
    try {
      const resultado = await profileService.deleteProfile(usuarioAuth.id);
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
  
  // Alias para compatibilidade com hot reload que ainda referencia handleDeleteProfile
  const handleDeleteProfile = lidarComDeletarPerfil;
  
  const lidarComEditarConta = () => {
    setEditandoConta(true);
    setDadosFormularioConta({
      username: usuarioAuth?.username || '',
      email: usuarioAuth?.email || '',
      password: '',
      confirmPassword: ''
    });
  };

  const lidarComSalvarConta = () => {
    if (!usuarioAuth) return;
    if (!dadosFormularioConta.username || !dadosFormularioConta.email) {
      showToast('Nome de usuário e email são obrigatórios');
      return;
    }
    if (dadosFormularioConta.password) {
      if (dadosFormularioConta.password !== dadosFormularioConta.confirmPassword) {
        showToast('As senhas não coincidem');
        return;
      }
      if (dadosFormularioConta.password.length < 1) {
        showToast('A senha deve ter pelo menos 1 caractere');
        return;
      }
    }
    const dadosAtualizacao = {
      username: dadosFormularioConta.username !== usuarioAuth.username ? dadosFormularioConta.username : undefined,
      email: dadosFormularioConta.email !== usuarioAuth.email ? dadosFormularioConta.email : undefined,
      password: dadosFormularioConta.password || undefined
    };
    const temAlteracoes = dadosAtualizacao.username || dadosAtualizacao.email || dadosAtualizacao.password;
    if (!temAlteracoes) {
      showToast('Nenhuma alteração foi feita');
      return;
    }
    setAtualizacaoPendente(dadosAtualizacao);
    setDadosModalSenha({ currentPassword: '', error: '' });
    setMostrarModalSenha(true);
  };

  const lidarComConfirmarSenha = async () => {
    if (!dadosModalSenha.currentPassword) {
      setDadosModalSenha({ ...dadosModalSenha, error: 'Por favor, digite sua senha atual' });
      return;
    }
    if (!usuarioAuth || !atualizacaoPendente) return;
    try {
      const cargaAtualizacao = {
        current_password: dadosModalSenha.currentPassword
      };
      if (atualizacaoPendente.username !== undefined) {
        cargaAtualizacao.username = atualizacaoPendente.username;
      }
      if (atualizacaoPendente.email !== undefined) {
        cargaAtualizacao.email = atualizacaoPendente.email;
      }
      if (atualizacaoPendente.password !== undefined) {
        cargaAtualizacao.password = atualizacaoPendente.password;
      }
      const resultado = await userService.updateUser(usuarioAuth.id, cargaAtualizacao);
      if (resultado.success) {
        showToast('Dados atualizados com sucesso!');
        setMostrarModalSenha(false);
        setEditandoConta(false);
        setDadosModalSenha({ currentPassword: '', error: '' });
        setAtualizacaoPendente(null);
        if (resultado.data) {
          localStorage.setItem('user', JSON.stringify(resultado.data));
        }
        try {
          const { authService } = await import('../services/authService');
          const respostaUsuario = await authService.getCurrentUser();
          if (respostaUsuario) {
            localStorage.setItem('user', JSON.stringify(respostaUsuario));
          }
          window.location.reload();
        } catch (erro) {
          console.error('Erro ao atualizar dados do usuário:', erro);
          window.location.reload();
        }
      } else {
        setDadosModalSenha({ ...dadosModalSenha, error: resultado.error || 'Erro ao atualizar dados' });
      }
    } catch (erro) {
      console.error("Profile lidarComConfirmarSenha erro:", erro);
      setDadosModalSenha({ ...dadosModalSenha, error: 'Erro ao atualizar dados' });
    }
  };

  const lidarComCancelarModalSenha = () => {
    setMostrarModalSenha(false);
    setDadosModalSenha({ currentPassword: '', error: '' });
    setAtualizacaoPendente(null);
  };

  // Funções de busca de usuários
  const lidarComBuscarUsuarios = async () => {
    if (!consultaBusca.trim()) {
      setResultadosBusca([]);
      return;
    }
    setCarregandoBusca(true);
    try {
      const resultado = await userService.searchUsers(consultaBusca.trim(), 10);
      if (resultado.success) {
        setResultadosBusca(resultado.data || []);
      } else {
        setResultadosBusca([]);
        showToast('Erro ao buscar usuários: ' + (resultado.error || 'Erro desconhecido'));
      }
    } catch (erro) {
      console.error('Erro ao buscar usuários:', erro);
      setResultadosBusca([]);
      showToast('Erro ao buscar usuários');
    } finally {
      setCarregandoBusca(false);
    }
  };

  const lidarComSelecionarUsuario = async (usuario) => {
    setUsuarioSelecionado(usuario);
    setCarregandoUsuarioSelecionado(true);
    try {
      const idUsuario = parseInt(usuario.id, 10);
      const [resultadoPerfil, resultadoAvaliacoes, resultadoBiblioteca, resultadoFilmes, resultadoStatusFollow, resultadoAtividades, resultadoSeguidores, resultadoSeguindo] = await Promise.all([
        profileService.getProfile(usuario.id),
        ratingService.getUserRatings(usuario.id),
        externalApiService.getUserLibrary(idUsuario),
        externalApiService.getUserMovieLibrary(idUsuario),
        userService.checkFollowStatus(usuario.id),
        userService.getUserActivities(usuario.id, 6),
        userService.getFollowers(usuario.id),
        userService.getFollowing(usuario.id)
      ]);
      
      if (resultadoPerfil.success && resultadoPerfil.data) {
        setPerfilUsuarioSelecionado(resultadoPerfil.data);
      } else {
        setPerfilUsuarioSelecionado(null);
      }
      
      const arrayAvaliacoes = resultadoAvaliacoes.success ? resultadoAvaliacoes.data : [];
      const arrayBiblioteca = resultadoBiblioteca.success ? resultadoBiblioteca.data : [];
      const arrayFilmes = resultadoFilmes.success ? resultadoFilmes.data : [];
      setEstatisticasUsuarioSelecionado({
        books: Array.isArray(arrayBiblioteca) ? arrayBiblioteca.length : 0,
        movies: Array.isArray(arrayFilmes) ? arrayFilmes.length : 0,
        ratings: arrayAvaliacoes.length
      });
      
      // Atualizar status de follow
      if (resultadoStatusFollow.success && resultadoStatusFollow.data) {
        setEstaSeguindo(resultadoStatusFollow.data.following || false);
        setPodeSeguir(resultadoStatusFollow.data.can_follow || false);
      } else {
        setEstaSeguindo(false);
        setPodeSeguir(false);
      }
      
      // Carregar seguidores e seguindo
      if (resultadoSeguidores.success && resultadoSeguidores.data) {
        setSeguidores(resultadoSeguidores.data);
      } else {
        setSeguidores([]);
      }
      
      if (resultadoSeguindo.success && resultadoSeguindo.data) {
        setSeguindo(resultadoSeguindo.data);
      } else {
        setSeguindo([]);
      }
      
      // Processar atividades
      if (resultadoAtividades.success && resultadoAtividades.data) {
        const avatarPerfil = resultadoPerfil.success && resultadoPerfil.data 
          ? (resultadoPerfil.data.avatar_url?.startsWith('http') 
              ? resultadoPerfil.data.avatar_url 
              : resultadoPerfil.data.avatar_url 
                ? `http://localhost:8001${resultadoPerfil.data.avatar_url}` 
                : null)
          : null;
        const avatarUsuario = usuario.avatar_url 
          ? (usuario.avatar_url.startsWith('http') ? usuario.avatar_url : `http://localhost:8001${usuario.avatar_url}`)
          : null;
        
        const atividades = resultadoAtividades.data.map((atividade) => {
          const data = atividade.created_at ? new Date(atividade.created_at) : new Date();
          return {
            id: atividade.id,
            nickname: usuario.username,
            action: atividade.action || 'avaliou',
            highlight: atividade.highlight || null,
            rating: atividade.rating || null,
            timestamp: formatarTempoRelativo(data),
            avatar: avatarPerfil || avatarUsuario || null
          };
        });
        setAtividadesUsuarioSelecionado(atividades);
      } else {
        setAtividadesUsuarioSelecionado([]);
      }
    } catch (erro) {
      console.error('Erro ao carregar perfil do usuário:', erro);
    } finally {
      setCarregandoUsuarioSelecionado(false);
    }
  };

  const formatarTempoRelativo = (data) => {
    if (!data) return 'há algum tempo';
    const agora = new Date();
    const diferencaMs = agora - data;
    const diferencaMinutos = Math.floor(diferencaMs / 60000);
    const diferencaHoras = Math.floor(diferencaMs / 3600000);
    const diferencaDias = Math.floor(diferencaMs / 86400000);

    if (diferencaMinutos < 1) return 'agora';
    if (diferencaMinutos < 60) return `há ${diferencaMinutos} min`;
    if (diferencaHoras < 24) return `há ${diferencaHoras}h`;
    if (diferencaDias === 1) return 'ontem';
    if (diferencaDias < 7) return `há ${diferencaDias} dias`;

    return data.toLocaleDateString('pt-BR');
  };

  const lidarComAlternarSeguir = async () => {
    if (!usuarioSelecionado || !podeSeguir) return;
    
    try {
      let resultado;
      if (estaSeguindo) {
        resultado = await userService.unfollowUser(usuarioSelecionado.id);
      } else {
        resultado = await userService.followUser(usuarioSelecionado.id);
      }
      
      if (resultado.success) {
        setEstaSeguindo(resultado.data.following || !estaSeguindo);
        showToast(estaSeguindo ? 'Deixou de seguir o usuário' : 'Agora você está seguindo este usuário');
      } else {
        showToast(resultado.error || 'Erro ao atualizar status de follow');
      }
    } catch (erro) {
      console.error('Erro ao atualizar follow:', erro);
      showToast('Erro ao atualizar status de follow');
    }
  };

  useEffect(() => {
    if (modalAberto === 'search' && consultaBusca.trim()) {
      const idTimeout = setTimeout(() => {
        lidarComBuscarUsuarios();
      }, 300);
      return () => clearTimeout(idTimeout);
    } else if (modalAberto === 'search' && !consultaBusca.trim()) {
      setResultadosBusca([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaBusca, modalAberto]);

  return (
    <>
      <div className={`taskbar ${!estaVisivel ? 'taskbar--hidden' : ''}`} role="navigation" aria-label="Atalhos do painel">
        <div className="taskbar-icons">
          <button
            type="button"
            className={`taskbar-icon ${modalAberto === 'timeline' ? 'active' : ''}`}
            onClick={() => alternarModal('timeline')}
            aria-pressed={modalAberto === 'timeline'}
            aria-label="Abrir linha do tempo"
          >
            <span className="taskbar-icon__glyph" aria-hidden="true">
              <i className="bi bi-clock-history" />
            </span>
          </button>

          <button
            type="button"
            className={`taskbar-icon ${modalAberto === 'metrics' ? 'active' : ''}`}
            onClick={() => alternarModal('metrics')}
            aria-pressed={modalAberto === 'metrics'}
            aria-label="Abrir métricas"
          >
            <span className="taskbar-icon__glyph" aria-hidden="true">
              <i className="bi bi-trophy" />
            </span>
          </button>

          <button
            type="button"
            className={`taskbar-icon ${modalAberto === 'search' ? 'active' : ''}`}
            onClick={() => alternarModal('search')}
            aria-pressed={modalAberto === 'search'}
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
            onClick={() => alternarModal('profile')}
            title="Abrir perfil"
          >
            <div className="taskbar-profile__avatar">
              {usuario?.avatar_url && (
                <img 
                  src={usuario.avatar_url.startsWith('http') ? usuario.avatar_url : `http://localhost:8001${usuario.avatar_url}`} 
                  alt={`Avatar de ${usuario.username}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const marcador = e.target.nextElementSibling;
                    if (marcador) {
                      marcador.style.display = 'flex';
                    }
                  }}
                />
              )}
              <span style={{ display: usuario?.avatar_url ? 'none' : 'flex' }}>{iniciais}</span>
            </div>
            <div className="taskbar-profile__info">
              <span className="taskbar-profile__name">{usuario?.username || 'Usuário'}</span>
              <span className="taskbar-profile__email">{usuario?.email || 'email não informado'}</span>
            </div>
          </button>

          {estaVisivel && (
            <button
              type="button"
              className="taskbar-toggle"
              onClick={alternarVisibilidade}
              aria-label="Ocultar taskbar"
              title="Ocultar taskbar"
            >
              <span className="pixel-icon pixel-icon--arrow" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!estaVisivel && (
        <button
          type="button"
          className="taskbar-toggle taskbar-toggle--hidden"
          onClick={alternarVisibilidade}
          aria-label="Mostrar taskbar"
          title="Mostrar taskbar"
        >
          <span className="pixel-icon pixel-icon--arrow" aria-hidden="true" />
        </button>
      )}

      {modalAberto && estaVisivel && (
        <div className="taskbar-modal__backdrop" onClick={fecharModal} role="presentation" />
      )}

      {modalAberto === 'timeline' && estaVisivel && (
        <div className="taskbar-modal taskbar-modal--timeline">
          <header className="taskbar-modal__header">
            <span>Hub da Comunidade</span>
            <button type="button" className="taskbar-modal__close" onClick={fecharModal}>
              ✕
            </button>
          </header>
          
          {linhaDoTempoSeguindoSegura.length > 0 && (
            <>
              <div className="taskbar-timeline__section-header">
                <span>Pessoas que você segue</span>
              </div>
              <ul className="taskbar-timeline">
                {linhaDoTempoSeguindoSegura.map((event) => (
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
            {linhaDoTempoSegura.length ? (
              linhaDoTempoSegura.map((event) => (
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

      {modalAberto === 'metrics' && estaVisivel && (
        <div className="taskbar-modal taskbar-modal--metrics">
          <header className="taskbar-modal__header">
            <span>Painel de Métricas</span>
            <button type="button" className="taskbar-modal__close" onClick={fecharModal}>
              ✕
            </button>
          </header>

          <div className="taskbar-metrics">
            <div className="taskbar-metrics__card">
              <span className="taskbar-metrics__label">Média geral</span>
              <strong className="taskbar-metrics__value">{mediaAvaliacao}</strong>
            </div>
            <div className="taskbar-metrics__card">
              <span className="taskbar-metrics__label">Total de avaliações</span>
              <strong className="taskbar-metrics__value">{metricas?.totalReviews ?? 0}</strong>
            </div>
          </div>

          <div className="taskbar-genres">
            <span className="taskbar-genres__title">Gêneros preferidos</span>
            <div className="taskbar-genres__chips">
              {generosFavoritos.length > 0 ? (
                generosFavoritos.map((genero) => (
                  <span key={genero.label} className="taskbar-genres__chip">
                    {genero.label}
                    {genero.count ? ` · ${genero.count}` : ''}
                  </span>
                ))
              ) : (
                <span className="taskbar-genres__chip" style={{ opacity: 0.6 }}>
                  Nenhum gênero encontrado
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {modalAberto === 'profile' && estaVisivel && (
        <div className="taskbar-modal taskbar-modal--profile">
          <header className="taskbar-modal__header">
            <span>Meu Perfil</span>
            <button type="button" className="taskbar-modal__close" onClick={fecharModal}>
              ✕
            </button>
          </header>

          {carregando ? (
            <div className="taskbar-profile__loading">Carregando perfil...</div>
          ) : (
            <div className="taskbar-profile__content">
              <div className="taskbar-profile__sidebar">
                <div className="taskbar-profile__avatar-container" style={{ position: 'relative' }}>
                  {enviandoAvatar ? (
                    <div className="avatar-loading">Carregando...</div>
                  ) : dadosFormulario.avatar_url ? (
                    <img 
                      src={dadosFormulario.avatar_url.startsWith('http') ? dadosFormulario.avatar_url : `http://localhost:8001${dadosFormulario.avatar_url}`}
                      alt="Avatar" 
                      className="avatar-image"
                      onClick={lidarComCliqueAvatar}
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
                    onClick={lidarComCliqueAvatar}
                    style={{ 
                      display: (dadosFormulario.avatar_url && !enviandoAvatar) ? 'none' : 'flex',
                      cursor: 'pointer'
                    }}
                  >
                    {usuarioAuth?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  {dadosFormulario.avatar_url && !enviandoAvatar && (
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
                    ref={referenciaInputArquivo}
                    type="file"
                    accept="image/*"
                    onChange={lidarComMudancaArquivo}
                    style={{ display: 'none' }}
                  />
                </div>
                
                <div className="taskbar-profile__stats">
                  <div className="stat-card">
                    <h3>{estatisticas.books}</h3>
                    <p>Livros</p>
                  </div>
                  <div className="stat-card">
                    <h3>{estatisticas.movies}</h3>
                    <p>Filmes</p>
                  </div>
                  <div className="stat-card">
                    <h3>{estatisticas.ratings}</h3>
                    <p>Avaliações</p>
                  </div>
                </div>
              </div>

              <div className="taskbar-profile__main">
                <div className="taskbar-profile__info">
                  {!editandoConta ? (
                    <>
                      <h3>{usuarioAuth?.username}</h3>
                      <p className="profile-email">{usuarioAuth?.email}</p>
                      {!editando && (
                        <button onClick={() => setEditando(true)} className="edit-button">
                          Editar Perfil
                        </button>
                      )}
                      <button onClick={lidarComEditarConta} className="edit-account-button">
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
                          value={dadosFormularioConta.username}
                          onChange={(e) => setDadosFormularioConta({ ...dadosFormularioConta, username: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="email-modal">Email</label>
                        <input
                          id="email-modal"
                          type="email"
                          value={dadosFormularioConta.email}
                          onChange={(e) => setDadosFormularioConta({ ...dadosFormularioConta, email: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="password-modal">Nova Senha (deixe em branco para não alterar)</label>
                        <input
                          id="password-modal"
                          type="password"
                          value={dadosFormularioConta.password}
                          onChange={(e) => setDadosFormularioConta({ ...dadosFormularioConta, password: e.target.value })}
                          className="form-input"
                          placeholder="Nova senha"
                        />
                      </div>
                      {dadosFormularioConta.password && (
                        <div className="form-group">
                          <label htmlFor="confirmPassword-modal">Confirmar Nova Senha</label>
                          <input
                            id="confirmPassword-modal"
                            type="password"
                            value={dadosFormularioConta.confirmPassword}
                            onChange={(e) => setDadosFormularioConta({ ...dadosFormularioConta, confirmPassword: e.target.value })}
                            className="form-input"
                            placeholder="Confirme a nova senha"
                          />
                        </div>
                      )}
                      <div className="form-actions">
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditandoConta(false);
                            setDadosFormularioConta({ username: usuarioAuth?.username || '', email: usuarioAuth?.email || '', password: '', confirmPassword: '' });
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
                  
                  {editando ? (
                    <form onSubmit={lidarComSalvar} className="profile-form">
                      <div className="form-group">
                        <label htmlFor="bio-modal">Biografia</label>
                        <textarea
                          id="bio-modal"
                          value={dadosFormulario.bio}
                          onChange={(e) => setDadosFormulario({ ...dadosFormulario, bio: e.target.value })}
                          className="form-textarea"
                          rows="6"
                          placeholder="Conte um pouco sobre você..."
                        />
                      </div>

                      <div className="form-actions">
                        <button type="button" onClick={() => setEditando(false)} className="cancel-button">
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
                        {perfil?.bio ? (
                          <p>{perfil.bio}</p>
                        ) : (
                          <p className="no-bio">Nenhuma biografia adicionada ainda.</p>
                        )}
                      </div>

                      {linhaDoTempoPessoal.length > 0 && (
                        <div className="taskbar-profile__activities">
                          <h4 style={{ 
                            fontSize: '10px', 
                            color: 'var(--text-tertiary)', 
                            marginBottom: '12px',
                            fontFamily: "'Press Start 2P', monospace"
                          }}>
                            Minhas Atividades Recentes
                          </h4>
                          {carregandoLinhaDoTempoPessoal ? (
                            <div className="taskbar-profile__loading">Carregando...</div>
                          ) : (
                            <ul className="taskbar-timeline" style={{ margin: 0, padding: 0 }}>
                              {linhaDoTempoPessoal.map((atividade) => (
                                <li key={atividade.id} className="taskbar-timeline__event">
                                  <div className="taskbar-timeline__avatar">
                                    {atividade.avatar ? (
                                      <img 
                                        src={atividade.avatar.startsWith('http') 
                                          ? atividade.avatar 
                                          : `http://localhost:8001${atividade.avatar}`} 
                                        alt={`Avatar de ${atividade.nickname}`}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          const marcador = e.target.nextElementSibling;
                                          if (marcador) {
                                            marcador.style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <span style={{ display: atividade.avatar ? 'none' : 'flex' }}>
                                      {atividade.nickname?.slice(0, 2).toUpperCase() || '??'}
                                    </span>
                                  </div>
                                  <div className="taskbar-timeline__details">
                                    <strong>{atividade.nickname}</strong>
                                    <p>
                                      {atividade.action}
                                      {atividade.highlight ? (
                                        <span className="taskbar-timeline__highlight">
                                          {` "${atividade.highlight}"`}
                                        </span>
                                      ) : null}
                                      {atividade.rating ? ` · ${atividade.rating}★` : ''}
                                    </p>
                                    <span className="taskbar-timeline__time">{atividade.timestamp}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

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
          )}

          {/* Modal de confirmação de senha */}
          {mostrarModalSenha && (
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
                {dadosModalSenha.error && (
                  <div className="modal-feedback error">
                    {dadosModalSenha.error}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="currentPassword-modal">Senha Atual</label>
                  <input
                    id="currentPassword-modal"
                    type="password"
                    value={dadosModalSenha.currentPassword}
                    onChange={(e) => setDadosModalSenha({ ...dadosModalSenha, currentPassword: e.target.value, error: '' })}
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
        </div>
      )}

      {modalAberto === 'search' && estaVisivel && (
        <div className="taskbar-modal taskbar-modal--search">
          <header className="taskbar-modal__header">
            <span>Buscar Usuários</span>
            <button type="button" className="taskbar-modal__close" onClick={fecharModal}>
              ✕
            </button>
          </header>

          <div className="taskbar-search__content">
            <div className="taskbar-search__input-container">
              <input
                type="text"
                className="taskbar-search__input"
                placeholder="Digite o nome de usuário..."
                value={consultaBusca}
                onChange={(e) => setConsultaBusca(e.target.value)}
                autoFocus
              />
              {carregandoBusca && (
                <div className="taskbar-search__loading">Buscando...</div>
              )}
            </div>

            {usuarioSelecionado ? (
              <div className="taskbar-search__user-profile">
                <button
                  type="button"
                  className="taskbar-search__back-button"
                  onClick={() => {
                    setUsuarioSelecionado(null);
                    setPerfilUsuarioSelecionado(null);
                    setEstaSeguindo(false);
                    setPodeSeguir(false);
                    setAtividadesUsuarioSelecionado([]);
                    setSeguidores([]);
                    setSeguindo([]);
                    setMostrarModalSeguidores(false);
                    setMostrarModalSeguindo(false);
                  }}
                >
                  ← Voltar
                </button>

                {carregandoUsuarioSelecionado ? (
                  <div className="taskbar-profile__loading">Carregando perfil...</div>
                ) : (
                  <div className="taskbar-profile__content">
                    <div className="taskbar-profile__sidebar">
                      <div className="taskbar-profile__avatar-container">
                        {perfilUsuarioSelecionado?.avatar_url ? (
                          <img 
                            src={perfilUsuarioSelecionado.avatar_url.startsWith('http') 
                              ? perfilUsuarioSelecionado.avatar_url 
                              : `http://localhost:8001${perfilUsuarioSelecionado.avatar_url}`}
                            alt="Avatar" 
                            className="avatar-image"
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
                          style={{ 
                            display: (perfilUsuarioSelecionado?.avatar_url) ? 'none' : 'flex'
                          }}
                        >
                          {usuarioSelecionado?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </div>
                      
                      <div className="taskbar-profile__stats">
                        <div className="stat-card">
                          <h3>{estatisticasUsuarioSelecionado.books}</h3>
                          <p>Livros</p>
                        </div>
                        <div className="stat-card">
                          <h3>{estatisticasUsuarioSelecionado.movies}</h3>
                          <p>Filmes</p>
                        </div>
                        <div className="stat-card">
                          <h3>{estatisticasUsuarioSelecionado.ratings}</h3>
                          <p>Avaliações</p>
                        </div>
                      </div>
                    </div>

                    <div className="taskbar-profile__main">
                      <div className="taskbar-profile__info">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <h3 style={{ margin: 0 }}>{usuarioSelecionado?.username}</h3>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setMostrarModalSeguidores(true)}
                                  className="followers-following-button"
                                  title="Ver seguidores"
                                >
                                  {seguidores.length} seguidores
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMostrarModalSeguindo(true)}
                                  className="followers-following-button"
                                  title="Ver seguindo"
                                >
                                  {seguindo.length} seguindo
                                </button>
                              </div>
                            </div>
                            <p className="profile-email">{usuarioSelecionado?.email}</p>
                          </div>
                        </div>
                        
                        {podeSeguir && (
                          <div style={{ marginBottom: '16px' }}>
                            <button
                              type="button"
                              onClick={lidarComAlternarSeguir}
                              className={estaSeguindo ? "unfollow-button" : "follow-button"}
                            >
                              {estaSeguindo ? 'Seguindo' : 'Seguir'}
                            </button>
                          </div>
                        )}
                        
                        <div className="profile-bio">
                          {perfilUsuarioSelecionado?.bio ? (
                            <p>{perfilUsuarioSelecionado.bio}</p>
                          ) : (
                            <p className="no-bio">Nenhuma biografia adicionada ainda.</p>
                          )}
                        </div>

                        {atividadesUsuarioSelecionado.length > 0 && (
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
                              {atividadesUsuarioSelecionado.map((atividade) => (
                                <li key={atividade.id} className="taskbar-timeline__event">
                                  <div className="taskbar-timeline__avatar">
                                    {atividade.avatar ? (
                                      <img 
                                        src={atividade.avatar.startsWith('http') 
                                          ? atividade.avatar 
                                          : `http://localhost:8001${atividade.avatar}`} 
                                        alt={`Avatar de ${atividade.nickname}`}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          const marcador = e.target.nextElementSibling;
                                          if (marcador) {
                                            marcador.style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <span style={{ display: atividade.avatar ? 'none' : 'flex' }}>
                                      {atividade.nickname?.slice(0, 2).toUpperCase() || '??'}
                                    </span>
                                  </div>
                                  <div className="taskbar-timeline__details">
                                    <strong>{atividade.nickname}</strong>
                                    <p>
                                      {atividade.action}
                                      {atividade.highlight ? (
                                        <span className="taskbar-timeline__highlight">
                                          {` "${atividade.highlight}"`}
                                        </span>
                                      ) : null}
                                      {atividade.rating ? ` · ${atividade.rating}★` : ''}
                                    </p>
                                    <span className="taskbar-timeline__time">{atividade.timestamp}</span>
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
                {resultadosBusca.length > 0 ? (
                  <ul className="taskbar-search__results-list">
                    {resultadosBusca.map((usuario) => (
                      <li 
                        key={usuario.id} 
                        className="taskbar-search__result-item"
                        onClick={() => lidarComSelecionarUsuario(usuario)}
                      >
                        <div className="taskbar-search__result-avatar">
                          {usuario.avatar_url ? (
                            <img 
                              src={usuario.avatar_url.startsWith('http') 
                                ? usuario.avatar_url 
                                : `http://localhost:8001${usuario.avatar_url}`}
                              alt={`Avatar de ${usuario.username}`}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const marcador = e.target.nextElementSibling;
                                if (marcador) {
                                  marcador.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <span style={{ display: usuario.avatar_url ? 'none' : 'flex' }}>
                            {usuario.username?.slice(0, 2).toUpperCase() || '??'}
                          </span>
                        </div>
                        <div className="taskbar-search__result-info">
                          <strong>{usuario.username}</strong>
                          <span>{usuario.email}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : consultaBusca.trim() && !carregandoBusca ? (
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
      {mostrarModalSeguidores && (
        <div className="modal-overlay" onClick={() => setMostrarModalSeguidores(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setMostrarModalSeguidores(false)}
              aria-label="Fechar modal"
            >
              ×
            </button>
            <h3>Seguidores</h3>
            <div className="followers-list">
              {seguidores.length > 0 ? (
                <ul className="taskbar-search__results-list">
                  {seguidores.map((seguidor) => (
                    <li 
                      key={seguidor.id} 
                      className="taskbar-search__result-item"
                      onClick={() => {
                        setMostrarModalSeguidores(false);
                        lidarComSelecionarUsuario(seguidor);
                      }}
                    >
                      <div className="taskbar-search__result-avatar">
                        <span>{seguidor.username?.slice(0, 2).toUpperCase() || '??'}</span>
                      </div>
                      <div className="taskbar-search__result-info">
                        <strong>{seguidor.username}</strong>
                        <span>{seguidor.email}</span>
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
      {mostrarModalSeguindo && (
        <div className="modal-overlay" onClick={() => setMostrarModalSeguindo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setMostrarModalSeguindo(false)}
              aria-label="Fechar modal"
            >
              ×
            </button>
            <h3>Seguindo</h3>
            <div className="following-list">
              {seguindo.length > 0 ? (
                <ul className="taskbar-search__results-list">
                  {seguindo.map((seguido) => (
                    <li 
                      key={seguido.id} 
                      className="taskbar-search__result-item"
                      onClick={() => {
                        setMostrarModalSeguindo(false);
                        lidarComSelecionarUsuario(seguido);
                      }}
                    >
                      <div className="taskbar-search__result-avatar">
                        <span>{seguido.username?.slice(0, 2).toUpperCase() || '??'}</span>
                      </div>
                      <div className="taskbar-search__result-info">
                        <strong>{seguido.username}</strong>
                        <span>{seguido.email}</span>
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

