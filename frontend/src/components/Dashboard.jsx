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
      const result = await profileService.getProfile(user.id);
      if (result.success && result.data) {
        const avatarUrl = result.data.avatar_url;
        const fullAvatarUrl = avatarUrl && !avatarUrl.startsWith('http') 
          ? `http://localhost:8001${avatarUrl}` 
          : avatarUrl;
        setUserWithProfile({
          ...user,
          avatar_url: fullAvatarUrl || null
        });
      } else {
        setUserWithProfile({ ...user, avatar_url: null });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
      setUserWithProfile({ ...user, avatar_url: null });
    }
  };

  const extractGenresFromReview = (review) => {
    if (!review) return [];
    const possibleGenres = [
      review.genre,
      review.genres,
      review.category,
      review.book_genre,
      review.movie_genre,
      review.book?.genre,
      review.movie?.genre,
      review.metadata?.genre,
      review.metadata?.genres,
    ];

    return possibleGenres
      .flatMap((value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          return value.split(/[,/|]/);
        }
        return [];
      })
      .map((genre) => genre?.trim())
      .filter(Boolean);
  };

  const buildInsightsFromReviews = (reviews = []) => {
    if (!reviews.length) {
      return {
        avgRating: null,
        favoriteGenres: [],
      };
    }

    const genreCounts = {};
    let ratingSum = 0;
    let ratingCount = 0;

    reviews.forEach((review) => {
      const ratingValue = Number(
        review.rating ?? review.score ?? review.stars ?? review.value
      );

      if (!Number.isNaN(ratingValue)) {
        ratingSum += ratingValue;
        ratingCount += 1;
      }

      const genres = extractGenresFromReview(review);
      genres.forEach((genre) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });

    const favoriteGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => ({ label, count }));

    return {
      avgRating: ratingCount ? ratingSum / ratingCount : null,
      favoriteGenres,
    };
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'agora mesmo';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'recentemente';

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `há ${diffMinutes} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `há ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;

    return date.toLocaleDateString('pt-BR');
  };

  const loadCommunityTimeline = async () => {
    if (!user) return;
    
    try {
      const [generalResult, followingResult] = await Promise.all([
        timelineService.getCommunityTimeline(20, false),
        timelineService.getCommunityTimeline(20, true)
      ]);
      
      const processTimeline = (data) => {
        if (!data || !Array.isArray(data)) return [];
        return data.map((activity) => {
          const date = activity.created_at ? new Date(activity.created_at) : new Date();
          return {
            id: activity.id,
            nickname: activity.username || `Usuário #${activity.user_id}`,
            action: activity.action || 'avaliou',
            highlight: activity.highlight || null,
            rating: activity.rating || null,
            timestamp: formatRelativeTime(date),
            avatar: activity.avatar 
              ? (activity.avatar.startsWith('http') 
                  ? activity.avatar 
                  : `http://localhost:8001${activity.avatar}`)
              : null
          };
        });
      };
      
      if (generalResult.success && generalResult.data) {
        setCommunityFeed(processTimeline(generalResult.data));
      } else {
        setCommunityFeed([]);
      }
      
      if (followingResult.success && followingResult.data) {
        setFollowingFeed(processTimeline(followingResult.data));
      } else {
        setFollowingFeed([]);
      }
    } catch (error) {
      console.error('Erro ao carregar timeline:', error);
      setCommunityFeed([]);
      setFollowingFeed([]);
    }
  };

  const loadStats = async () => {
	console.log("Dashboard loadStats called");
    if (!user) return;
    
    try {
      const userId = parseInt(user.id, 10);
      const [reviewsResult, booksResult, moviesResult] = await Promise.all([
        reviewService.getUserReviews(user.id),
        externalApiService.getUserLibrary(userId),
        externalApiService.getUserMovieLibrary(userId)
      ]);
      
      if (reviewsResult.success) {
        const reviews = reviewsResult.data;
        const books = booksResult.success && Array.isArray(booksResult.data) ? booksResult.data.length : 0;
        const movies = moviesResult.success && Array.isArray(moviesResult.data) ? moviesResult.data.length : 0;
        
        setStats({
          books: books,
          movies: movies,
          ratings: reviews.length,
       });
        
        const insightsResult = buildInsightsFromReviews(reviews);
        setInsights({
          favoriteGenres: insightsResult.favoriteGenres,
          avgRating: insightsResult.avgRating,
          totalReviews: reviews.length,
        });
      } else {
        console.error('Erro ao carregar estatísticas:', reviewsResult.error);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
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