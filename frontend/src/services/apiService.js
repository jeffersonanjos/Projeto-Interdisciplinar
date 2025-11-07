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
	  console.error("movieService.getUserMovies error:", error);
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
      return { success: false, error: error.response?.data?.detail || 'Erro ao criar avaliação' };
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
	console.log("recommendationService.getUserRecommendations called with:", userId);
    try {
      const response = await api.get(`/users/${userId}/recommendations`);
	  console.log("recommendationService.getUserRecommendations API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("recommendationService.getUserRecommendations error:", error);
      return { success: false, data: [] };
    }
  },
  // Gerar recomendações
  async generateRecommendations(userId) {
	console.log("recommendationService.generateRecommendations called with:", userId);
    try {
      const response = await api.post(`/recommendations/generate/${userId}`);
	  console.log("recommendationService.generateRecommendations API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("recommendationService.generateRecommendations error:", error);
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
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`);
	  console.log("externalApiService.searchBooks API response:", response);
      const data = await response.json();
	  console.log("externalApiService.searchBooks data:", data);

      if (data.items) {
        const books = data.items.map(item => ({
          title: item.volumeInfo.title,
          author: item.volumeInfo.authors?.join(', ') || 'Autor desconhecido',
          description: item.volumeInfo.description || 'Sem descrição disponível',
          cover_url: item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail || null,
          external_id: item.id
        }));
		console.log("externalApiService.searchBooks books:", books);
        return { success: true, data: books };
      }
      return { success: true, data: [] };
    } catch (error) {
	  console.error("externalApiService.searchBooks error:", error);
      return { success: false, error: 'Erro ao buscar livros na API externa' };
    }
  },
  // Buscar filmes na TMDB API (requer API key - usando exemplo)
  async searchMovies(query) {
	console.log("externalApiService.searchMovies called with:", query);
    try {
      // Nota: Para usar a TMDB API, você precisa de uma API key
      // Por enquanto, retornamos dados mockados ou fazemos uma busca básica
      // const API_KEY = 'sua_api_key_aqui';
      // const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);

      // Por enquanto, retornamos uma estrutura vazia
      // Em produção, você deve configurar a API key da TMDB
	  console.log("externalApiService.searchMovies TMDB API key not configured");
      return { success: false, error: 'Configuração da API TMDB necessária' };
    } catch (error) {
	  console.error("externalApiService.searchMovies error:", error);
      return { success: false, error: 'Erro ao buscar filmes na API externa' };
    }
  },
  // Buscar livros no backend
  async getBooksFromBackend(query) {
	console.log("externalApiService.getBooksFromBackend called with:", query);
    try {
      const response = await api.get(`/books?query=${encodeURIComponent(query)}`);
	  console.log("externalApiService.getBooksFromBackend API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("externalApiService.getBooksFromBackend error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar livros no backend' };
    }
  },
  // Buscar filme no backend
  async getMoviesFromBackend(query) {
	console.log("externalApiService.getMoviesFromBackend called with:", query);
    try {
      const response = await api.get(`/movies?query=${encodeURIComponent(query)}`);
	  console.log("externalApiService.getMoviesFromBackend API response:", response);
      return { success: true, data: response.data };
    } catch (error) {
	  console.error("externalApiService.getMoviesFromBackend error:", error);
      return { success: false, error: error.response?.data?.detail || 'Erro ao buscar filmes no backend' };
    }
  }
};
