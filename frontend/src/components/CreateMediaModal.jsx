import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { adminService } from '../services/apiService';
import './CreateMediaModal.css';

const CreateMediaModal = ({ onClose, showToast }) => {
  const [mediaType, setMediaType] = useState('book');
  const [loading, setLoading] = useState(false);
  
  const [bookData, setBookData] = useState({
    title: '',
    author: '',
    description: '',
    cover_url: '',
    isbn: '',
    publisher: '',
    publication_date: '',
    genres: ''
  });

  const [movieData, setMovieData] = useState({
    title: '',
    director: '',
    description: '',
    cover_url: '',
    release_date: '',
    genres: '',
    cast: ''
  });

  const handleBookChange = (e) => {
    const { name, value } = e.target;
    setBookData(prev => ({ ...prev, [name]: value }));
  };

  const handleMovieChange = (e) => {
    const { name, value } = e.target;
    setMovieData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitBook = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const dataToSend = {
        title: bookData.title,
        author: bookData.author || null,
        description: bookData.description || null,
        cover_url: bookData.cover_url || null,
        isbn: bookData.isbn || null,
        publisher: bookData.publisher || null,
        publication_date: bookData.publication_date || null,
        genres: bookData.genres ? bookData.genres.split(',').map(g => g.trim()) : null
      };

      const result = await adminService.createBookManually(dataToSend);
      
      if (result.success) {
        showToast('Livro criado!');
        setBookData({
          title: '',
          author: '',
          description: '',
          cover_url: '',
          isbn: '',
          publisher: '',
          publication_date: '',
          genres: ''
        });
      } else {
        showToast(result.error || 'Erro ao criar livro');
      }
    } catch (error) {
      console.error('Erro ao criar livro:', error);
      showToast('Erro ao criar livro');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMovie = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const dataToSend = {
        title: movieData.title,
        director: movieData.director || null,
        description: movieData.description || null,
        cover_url: movieData.cover_url || null,
        release_date: movieData.release_date || null,
        genres: movieData.genres ? movieData.genres.split(',').map(g => g.trim()) : null,
        cast: movieData.cast ? movieData.cast.split(',').map(c => c.trim()) : null
      };

      const result = await adminService.createMovieManually(dataToSend);
      
      if (result.success) {
        showToast('Filme criado!');
        setMovieData({
          title: '',
          director: '',
          description: '',
          cover_url: '',
          release_date: '',
          genres: '',
          cast: ''
        });
      } else {
        showToast(result.error || 'Erro ao criar filme');
      }
    } catch (error) {
      console.error('Erro ao criar filme:', error);
      showToast('Erro ao criar filme');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="taskbar-modal taskbar-modal--create">
      <header className="taskbar-modal__header">
        <span>Criar Mídia</span>
        <button type="button" className="taskbar-modal__close" onClick={onClose}>
          ✕
        </button>
      </header>
      
      <div className="taskbar-create__selector">
        <button 
          type="button"
          className={`taskbar-create__tab ${mediaType === 'book' ? 'taskbar-create__tab--active' : ''}`}
          onClick={() => setMediaType('book')}
        >
          Livro
        </button>
        <button 
          type="button"
          className={`taskbar-create__tab ${mediaType === 'movie' ? 'taskbar-create__tab--active' : ''}`}
          onClick={() => setMediaType('movie')}
        >
          Filme
        </button>
      </div>

      {mediaType === 'book' ? (
        <form onSubmit={handleSubmitBook} className="taskbar-create__form">
          <div className="taskbar-create__field">
            <label htmlFor="book-title">Título *</label>
            <input
              id="book-title"
              type="text"
              name="title"
              value={bookData.title}
              onChange={handleBookChange}
              required
              className="taskbar-create__input"
            />
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="book-author">Autor</label>
            <input
              id="book-author"
              type="text"
              name="author"
              value={bookData.author}
              onChange={handleBookChange}
              className="taskbar-create__input"
            />
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="book-description">Descrição</label>
            <textarea
              id="book-description"
              name="description"
              value={bookData.description}
              onChange={handleBookChange}
              rows="3"
              className="taskbar-create__textarea"
            />
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="book-cover">URL Capa</label>
            <input
              id="book-cover"
              type="url"
              name="cover_url"
              value={bookData.cover_url}
              onChange={handleBookChange}
              className="taskbar-create__input"
            />
          </div>

          <div className="taskbar-create__row">
            <div className="taskbar-create__field">
              <label htmlFor="book-isbn">ISBN</label>
              <input
                id="book-isbn"
                type="text"
                name="isbn"
                value={bookData.isbn}
                onChange={handleBookChange}
                className="taskbar-create__input"
              />
            </div>

            <div className="taskbar-create__field">
              <label htmlFor="book-date">Data</label>
              <input
                id="book-date"
                type="date"
                name="publication_date"
                value={bookData.publication_date}
                onChange={handleBookChange}
                className="taskbar-create__input"
              />
            </div>
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="book-publisher">Editora</label>
            <input
              id="book-publisher"
              type="text"
              name="publisher"
              value={bookData.publisher}
              onChange={handleBookChange}
              className="taskbar-create__input"
            />
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="book-genres">Gêneros (vírgula)</label>
            <input
              id="book-genres"
              type="text"
              name="genres"
              value={bookData.genres}
              onChange={handleBookChange}
              placeholder="Ficção, Drama"
              className="taskbar-create__input"
            />
          </div>

          <button type="submit" disabled={loading} className="taskbar-create__submit">
            {loading ? 'Criando...' : 'Criar Livro'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmitMovie} className="taskbar-create__form">
          <div className="taskbar-create__field">
            <label htmlFor="movie-title">Título *</label>
            <input
              id="movie-title"
              type="text"
              name="title"
              value={movieData.title}
              onChange={handleMovieChange}
              required
              className="taskbar-create__input"
            />
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="movie-director">Diretor</label>
            <input
              id="movie-director"
              type="text"
              name="director"
              value={movieData.director}
              onChange={handleMovieChange}
              className="taskbar-create__input"
            />
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="movie-description">Descrição</label>
            <textarea
              id="movie-description"
              name="description"
              value={movieData.description}
              onChange={handleMovieChange}
              rows="3"
              className="taskbar-create__textarea"
            />
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="movie-cover">URL Poster</label>
            <input
              id="movie-cover"
              type="url"
              name="cover_url"
              value={movieData.cover_url}
              onChange={handleMovieChange}
              className="taskbar-create__input"
            />
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="movie-date">Data Lançamento</label>
            <input
              id="movie-date"
              type="date"
              name="release_date"
              value={movieData.release_date}
              onChange={handleMovieChange}
              className="taskbar-create__input"
            />
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="movie-genres">Gêneros (vírgula)</label>
            <input
              id="movie-genres"
              type="text"
              name="genres"
              value={movieData.genres}
              onChange={handleMovieChange}
              placeholder="Ação, Aventura"
              className="taskbar-create__input"
            />
          </div>

          <div className="taskbar-create__field">
            <label htmlFor="movie-cast">Elenco (vírgula)</label>
            <input
              id="movie-cast"
              type="text"
              name="cast"
              value={movieData.cast}
              onChange={handleMovieChange}
              placeholder="Ator 1, Ator 2"
              className="taskbar-create__input"
            />
          </div>

          <button type="submit" disabled={loading} className="taskbar-create__submit">
            {loading ? 'Criando...' : 'Criar Filme'}
          </button>
        </form>
      )}
    </div>
  );
};

CreateMediaModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired
};

export default CreateMediaModal;
