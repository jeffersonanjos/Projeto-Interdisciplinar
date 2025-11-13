import api from './authService';

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
  async getUserLibrary(userId) {
    try {
      const response = await api.get(`/users/${userId}/library`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar biblioteca' };
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
  // Buscar biblioteca do usuário
  async getUserLibraryOld(userId) {
    console.log("externalApiService.getUserLibrary called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/library`);
      console.log("externalApiService.getUserLibrary API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("externalApiService.getUserLibrary error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar biblioteca' };
    }
  }
};
