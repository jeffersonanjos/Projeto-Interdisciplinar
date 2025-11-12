import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Search from './Search';
import Library from './Library';
import Recommendations from './Recommendations';
import UserReviews from './UserReviews';
import Profile from './Profile';
import { ratingService, reviewService } from '../services/apiService';
import './Dashboard.css';

const Dashboard = () => {
  console.log("Dashboard component loaded");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('home');
  const [stats, setStats] = useState({ books: 0, movies: 0, ratings: 0 });

  useEffect(() => {
	console.log("Dashboard useEffect called");
    loadStats();
  }, [user]);

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
      case 'userReviews':
        return <UserReviews />;
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
          className={activeView === 'userReviews' ? 'nav-button active' : 'nav-button'}
          onClick={() => setActiveView('userReviews')}
        >
          Avaliações
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
    </div>
  );
};

export default Dashboard;