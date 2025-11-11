import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileService, ratingService, externalApiService } from '../services/apiService';
import './Profile.css';

const Profile = () => {
  console.log("Profile component loaded");
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ books: 0, movies: 0, ratings: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ bio: '', avatar_url: '' });

  useEffect(() => {
	console.log("Profile useEffect called");
    loadProfile();
    loadStats();
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
      const result = await profileService.createOrUpdateProfile(user.id, formData);
	  console.log("Profile handleSave createOrUpdateProfile result:", result);
      if (result.success) {
        setProfile(result.data);
		console.log("Profile handleSave profile set:", result.data);
        setEditing(false);
		console.log("Profile handleSave editing set to false");
        alert('Perfil atualizado com sucesso!');
      } else {
        alert('Erro ao salvar perfil: ' + result.error);
      }
    } catch (error) {
      alert('Erro ao salvar perfil');
	  console.error("Profile handleSave error:", error);
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
