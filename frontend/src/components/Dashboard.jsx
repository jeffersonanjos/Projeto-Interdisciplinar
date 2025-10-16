import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Alexandria</h1>
        <div className="user-info">
          <span className="welcome-text">Bem-vindo, {user?.username}!</span>
          <button onClick={logout} className="logout-button">
            Sair
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <h2>Biblioteca Pessoal</h2>
          <p>Gerencie seus livros e filmes favoritos</p>
          
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <h3>Meus Livros</h3>
              <p>0 livros cadastrados</p>
            </div>
            
            <div className="dashboard-card">
              <h3>Meus Filmes</h3>
              <p>0 filmes cadastrados</p>
            </div>
            
            <div className="dashboard-card">
              <h3>Avaliações</h3>
              <p>0 avaliações feitas</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;