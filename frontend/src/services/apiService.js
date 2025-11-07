import api from './authService';

// Serviço para livros
export const bookService = {
  // Buscar livros (quando o endpoint estiver disponível)
  async getBooks() {
    try {
      const response = await api.get('/books/');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar livros' };
    }
  },
  // Criar novo livro
  async createBook(bookData) {
    try {
      const response = await api.post('/books/', bookData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao criar livro' };
    }
  },
  // Buscar livro por ID
  async getBookById(id) {
    try {
      const response = await api.get(`/books/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar livro' };
    }
  },
  // Buscar livros do usuário (avaliações)
  async getUserBooks(userId) {
    try {
      const response = await api.get(`/users/${userId}/books`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, data: [] };
    }
  }
};

// Serviço para filmes
export const movieService = {
  // Buscar filmes (quando o endpoint estiver disponível)
  async getMovies() {
    try {
      const response = await api.get('/movies/');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar filmes' };
    }
  },
  // Criar novo filme
  async createMovie(movieData) {
    try {
      const response = await api.post('/movies/', movieData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao criar filme' };
    }
  },
  // Buscar filme por ID
  async getMovieById(id) {
    try {
      const response = await api.get(`/movies/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar filme' };
    }
  },
  // Buscar filmes do usuário (avaliações)
  async getUserMovies(userId) {
    try {
      const response = await api.get(`/users/${userId}/movies`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, data: [] };
    }
  }
};

// Serviço para avaliações
export const ratingService = {
  // Criar avaliação
  async createRating(ratingData) {
    try {
      const response = await api.post('/ratings/', ratingData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao criar avaliação' };
    }
  },
  // Buscar avaliações do usuário
  async getUserRatings(userId) {
    try {
      const response = await api.get(`/users/${userId}/ratings`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, data: [] };
    }
  },
  // Buscar avaliações de um livro
  async getBookRatings(bookId) {
    try {
      const response = await api.get(`/books/${bookId}/ratings`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, data: [] };
    }
  },
  // Buscar avaliações de um filme
  async getMovieRatings(movieId) {
    try {
      const response = await api.get(`/movies/${movieId}/ratings`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, data: [] };
    }
  }
};

// Serviço para recomendações
export const recommendationService = {
  // Buscar recomendações do usuário
  async getUserRecommendations(userId) {
    try {
      const response = await api.get(`/users/${userId}/recommendations`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, data: [] };
    }
  },
  // Gerar recomendações
  async generateRecommendations(userId) {
    try {
      const response = await api.post(`/recommendations/generate/${userId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao gerar recomendações' };
    }
  }
};

// Serviço para perfil
export const profileService = {
  // Buscar perfil do usuário
  async getProfile(userId) {
    try {
      const response = await api.get(`/profiles/${userId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, data: null };
    }
  },
  // Criar ou atualizar perfil
  async createOrUpdateProfile(userId, profileData) {
    try {
      const response = await api.post('/profiles/', {
        user_id: userId,
        ...profileData
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao salvar perfil' };
    }
  }
};

// Serviço para buscar em APIs externas
export const externalApiService = {
  // Buscar livros na Google Books API
  async searchBooks(query) {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`);
      const data = await response.json();

      if (data.items) {
        const books = data.items.map(item => ({
          title: item.volumeInfo.title,
          author: item.volumeInfo.authors?.join(', ') || 'Autor desconhecido',
          description: item.volumeInfo.description || 'Sem descrição disponível',
          cover_url: item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail || null,
          external_id: item.id
        }));
        return { success: true, data: books };
      }
      return { success: true, data: [] };
    } catch (error) {
      return { success: false, error: 'Erro ao buscar livros na API externa' };
    }
  },
  // Buscar filmes na TMDB API (requer API key - usando exemplo)
  async searchMovies(query) {
    try {
      // Nota: Para usar a TMDB API, você precisa de uma API key
      // Por enquanto, retornamos dados mockados ou fazemos uma busca básica
      // const API_KEY = 'sua_api_key_aqui';
      // const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);

      // Por enquanto, retornamos uma estrutura vazia
      // Em produção, você deve configurar a API key da TMDB
      return { success: false, error: 'Configuração da API TMDB necessária' };
    } catch (error) {
      return { success: false, error: 'Erro ao buscar filmes na API externa' };
    }
  },
  // Buscar livros no backend
  async getBooksFromBackend(query) {
    try {
      const response = await api.get(`/books?query=${encodeURIComponent(query)}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar livros no backend' };
    }
  },
  // Buscar filme no backend
  async getMoviesFromBackend(query) {
    try {
      const response = await api.get(`/movies?query=${encodeURIComponent(query)}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar filmes no backend' };
    }
  }
};
