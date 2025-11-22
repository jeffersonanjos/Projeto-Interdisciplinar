import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Search from './Search';
import Library from './Library';
import Recommendations from './Recommendations';
import Taskbar from './Taskbar';
import { ratingService, reviewService, profileService, timelineService, externalApiService } from '../services/apiService';
import './Dashboard.css';

const Dashboard = () => {
  console.log("Dashboard component loaded");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('home');
  const [stats, setStats] = useState({ books: 0, movies: 0, ratings: 0 });
  const [insights, setInsights] = useState({
    favoriteGenres: [],
    avgRating: null,
    totalReviews: 0,
  });
  const [communityFeed, setCommunityFeed] = useState([]);
  const [followingFeed, setFollowingFeed] = useState([]);
  const [userWithProfile, setUserWithProfile] = useState(user);

  useEffect(() => {
	console.log("Dashboard useEffect called");
    loadStats();
    loadCommunityTimeline();
    // Se user já tem avatar_url (atualizado via updateUser), usar diretamente
    if (user && user.avatar_url !== undefined) {
      setUserWithProfile(user);
    } else {
      loadUserProfile();
    }
  }, [user]);

  // Recarregar perfil quando voltar da view de perfil para sincronizar avatar
  useEffect(() => {
    if (activeView !== 'profile') {
      loadUserProfile();
    }
  }, [activeView]);

  const loadUserProfile = async () => {
    if (!user) {
      setUserWithProfile(null);
      return;
    }
    
    try {
      const resultado = await profileService.getProfile(user.id);
      if (resultado.success && resultado.data) {
        const urlAvatar = resultado.data.avatar_url;
        const urlAvatarCompleta = urlAvatar && !urlAvatar.startsWith('http') 
          ? `http://localhost:8001${urlAvatar}` 
          : urlAvatar;
        setUserWithProfile({
          ...user,
          avatar_url: urlAvatarCompleta || null
        });
      } else {
        setUserWithProfile({ ...user, avatar_url: null });
      }
    } catch (erro) {
      console.error('Erro ao carregar perfil do usuário:', erro);
      setUserWithProfile({ ...user, avatar_url: null });
    }
  };

  const extrairGenerosDeAvaliacao = (avaliacao) => {
    if (!avaliacao) return [];
    
    // Tentar obter gêneros de várias fontes possíveis
    const generosPossiveis = [
      avaliacao.genre,
      avaliacao.genres,
      avaliacao.category,
      avaliacao.book_genre,
      avaliacao.movie_genre,
      avaliacao.book?.genre,
      avaliacao.movie?.genre,
      avaliacao.book?.genres,
      avaliacao.movie?.genres,
      avaliacao.metadata?.genre,
      avaliacao.metadata?.genres,
    ];

    const extraidos = generosPossiveis
      .flatMap((valor) => {
        if (!valor) return [];
        if (Array.isArray(valor)) return valor;
        if (typeof valor === 'string') {
          // Se for uma string, tentar dividir por vírgula, barra ou pipe
          return valor.split(/[,/|]/);
        }
        return [];
      })
      .map((genero) => genero?.trim())
      .filter(Boolean);
    
    return extraidos;
  };

  const construirInsightsDeAvaliacoes = (avaliacoes = []) => {
    console.log("construirInsightsDeAvaliacoes chamado com:", avaliacoes);
    if (!avaliacoes || !avaliacoes.length) {
      console.log("Nenhuma avaliação encontrada");
      return {
        avgRating: null,
        favoriteGenres: [],
      };
    }

    const contagemGeneros = {};
    let somaAvaliacoes = 0;
    let contagemAvaliacoes = 0;

    avaliacoes.forEach((avaliacao) => {
      // Tentar obter o rating de várias formas possíveis
      const valorAvaliacao = Number(
        avaliacao.rating ?? avaliacao.score ?? avaliacao.stars ?? avaliacao.value
      );

      console.log("Processando avaliação:", avaliacao, "valorAvaliacao:", valorAvaliacao);

      if (!Number.isNaN(valorAvaliacao) && valorAvaliacao > 0) {
        somaAvaliacoes += valorAvaliacao;
        contagemAvaliacoes += 1;
      }

      const generos = extrairGenerosDeAvaliacao(avaliacao);
      console.log("Gêneros extraídos:", generos);
      generos.forEach((genero) => {
        contagemGeneros[genero] = (contagemGeneros[genero] || 0) + 1;
      });
    });

    const generosFavoritos = Object.entries(contagemGeneros)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([rotulo, contagem]) => ({ label: rotulo, count: contagem }));

    const mediaAvaliacao = contagemAvaliacoes > 0 ? somaAvaliacoes / contagemAvaliacoes : null;
    console.log("Insights finais - mediaAvaliacao:", mediaAvaliacao, "contagemAvaliacoes:", contagemAvaliacoes, "generosFavoritos:", generosFavoritos);

    return {
      avgRating: mediaAvaliacao,
      favoriteGenres: generosFavoritos,
    };
  };

  const formatarTempoRelativo = (stringData) => {
    if (!stringData) return 'agora mesmo';
    const data = new Date(stringData);
    if (Number.isNaN(data.getTime())) return 'recentemente';

    const diferencaMs = Date.now() - data.getTime();
    const diferencaMinutos = Math.floor(diferencaMs / (1000 * 60));

    if (diferencaMinutos < 1) return 'agora';
    if (diferencaMinutos < 60) return `há ${diferencaMinutos} min`;

    const diferencaHoras = Math.floor(diferencaMinutos / 60);
    if (diferencaHoras < 24) return `há ${diferencaHoras}h`;

    const diferencaDias = Math.floor(diferencaHoras / 24);
    if (diferencaDias === 1) return 'ontem';
    if (diferencaDias < 7) return `há ${diferencaDias} dias`;

    return data.toLocaleDateString('pt-BR');
  };

  const loadCommunityTimeline = async () => {
    if (!user) return;
    
    try {
      const [resultadoGeral, resultadoSeguindo] = await Promise.all([
        timelineService.getCommunityTimeline(20, false),
        timelineService.getCommunityTimeline(20, true)
      ]);
      
      const processarTimeline = (dados) => {
        if (!dados || !Array.isArray(dados)) return [];
        return dados.map((atividade) => {
          const data = atividade.created_at ? new Date(atividade.created_at) : new Date();
          return {
            id: atividade.id,
            nickname: atividade.username || `Usuário #${atividade.user_id}`,
            action: atividade.action || 'avaliou',
            highlight: atividade.highlight || null,
            rating: atividade.rating || null,
            timestamp: formatarTempoRelativo(data),
            avatar: atividade.avatar 
              ? (atividade.avatar.startsWith('http') 
                  ? atividade.avatar 
                  : `http://localhost:8001${atividade.avatar}`)
              : null
          };
        });
      };
      
      if (resultadoGeral.success && resultadoGeral.data) {
        setCommunityFeed(processarTimeline(resultadoGeral.data));
      } else {
        setCommunityFeed([]);
      }
      
      if (resultadoSeguindo.success && resultadoSeguindo.data) {
        setFollowingFeed(processarTimeline(resultadoSeguindo.data));
      } else {
        setFollowingFeed([]);
      }
    } catch (erro) {
      console.error('Erro ao carregar timeline:', erro);
      setCommunityFeed([]);
      setFollowingFeed([]);
    }
  };

  const loadStats = async () => {
	console.log("Dashboard loadStats chamado");
    if (!user) return;
    
    try {
      const idUsuario = parseInt(user.id, 10);
      const [resultadoAvaliacoes, resultadoLivros, resultadoFilmes] = await Promise.all([
        reviewService.getUserReviews(user.id),
        externalApiService.getUserLibrary(idUsuario),
        externalApiService.getUserMovieLibrary(idUsuario)
      ]);
      
      console.log("Resultado de avaliações:", resultadoAvaliacoes);
      
      if (resultadoAvaliacoes.success) {
        const avaliacoes = resultadoAvaliacoes.data || [];
        console.log("Dados de avaliações:", avaliacoes);
        const livros = resultadoLivros.success && Array.isArray(resultadoLivros.data) ? resultadoLivros.data.length : 0;
        const filmes = resultadoFilmes.success && Array.isArray(resultadoFilmes.data) ? resultadoFilmes.data.length : 0;
        
        setStats({
          books: livros,
          movies: filmes,
          ratings: avaliacoes.length,
       });
        
        const resultadoInsights = construirInsightsDeAvaliacoes(avaliacoes);
        console.log("Resultado de insights:", resultadoInsights);
        setInsights({
          favoriteGenres: resultadoInsights.favoriteGenres,
          avgRating: resultadoInsights.avgRating,
          totalReviews: avaliacoes.length,
        });
      } else {
        console.error('Erro ao carregar estatísticas:', resultadoAvaliacoes.error);
        // Definir valores padrão em caso de erro
        setInsights({
          favoriteGenres: [],
          avgRating: null,
          totalReviews: 0,
        });
      }
    } catch (erro) {
      console.error('Erro ao carregar estatísticas:', erro);
      // Definir valores padrão em caso de erro
      setInsights({
        favoriteGenres: [],
        avgRating: null,
        totalReviews: 0,
      });
    }
  };

  const handleLogout = () => {
	console.log("Dashboard handleLogout called");
    logout();
    navigate('/login');
  };

  const renderContent = () => {
	console.log("Dashboard renderContent called, activeView:", activeView);
    switch (activeView) {
      case 'search':
        return <Search />;
      case 'library':
        return <Library />;
      case 'recommendations':
        return <Recommendations />;
      default:
        return (
          <div className="dashboard-home">
            <h2>Bem-vindo ao Alexandria!</h2>
            <p>Gerencie seus livros e filmes favoritos</p>
            
            <div className="dashboard-cards">
              <div className="dashboard-card" onClick={() => setActiveView('library')}>
                <h3>Minha Biblioteca</h3>
                <p>{stats.books} livros e {stats.movies} filmes</p>
              </div>
              
              <div className="dashboard-card" onClick={() => setActiveView('search')}>
                <h3>Buscar</h3>
                <p>Encontre novos livros e filmes</p>
              </div>
              
              <div className="dashboard-card" onClick={() => setActiveView('recommendations')}>
                <h3>Recomendações</h3>
                <p>Descubra conteúdos personalizados</p>
              </div>
              
              <div className="dashboard-card">
                <h3>Meu Perfil</h3>
                <p>{stats.ratings} avaliações feitas</p>
                <p style={{ fontSize: '8px', marginTop: '8px', opacity: 0.8 }}>Clique no botão de perfil na taskbar</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title" onClick={() => setActiveView('home')} style={{ cursor: 'pointer' }}>
          Alexandria
        </h1>
        <div className="user-info">
          <button onClick={handleLogout} className="logout-button">
            Sair
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button
          className={activeView === 'home' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveView('home')}
        >
          Início
        </button>
        <button
          className={activeView === 'search' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveView('search')}
        >
          Buscar
        </button>
        <button
          className={activeView === 'library' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveView('library')}
        >
          Biblioteca
        </button>
        <button
          className={activeView === 'recommendations' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveView('recommendations')}
        >
          Recomendações
        </button>
      </nav>

      <main className="dashboard-main">
        {renderContent()}
      </main>

      <Taskbar
        user={userWithProfile}
        metrics={insights}
        timeline={communityFeed}
        followingTimeline={followingFeed}
      />
    </div>
  );
};

export default Dashboard;