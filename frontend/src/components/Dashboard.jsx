import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Search from './Search';
import Library from './Library';
import Recommendations from './Recommendations';
import Profile from './Profile';
import ThemeToggle from './ThemeToggle';
import Taskbar from './Taskbar';
import { ratingService, reviewService } from '../services/apiService';
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

  useEffect(() => {
	console.log("Dashboard useEffect called");
    loadStats();
  }, [user]);

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

  const buildCommunityFeed = (reviews = []) => {
    const derivedFeed = reviews
      .filter((review) => review?.author_user_id && review.author_user_id !== user?.id)
      .slice(0, 4)
      .map((review, index) => ({
        id: `feed-${review.id || index}`,
        nickname:
          review.author_username ||
          review.author?.username ||
          `Usuário #${review.author_user_id}`,
        action: review.updated_at ? 'ajustou a avaliação de' : 'avaliou',
        highlight:
          review.book_title ||
          review.movie_title ||
          review.title ||
          review.book?.title ||
          review.movie?.title,
        rating: review.rating ?? review.score ?? null,
        timestamp: formatRelativeTime(review.updated_at || review.created_at),
      }));

    if (derivedFeed.length) return derivedFeed;

    return [
      {
        id: 'fallback-1',
        nickname: 'LunaBits',
        action: 'avaliou',
        highlight: 'Neuromancer',
        rating: 4.5,
        timestamp: 'há 3 min',
      },
      {
        id: 'fallback-2',
        nickname: 'GutoPixel',
        action: 'ajustou a nota de',
        highlight: 'Blade Runner',
        rating: 5,
        timestamp: 'há 12 min',
      },
      {
        id: 'fallback-3',
        nickname: 'MikaRetro',
        action: 'atualizou o perfil',
        highlight: null,
        rating: null,
        timestamp: 'há 25 min',
      },
      {
        id: 'fallback-4',
        nickname: 'Nara8bit',
        action: 'comentou em',
        highlight: 'O Nome do Vento',
        rating: null,
        timestamp: 'há 1h',
      },
    ];
  };

  const loadStats = async () => {
	console.log("Dashboard loadStats called");
    if (!user) return;
    
    try {
      //const ratingsResult = await ratingService.getUserRatings(user.id);
      const reviewsResult = await reviewService.getUserReviews(user.id);
   //console.log("Dashboard loadStats ratingsResult:", ratingsResult);
      if (/*ratingsResult.success &&*/ reviewsResult.success) {
        //const ratings = ratingsResult.data;
        const reviews = reviewsResult.data;
        setStats({
          books: 0, //ratings.filter(r => r.book_id).length,
          movies: 0, //ratings.filter(r => r.movie_id).length,
          ratings: reviews.length,
       });
  //console.log("Dashboard loadStats stats set:", stats);
        const insightsResult = buildInsightsFromReviews(reviews);
        setInsights({
          favoriteGenres: insightsResult.favoriteGenres,
          avgRating: insightsResult.avgRating,
          totalReviews: reviews.length,
        });
        setCommunityFeed(buildCommunityFeed(reviews));
      } else {
        console.error('Erro ao carregar estatísticas:', ratingsResult.error || reviewsResult.error);
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
      case 'profile':
        return <Profile />;
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
              
              <div className="dashboard-card" onClick={() => setActiveView('profile')}>
                <h3>Meu Perfil</h3>
                <p>{stats.ratings} avaliações feitas</p>
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
          <ThemeToggle />
          <span className="welcome-text">Bem-vindo, {user?.username}!</span>
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
        <button
          className={activeView === 'profile' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveView('profile')}
        >
          Perfil
        </button>
      </nav>

      <main className="dashboard-main">
        {renderContent()}
      </main>

      <Taskbar
        user={user}
        metrics={insights}
        timeline={communityFeed}
        onProfileClick={() => setActiveView('profile')}
      />
    </div>
  );
};

export default Dashboard;