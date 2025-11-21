import api from './authService.js';

// Serviço para livros
export const bookService = {
  // Buscar livros (quando o endpoint estiver disponível)
  async getBooks() {
	console.log("bookService.getBooks called");
    try {
      const response = await api.get('/books/');
	  console.log("bookService.getBooks API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("bookService.getBooks error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar livros' };
    }
  },
  // Criar novo livro
  async createBook(bookData) {
	console.log("bookService.createBook called with:", bookData);
    try {
      const response = await api.post('/books/', bookData);
	  console.log("bookService.createBook API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("bookService.createBook error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao criar livro' };
    }
  },
  // Buscar livro por ID
  async getBookById(id) {
	console.log("bookService.getBookById called with:", id);
    try {
      const response = await api.get(`/books/${id}`);
	  console.log("bookService.getBookById API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("bookService.getBookById error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar livro' };
    }
  },
  // Buscar livros do usuário (avaliações)
  async getUserBooks(userId) {
	console.log("bookService.getUserBooks called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/books`);
	  console.log("bookService.getUserBooks API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("bookService.getUserBooks error:", error);
      return { success: false, data: [] };
    }
  }
};

// Serviço para filmes
export const movieService = {
  // Buscar filmes (quando o endpoint estiver disponível)
  async getMovies() {
	console.log("movieService.getMovies called");
    try {
      const response = await api.get('/movies/');
	  console.log("movieService.getMovies API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("movieService.getMovies error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar filmes' };
    }
  },
  // Criar novo filme
  async createMovie(movieData) {
	console.log("movieService.createMovie called with:", movieData);
    try {
      const response = await api.post('/movies/', movieData);
	  console.log("movieService.createMovie API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("movieService.createMovie error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao criar filme' };
    }
  },
  // Buscar filme por ID
  async getMovieById(id) {
	console.log("movieService.getMovieById called with:", id);
    try {
      const response = await api.get(`/movies/${id}`);
	  console.log("movieService.getMovieById API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("movieService.getMovieById error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar filme' };
    }
  },
  // Buscar filmes do usuário (avaliações)
  async getUserMovies(userId) {
	console.log("movieService.getUserMovies called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/movies`);
	  console.log("movieService.getUserMovies API response:", response);
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
	console.log("ratingService.createRating called with:", ratingData);
    try {
      const response = await api.post('/ratings/', ratingData);
	  console.log("ratingService.createRating API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("ratingService.createRating error:", error);
      const detail = error.response?.data?.detail;
      let message;
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail) && detail.length) {
        // FastAPI 422 validation errors
        const first = detail[0];
        message = first?.msg || first?.detail || 'Erro de validação';
      } else {
        message = error.message || 'Erro ao criar avaliação';
      }
      return { success: false, error: message };
    }
  },
  async updateRating(ratingId, ratingData) {
	console.log("ratingService.updateRating called with:", ratingId, ratingData);
    try {
      const response = await api.put(`/ratings/${ratingId}`, ratingData);
	  console.log("ratingService.updateRating API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("ratingService.updateRating error:", error);
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string'
        ? detail
        : error.message || 'Erro ao atualizar avaliação';
      return { success: false, error: message };
    }
  },
  async deleteRating(ratingId) {
	console.log("ratingService.deleteRating called with:", ratingId);
    try {
      await api.delete(`/ratings/${ratingId}`);
      return { success: true };
    } catch (error) {
	  console.error("ratingService.deleteRating error:", error);
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string'
        ? detail
        : error.message || 'Erro ao excluir avaliação';
      return { success: false, error: message };
    }
  },
  // Buscar avaliações do usuário
  async getUserRatings(userId) {
	console.log("ratingService.getUserRatings called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/ratings`);
	  console.log("ratingService.getUserRatings API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("ratingService.getUserRatings error:", error);
      return { success: false, data: [] };
    }
  },
  // Buscar avaliações de um livro
  async getBookRatings(bookId) {
	console.log("ratingService.getBookRatings called with:", bookId);
    try {
      const response = await api.get(`/books/${bookId}/ratings`);
	  console.log("ratingService.getBookRatings API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("ratingService.getBookRatings error:", error);
      return { success: false, data: [] };
    }
  },
  // Buscar avaliações de um filme
  async getMovieRatings(movieId) {
	console.log("ratingService.getMovieRatings called with:", movieId);
    try {
      const response = await api.get(`/movies/${movieId}/ratings`);
	  console.log("ratingService.getMovieRatings API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("ratingService.getMovieRatings error:", error);
      return { success: false, data: [] };
    }
  }
};

// Serviço para recomendações
export const recommendationService = {
  // Buscar recomendações do usuário
  async getUserRecommendations(userId) {
	console.log("recommendationService.getUserRecommendations called with:", userId)
    try {
      const response = await api.get(`/users/${userId}/recommendations`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, data: [] };
    }
  },
  async generateRecommendations(userId) {
    try {
      const response = await api.post(`/users/${userId}/recommendations`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao gerar recomendações' };
    }
  },
  // Buscar recomendações de livros baseadas na biblioteca do usuário
  async getBookRecommendations(userId) {
    console.log("recommendationService.getBookRecommendations called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/recommendations/books`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error fetching book recommendations:", error);
      return { success: false, data: [], error: error.response?.data?.detail || 'Erro ao buscar recomendações de livros' };
    }
  },
  // Buscar recomendações de filmes baseadas na biblioteca do usuário
  async getMovieRecommendations(userId) {
    console.log("recommendationService.getMovieRecommendations called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/recommendations/movies`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error fetching movie recommendations:", error);
      return { success: false, data: [], error: error.response?.data?.detail || 'Erro ao buscar recomendações de filmes' };
    }
  }
};

// Serviço para usuários
export const userService = {
  // Atualizar dados do usuário
  async updateUser(userId, userData) {
    console.log("userService.updateUser called with:", userId, userData);
    try {
      const response = await api.put(`/users/${userId}`, userData);
      console.log("userService.updateUser API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("userService.updateUser error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao atualizar dados do usuário' };
    }
  },
  // Buscar usuários por username
  async searchUsers(query, limit = 10) {
    console.log("userService.searchUsers called with:", query);
    try {
      const response = await api.get(`/users/search?query=${encodeURIComponent(query)}&limit=${limit}`);
      console.log("userService.searchUsers API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("userService.searchUsers error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar usuários', data: [] };
    }
  },
  // Seguir um usuário
  async followUser(userId) {
    console.log("userService.followUser called with:", userId);
    try {
      const response = await api.post(`/users/${userId}/follow`);
      console.log("userService.followUser API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("userService.followUser error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao seguir usuário' };
    }
  },
  // Parar de seguir um usuário
  async unfollowUser(userId) {
    console.log("userService.unfollowUser called with:", userId);
    try {
      const response = await api.delete(`/users/${userId}/follow`);
      console.log("userService.unfollowUser API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("userService.unfollowUser error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao parar de seguir usuário' };
    }
  },
  // Verificar status de follow
  async checkFollowStatus(userId) {
    console.log("userService.checkFollowStatus called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/follow`);
      console.log("userService.checkFollowStatus API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("userService.checkFollowStatus error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao verificar status', data: { following: false, can_follow: false } };
    }
  },
  // Buscar atividades de um usuário
  async getUserActivities(userId, limit = 10) {
    console.log("userService.getUserActivities called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/activities?limit=${limit}`);
      console.log("userService.getUserActivities API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("userService.getUserActivities error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar atividades', data: [] };
    }
  },
  // Buscar seguidores de um usuário
  async getFollowers(userId) {
    console.log("userService.getFollowers called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/followers`);
      console.log("userService.getFollowers API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("userService.getFollowers error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar seguidores', data: [] };
    }
  },
  // Buscar usuários que um usuário está seguindo
  async getFollowing(userId) {
    console.log("userService.getFollowing called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/following`);
      console.log("userService.getFollowing API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("userService.getFollowing error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar seguindo', data: [] };
    }
  }
};

// Serviço para timeline
export const timelineService = {
  // Buscar timeline da comunidade
  async getCommunityTimeline(limit = 20, onlyFollowing = false) {
    console.log("timelineService.getCommunityTimeline called with:", limit, onlyFollowing);
    try {
      const response = await api.get(`/timeline?limit=${limit}&only_following=${onlyFollowing}`);
      console.log("timelineService.getCommunityTimeline API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("timelineService.getCommunityTimeline error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar timeline', data: [] };
    }
  }
};

// Serviço para perfil
export const profileService = {
  // Buscar perfil do usuário
  async getProfile(userId) {
	console.log("profileService.getProfile called with:", userId);
    try {
      const response = await api.get(`/profiles/${userId}`);
	  console.log("profileService.getProfile API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("profileService.getProfile error:", error);
      return { success: false, data: null };
    }
  },
  // Criar ou atualizar perfil
  async createOrUpdateProfile(userId, profileData) {
	console.log("profileService.createOrUpdateProfile called with:", userId, profileData);
    try {
      const response = await api.post('/profiles/', {
        user_id: userId,
        ...profileData
      });
	  console.log("profileService.createOrUpdateProfile API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("profileService.createOrUpdateProfile error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao salvar perfil' };
    }
  },
  // Upload de avatar
  async uploadAvatar(userId, file) {
    console.log("profileService.uploadAvatar called with:", userId, file);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/profiles/${userId}/upload-avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log("profileService.uploadAvatar API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("profileService.uploadAvatar error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao fazer upload do avatar' };
    }
  },
  // Deletar perfil
  async deleteProfile(userId) {
    console.log("profileService.deleteProfile called with:", userId);
    try {
      const response = await api.delete(`/profiles/${userId}`);
      console.log("profileService.deleteProfile API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("profileService.deleteProfile error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao deletar perfil' };
    }
  },
  // Remover avatar
  async removeAvatar(userId) {
    console.log("profileService.removeAvatar called with:", userId);
    try {
      const response = await api.delete(`/profiles/${userId}/avatar`);
      console.log("profileService.removeAvatar API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("profileService.removeAvatar error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao remover avatar' };
    }
  }
};

// Serviço para buscar em APIs externas
export const externalApiService = {
  // Buscar livros na Google Books API
  async searchBooks(query) {
	console.log("externalApiService.searchBooks called with:", query);
    try {
      const response = await api.get(`/books/search?query=${encodeURIComponent(query)}`);
	  console.log("externalApiService.searchBooks API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar livros (API externa)' };
    }
  },
  async getBooksFromBackend(query) {
    try {
      const response = await api.get(`/books?query=${encodeURIComponent(query)}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar livros (backend)' };
    }
  },
  async getMoviesFromBackend(query, options = {}) {
    try {
      const params = new URLSearchParams();
      params.set('query', query);
      if (options.limit) params.set('limit', options.limit);
      if (options.start_year) params.set('start_year', options.start_year);
      if (options.end_year) params.set('end_year', options.end_year);
      if (options.genre) params.set('genre', options.genre);
      if (options.sort_by) params.set('sort_by', options.sort_by);
      if (options.sort_order) params.set('sort_order', options.sort_order);

      const response = await api.get(`/movies?${params.toString()}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar filmes (backend)' };
    }
  },
  async getUserLibrary(userId) {
    try {
      const response = await api.get(`/users/${userId}/library`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar biblioteca' };
    }
  },
  async getUserMovieLibrary(userId) {
    try {
      const response = await api.get(`/users/${userId}/library/movies`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar biblioteca de filmes' };
    }
  },
  // Adicionar livro à biblioteca do usuário
  async addBookToLibrary(bookId) {
    console.log("externalApiService.addBookToLibrary called with:", bookId);
    try {
      const response = await api.post(`/library/add`, { book_id: bookId });
      console.log("externalApiService.addBookToLibrary API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("externalApiService.addBookToLibrary error:", error);
      const detail = error.response?.data?.detail;
      let message;
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail) && detail.length) {
        const first = detail[0];
        message = first?.msg || first?.detail || 'Erro ao adicionar livro à biblioteca';
      } else {
        message = error.message || 'Erro ao adicionar livro à biblioteca';
      }
      return { success: false, error: message };
    }
  },
  // Remover livro da biblioteca do usuário
  async removeBookFromLibrary(bookId) {
    console.log("externalApiService.removeBookFromLibrary called with:", bookId);
    try {
      const response = await api.delete(`/library/remove?book_id=${encodeURIComponent(bookId)}`);
      console.log("externalApiService.removeBookFromLibrary API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("externalApiService.removeBookFromLibrary error:", error);
      const detail = error.response?.data?.detail;
      let message;
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail) && detail.length) {
        const first = detail[0];
        message = first?.msg || first?.detail || 'Erro ao remover livro da biblioteca';
      } else {
        message = error.message || 'Erro ao remover livro da biblioteca';
      }
      return { success: false, error: message };
    }
  },
  // Adicionar filme à biblioteca do usuário
  async addMovieToLibrary(movieId) {
    console.log("externalApiService.addMovieToLibrary called with:", movieId);
    try {
      const response = await api.post(`/library/movies/add`, { movie_id: movieId });
      console.log("externalApiService.addMovieToLibrary API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("externalApiService.addMovieToLibrary error:", error);
      const detail = error.response?.data?.detail;
      let message;
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail) && detail.length) {
        const first = detail[0];
        message = first?.msg || first?.detail || 'Erro ao adicionar filme à biblioteca';
      } else {
        message = error.message || 'Erro ao adicionar filme à biblioteca';
      }
      return { success: false, error: message };
    }
  },
  // Remover filme da biblioteca do usuário
  async removeMovieFromLibrary(movieId) {
    console.log("externalApiService.removeMovieFromLibrary called with:", movieId);
    try {
      const response = await api.delete(`/library/movies/remove?movie_id=${encodeURIComponent(movieId)}`);
      console.log("externalApiService.removeMovieFromLibrary API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("externalApiService.removeMovieFromLibrary error:", error);
      const detail = error.response?.data?.detail;
      let message;
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail) && detail.length) {
        const first = detail[0];
        message = first?.msg || first?.detail || 'Erro ao remover filme da biblioteca';
      } else {
        message = error.message || 'Erro ao remover filme da biblioteca';
      }
      return { success: false, error: message };
    }
  },
};

// Serviço para avaliações
export const reviewService = {
  async getUserReviews(userId) {
    console.log("reviewService.getUserReviews called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/reviews`);
      console.log("externalApiService.getUserLibrary API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("externalApiService.getUserLibrary error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar biblioteca' };
    }
  }
};
