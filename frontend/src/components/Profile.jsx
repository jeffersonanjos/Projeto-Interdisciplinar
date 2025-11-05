import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileService, ratingService } from '../services/apiService';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ books: 0, movies: 0, ratings: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ bio: '', avatar_url: '' });

  useEffect(() => {
    loadProfile();
    loadStats();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const result = await profileService.getProfile(user.id);
      if (result.success && result.data) {
        setProfile(result.data);
        setFormData({
          bio: result.data.bio || '',
          avatar_url: result.data.avatar_url || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    
    try {
      const ratingsResult = await ratingService.getUserRatings(user.id);
      if (ratingsResult.success) {
        const ratings = ratingsResult.data;
        setStats({
          books: ratings.filter(r => r.book_id).length,
          movies: ratings.filter(r => r.movie_id).length,
          ratings: ratings.length
        });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const result = await profileService.createOrUpdateProfile(user.id, formData);
      if (result.success) {
        setProfile(result.data);
        setEditing(false);
        alert('Perfil atualizado com sucesso!');
      } else {
        alert('Erro ao salvar perfil: ' + result.error);
      }
    } catch (error) {
      alert('Erro ao salvar perfil');
    }
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
          <div className="profile-avatar">
            {formData.avatar_url ? (
              <img src={formData.avatar_url} alt="Avatar" className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
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
            <h3>{user?.username}</h3>
            <p className="profile-email">{user?.email}</p>
            
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
                
                <div className="form-group">
                  <label htmlFor="avatar_url">URL do Avatar</label>
                  <input
                    id="avatar_url"
                    type="text"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    className="form-input"
                    placeholder="https://exemplo.com/avatar.jpg"
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
              <div className="profile-bio">
                {profile?.bio ? (
                  <p>{profile.bio}</p>
                ) : (
                  <p className="no-bio">Nenhuma biografia adicionada ainda.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

