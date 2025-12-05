import api from './authService.js';

// Serviço para livros
export const bookService = {
  // Buscar livros (quando o endpoint estiver disponível)
  async getBooks() {
	console.log("bookService.getBooks chamado");
    try {
      const resposta = await api.get('/books/');
	  console.log("bookService.getBooks resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("bookService.getBooks erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar livros' };
    }
  },
  // Criar novo livro
  async createBook(dadosLivro) {
	console.log("bookService.createBook chamado com:", dadosLivro);
    try {
      const resposta = await api.post('/books/', dadosLivro);
	  console.log("bookService.createBook resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("bookService.createBook erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao criar livro' };
    }
  },
  // Buscar livro por ID
  async getBookById(id) {
	console.log("bookService.getBookById chamado com:", id);
    try {
      const resposta = await api.get(`/books/${id}`);
	  console.log("bookService.getBookById resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("bookService.getBookById erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar livro' };
    }
  },
  // Buscar livros do usuário (avaliações)
  async getUserBooks(idUsuario) {
	console.log("bookService.getUserBooks chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/users/${idUsuario}/books`);
	  console.log("bookService.getUserBooks resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("bookService.getUserBooks erro:", erro);
      return { success: false, data: [] };
    }
  }
};

// Serviço para filmes
export const movieService = {
  // Buscar filmes (quando o endpoint estiver disponível)
  async getMovies() {
	console.log("movieService.getMovies chamado");
    try {
      const resposta = await api.get('/movies/');
	  console.log("movieService.getMovies resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("movieService.getMovies erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar filmes' };
    }
  },
  // Criar novo filme
  async createMovie(dadosFilme) {
	console.log("movieService.createMovie chamado com:", dadosFilme);
    try {
      const resposta = await api.post('/movies/', dadosFilme);
	  console.log("movieService.createMovie resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("movieService.createMovie erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao criar filme' };
    }
  },
  // Buscar filme por ID
  async getMovieById(id) {
	console.log("movieService.getMovieById chamado com:", id);
    try {
      const resposta = await api.get(`/movies/${id}`);
	  console.log("movieService.getMovieById resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("movieService.getMovieById erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar filme' };
    }
  },
  // Buscar filmes do usuário (avaliações)
  async getUserMovies(idUsuario) {
	console.log("movieService.getUserMovies chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/users/${idUsuario}/movies`);
	  console.log("movieService.getUserMovies resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {

      return { success: false, data: [] };
    }
  }
};

// Serviço para avaliações
export const ratingService = {
  // Criar avaliação
  async createRating(dadosAvaliacao) {
	console.log("ratingService.createRating chamado com:", dadosAvaliacao);
    try {
      const resposta = await api.post('/ratings/', dadosAvaliacao);
	  console.log("ratingService.createRating resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("ratingService.createRating erro:", erro);
      const detalhe = erro.response?.data?.detail;
      let mensagem;
      if (typeof detalhe === 'string') {
        mensagem = detalhe;
      } else if (Array.isArray(detalhe) && detalhe.length) {
        // Erros de validação FastAPI 422
        const primeiro = detalhe[0];
        mensagem = primeiro?.msg || primeiro?.detail || 'Erro de validação';
      } else {
        mensagem = erro.message || 'Erro ao criar avaliação';
      }
      return { success: false, error: mensagem };
    }
  },
  async updateRating(idAvaliacao, dadosAvaliacao) {
	console.log("ratingService.updateRating chamado com:", idAvaliacao, dadosAvaliacao);
    try {
      const resposta = await api.put(`/ratings/${idAvaliacao}`, dadosAvaliacao);
	  console.log("ratingService.updateRating resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("ratingService.updateRating erro:", erro);
      const detalhe = erro.response?.data?.detail;
      const mensagem = typeof detalhe === 'string'
        ? detalhe
        : erro.message || 'Erro ao atualizar avaliação';
      return { success: false, error: mensagem };
    }
  },
  async deleteRating(idAvaliacao) {
	console.log("ratingService.deleteRating chamado com:", idAvaliacao);
    try {
      await api.delete(`/ratings/${idAvaliacao}`);
      return { success: true };
    } catch (erro) {
	  console.error("ratingService.deleteRating erro:", erro);
      const detalhe = erro.response?.data?.detail;
      const mensagem = typeof detalhe === 'string'
        ? detalhe
        : erro.message || 'Erro ao excluir avaliação';
      return { success: false, error: mensagem };
    }
  },
  // Buscar avaliações do usuário
  async getUserRatings(idUsuario) {
	console.log("ratingService.getUserRatings chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/users/${idUsuario}/ratings`);
	  console.log("ratingService.getUserRatings resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("ratingService.getUserRatings erro:", erro);
      return { success: false, data: [] };
    }
  },
  // Buscar avaliações de um livro
  async getBookRatings(idLivro) {
	console.log("ratingService.getBookRatings chamado com:", idLivro);
    try {
      const resposta = await api.get(`/books/${idLivro}/ratings`);
	  console.log("ratingService.getBookRatings resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("ratingService.getBookRatings erro:", erro);
      return { success: false, data: [] };
    }
  },
  // Buscar avaliações de um filme
  async getMovieRatings(idFilme) {
	console.log("ratingService.getMovieRatings chamado com:", idFilme);
    try {
      const resposta = await api.get(`/movies/${idFilme}/ratings`);
	  console.log("ratingService.getMovieRatings resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("ratingService.getMovieRatings erro:", erro);
      return { success: false, data: [] };
    }
  }
};

// Serviço para recomendações
export const recommendationService = {
  // Buscar recomendações do usuário
  async getUserRecommendations(idUsuario) {
	console.log("recommendationService.getUserRecommendations chamado com:", idUsuario)
    try {
      const resposta = await api.get(`/users/${idUsuario}/recommendations`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      return { success: false, data: [] };
    }
  },
  async generateRecommendations(idUsuario) {
    try {
      const resposta = await api.post(`/users/${idUsuario}/recommendations`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      return { success: false, error: erro.response?.data?.detail || 'Erro ao gerar recomendações' };
    }
  },
  // Buscar recomendações de livros baseadas na biblioteca do usuário
  async getBookRecommendations(idUsuario) {
    console.log("recommendationService.getBookRecommendations chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/users/${idUsuario}/recommendations/books`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("Erro ao buscar recomendações de livros:", erro);
      return { success: false, data: [], error: erro.response?.data?.detail || 'Erro ao buscar recomendações de livros' };
    }
  },
  // Buscar recomendações de filmes baseadas na biblioteca do usuário
  async getMovieRecommendations(idUsuario) {
    console.log("recommendationService.getMovieRecommendations chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/users/${idUsuario}/recommendations/movies`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("Erro ao buscar recomendações de filmes:", erro);
      return { success: false, data: [], error: erro.response?.data?.detail || 'Erro ao buscar recomendações de filmes' };
    }
  }
};

// Serviço para usuários
export const userService = {
  // Atualizar dados do usuário
  async updateUser(idUsuario, dadosUsuario) {
    console.log("userService.updateUser chamado com:", idUsuario, dadosUsuario);
    try {
      const resposta = await api.put(`/users/${idUsuario}`, dadosUsuario);
      console.log("userService.updateUser resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("userService.updateUser erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao atualizar dados do usuário' };
    }
  },
  // Buscar usuários por username
  async searchUsers(consulta, limite = 10) {
    console.log("userService.searchUsers chamado com:", consulta);
    try {
      const resposta = await api.get(`/users/search?consulta=${encodeURIComponent(consulta)}&limit=${limite}`);
      console.log("userService.searchUsers resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("userService.searchUsers erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar usuários', data: [] };
    }
  },
  // Seguir um usuário
  async followUser(idUsuario) {
    console.log("userService.followUser chamado com:", idUsuario);
    try {
      const resposta = await api.post(`/users/${idUsuario}/follow`);
      console.log("userService.followUser resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("userService.followUser erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao seguir usuário' };
    }
  },
  // Parar de seguir um usuário
  async unfollowUser(idUsuario) {
    console.log("userService.unfollowUser chamado com:", idUsuario);
    try {
      const resposta = await api.delete(`/users/${idUsuario}/follow`);
      console.log("userService.unfollowUser resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("userService.unfollowUser erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao parar de seguir usuário' };
    }
  },
  // Verificar status de follow
  async checkFollowStatus(idUsuario) {
    console.log("userService.checkFollowStatus chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/users/${idUsuario}/follow`);
      console.log("userService.checkFollowStatus resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("userService.checkFollowStatus erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao verificar status', data: { following: false, can_follow: false } };
    }
  },
  // Buscar atividades de um usuário
  async getUserActivities(idUsuario, limite = 10) {
    console.log("userService.getUserActivities chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/users/${idUsuario}/activities?limit=${limite}`);
      console.log("userService.getUserActivities resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("userService.getUserActivities erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar atividades', data: [] };
    }
  },
  // Buscar seguidores de um usuário
  async getFollowers(idUsuario) {
    console.log("userService.getFollowers chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/users/${idUsuario}/followers`);
      console.log("userService.getFollowers resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("userService.getFollowers erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar seguidores', data: [] };
    }
  },
  // Buscar usuários que um usuário está seguindo
  async getFollowing(idUsuario) {
    console.log("userService.getFollowing chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/users/${idUsuario}/following`);
      console.log("userService.getFollowing resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("userService.getFollowing erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar seguindo', data: [] };
    }
  }
};

// Serviço para timeline
export const timelineService = {
  // Buscar timeline da comunidade
  async getCommunityTimeline(limite = 20, apenasSeguindo = false) {
    console.log("timelineService.getCommunityTimeline chamado com:", limite, apenasSeguindo);
    try {
      const resposta = await api.get(`/timeline?limit=${limite}&only_following=${apenasSeguindo}`);
      console.log("timelineService.getCommunityTimeline resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("timelineService.getCommunityTimeline erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar timeline', data: [] };
    }
  }
};

// Serviço para perfil
export const profileService = {
  // Buscar perfil do usuário
  async getProfile(idUsuario) {
	console.log("profileService.getProfile chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/profiles/${idUsuario}`);
	  console.log("profileService.getProfile resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("profileService.getProfile erro:", erro);
      return { success: false, data: null };
    }
  },
  // Criar ou atualizar perfil
  async createOrUpdateProfile(idUsuario, dadosPerfil) {
	console.log("profileService.createOrUpdateProfile chamado com:", idUsuario, dadosPerfil);
    try {
      const resposta = await api.post('/profiles/', {
        user_id: idUsuario,
        ...dadosPerfil
      });
	  console.log("profileService.createOrUpdateProfile resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
	  console.error("profileService.createOrUpdateProfile erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao salvar perfil' };
    }
  },
  // Upload de avatar
  async uploadAvatar(idUsuario, arquivo) {
    console.log("profileService.uploadAvatar chamado com:", idUsuario, arquivo);
    try {
      const formData = new FormData();
      formData.append('file', arquivo);
      const resposta = await api.post(`/profiles/${idUsuario}/upload-avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log("profileService.uploadAvatar resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("profileService.uploadAvatar erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao fazer upload do avatar' };
    }
  },
  // Deletar perfil
  async deleteProfile(idUsuario) {
    console.log("profileService.deleteProfile chamado com:", idUsuario);
    try {
      const resposta = await api.delete(`/profiles/${idUsuario}`);
      console.log("profileService.deleteProfile resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("profileService.deleteProfile erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao deletar perfil' };
    }
  },
  // Remover avatar
  async removeAvatar(idUsuario) {
    console.log("profileService.removeAvatar chamado com:", idUsuario);
    try {
      const resposta = await api.delete(`/profiles/${idUsuario}/avatar`);
      console.log("profileService.removeAvatar resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("profileService.removeAvatar erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao remover avatar' };
    }
  }
};

// Serviço para buscar em APIs externas
export const externalApiService = {
  // Buscar livros na Google Books API
  async searchBooks(consulta) {
	console.log("externalApiService.searchBooks chamado com:", consulta);
    try {
      const resposta = await api.get(`/books/search?query=${encodeURIComponent(consulta)}`);
	  console.log("externalApiService.searchBooks resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar livros (API externa)' };
    }
  },
  async getBooksFromBackend(consulta) {
    try {
      const resposta = await api.get(`/books/search?query=${encodeURIComponent(consulta)}`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar livros (backend)' };
    }
  },
  async getMoviesFromBackend(consulta, opcoes = {}) {
    try {
      const params = new URLSearchParams();
      params.set('query', consulta);
      if (opcoes.limit) params.set('limit', opcoes.limit);
      if (opcoes.start_year) params.set('start_year', opcoes.start_year);
      if (opcoes.end_year) params.set('end_year', opcoes.end_year);
      if (opcoes.genre) params.set('genre', opcoes.genre);
      if (opcoes.sort_by) params.set('sort_by', opcoes.sort_by);
      if (opcoes.sort_order) params.set('sort_order', opcoes.sort_order);

      const resposta = await api.get(`/movies?${params.toString()}`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar filmes (backend)' };
    }
  },
  async getUserLibrary(idUsuario) {
    try {
      const resposta = await api.get(`/users/${idUsuario}/library`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar biblioteca' };
    }
  },
  async getUserMovieLibrary(idUsuario) {
    try {
      const resposta = await api.get(`/users/${idUsuario}/library/movies`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar biblioteca de filmes' };
    }
  },
  // Adicionar livro à biblioteca do usuário
  async addBookToLibrary(idLivro) {
    console.log("externalApiService.addBookToLibrary chamado com:", idLivro);
    try {
      const resposta = await api.post(`/library/add`, { book_id: idLivro });
      console.log("externalApiService.addBookToLibrary resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("externalApiService.addBookToLibrary erro:", erro);
      const detalhe = erro.response?.data?.detail;
      let mensagem;
      if (typeof detalhe === 'string') {
        mensagem = detalhe;
      } else if (Array.isArray(detalhe) && detalhe.length) {
        const primeiro = detalhe[0];
        mensagem = primeiro?.msg || primeiro?.detail || 'Erro ao adicionar livro à biblioteca';
      } else {
        mensagem = erro.message || 'Erro ao adicionar livro à biblioteca';
      }
      return { success: false, error: mensagem };
    }
  },
  // Remover livro da biblioteca do usuário
  async removeBookFromLibrary(idLivro) {
    console.log("externalApiService.removeBookFromLibrary chamado com:", idLivro);
    try {
      const resposta = await api.delete(`/library/remove?book_id=${encodeURIComponent(idLivro)}`);
      console.log("externalApiService.removeBookFromLibrary resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("externalApiService.removeBookFromLibrary erro:", erro);
      const detalhe = erro.response?.data?.detail;
      let mensagem;
      if (typeof detalhe === 'string') {
        mensagem = detalhe;
      } else if (Array.isArray(detalhe) && detalhe.length) {
        const primeiro = detalhe[0];
        mensagem = primeiro?.msg || primeiro?.detail || 'Erro ao remover livro da biblioteca';
      } else {
        mensagem = erro.message || 'Erro ao remover livro da biblioteca';
      }
      return { success: false, error: mensagem };
    }
  },
  // Adicionar filme à biblioteca do usuário
  async addMovieToLibrary(idFilme) {
    console.log("externalApiService.addMovieToLibrary chamado com:", idFilme);
    try {
      const resposta = await api.post(`/library/movies/add`, { movie_id: idFilme });
      console.log("externalApiService.addMovieToLibrary resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("externalApiService.addMovieToLibrary erro:", erro);
      const detalhe = erro.response?.data?.detail;
      let mensagem;
      if (typeof detalhe === 'string') {
        mensagem = detalhe;
      } else if (Array.isArray(detalhe) && detalhe.length) {
        const primeiro = detalhe[0];
        mensagem = primeiro?.msg || primeiro?.detail || 'Erro ao adicionar filme à biblioteca';
      } else {
        mensagem = erro.message || 'Erro ao adicionar filme à biblioteca';
      }
      return { success: false, error: mensagem };
    }
  },
  // Remover filme da biblioteca do usuário
  async removeMovieFromLibrary(idFilme) {
    console.log("externalApiService.removeMovieFromLibrary chamado com:", idFilme);
    try {
      const resposta = await api.delete(`/library/movies/remove?movie_id=${encodeURIComponent(idFilme)}`);
      console.log("externalApiService.removeMovieFromLibrary resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("externalApiService.removeMovieFromLibrary erro:", erro);
      const detalhe = erro.response?.data?.detail;
      let mensagem;
      if (typeof detalhe === 'string') {
        mensagem = detalhe;
      } else if (Array.isArray(detalhe) && detalhe.length) {
        const primeiro = detalhe[0];
        mensagem = primeiro?.msg || primeiro?.detail || 'Erro ao remover filme da biblioteca';
      } else {
        mensagem = erro.message || 'Erro ao remover filme da biblioteca';
      }
      return { success: false, error: mensagem };
    }
  },
  // Buscar filme por ID (external_id)
  async getMovieById(idExterno) {
    console.log("externalApiService.getMovieById chamado com:", idExterno);
    try {
      const resposta = await api.get(`/movies/${idExterno}`);
      console.log("externalApiService.getMovieById resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("externalApiService.getMovieById erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar filme' };
    }
  },
  // Buscar livro por ID (external_id)
  async getBookById(idExterno) {
    console.log("externalApiService.getBookById chamado com:", idExterno);
    try {
      const resposta = await api.get(`/books/${idExterno}`);
      console.log("externalApiService.getBookById resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("externalApiService.getBookById erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar livro' };
    }
  },
};

// Serviço para avaliações
export const reviewService = {
  async getUserReviews(idUsuario) {
    console.log("reviewService.getUserReviews chamado com:", idUsuario);
    try {
      const resposta = await api.get(`/users/${idUsuario}/reviews`);
      console.log("externalApiService.getUserLibrary resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("externalApiService.getUserLibrary erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar biblioteca' };
    }
  }
};

export const reportService = {
  async createReport(dadosDenuncia) {
    console.log("reportService.createReport chamado com:", dadosDenuncia);
    try {
      const resposta = await api.post('/reports/', dadosDenuncia);
      console.log("reportService.createReport resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("reportService.createReport erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao criar denúncia' };
    }
  },
  
  async getReports(statusFilter = null) {
    console.log("reportService.getReports chamado com status:", statusFilter);
    try {
      const url = statusFilter ? `/reports/?status_filter=${statusFilter}` : '/reports/';
      const resposta = await api.get(url);
      console.log("reportService.getReports resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("reportService.getReports erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar denúncias' };
    }
  },
  
  async updateReport(reportId, dadosAtualizacao) {
    console.log("reportService.updateReport chamado com:", reportId, dadosAtualizacao);
    try {
      const resposta = await api.patch(`/reports/${reportId}`, dadosAtualizacao);
      console.log("reportService.updateReport resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("reportService.updateReport erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao atualizar denúncia' };
    }
  },
  
  async deleteReport(reportId) {
    console.log("reportService.deleteReport chamado com:", reportId);
    try {
      await api.delete(`/reports/${reportId}`);
      console.log("reportService.deleteReport sucesso");
      return { success: true };
    } catch (erro) {
      console.error("reportService.deleteReport erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao deletar denúncia' };
    }
  }
};

export const adminService = {
  async createBookManually(dadosLivro) {
    console.log("adminService.createBookManually chamado com:", dadosLivro);
    try {
      const resposta = await api.post('/books/manual', dadosLivro);
      console.log("adminService.createBookManually resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("adminService.createBookManually erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao criar livro manualmente' };
    }
  },
  
  async createMovieManually(dadosFilme) {
    console.log("adminService.createMovieManually chamado com:", dadosFilme);
    try {
      const resposta = await api.post('/movies/manual', dadosFilme);
      console.log("adminService.createMovieManually resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("adminService.createMovieManually erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao criar filme manualmente' };
    }
  }
};

export const moderationService = {
  async createModeration(dadosModeracao) {
    console.log("moderationService.createModeration chamado com:", dadosModeracao);
    try {
      const resposta = await api.post('/moderation/', dadosModeracao);
      console.log("moderationService.createModeration resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("moderationService.createModeration erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao criar ação de moderação' };
    }
  },
  
  async getModerations(statusFilter = null) {
    console.log("moderationService.getModerations chamado com status:", statusFilter);
    try {
      const url = statusFilter ? `/moderation/?status_filter=${statusFilter}` : '/moderation/';
      const resposta = await api.get(url);
      console.log("moderationService.getModerations resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("moderationService.getModerations erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar ações de moderação' };
    }
  },
  
  async updateModeration(moderationId, dadosAtualizacao) {
    console.log("moderationService.updateModeration chamado com:", moderationId, dadosAtualizacao);
    try {
      const resposta = await api.patch(`/moderation/${moderationId}`, dadosAtualizacao);
      console.log("moderationService.updateModeration resposta da API:", resposta);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("moderationService.updateModeration erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao atualizar ação de moderação' };
    }
  },
  
  async deleteModeration(moderationId) {
    console.log("moderationService.deleteModeration chamado com:", moderationId);
    try {
      await api.delete(`/moderation/${moderationId}`);
      console.log("moderationService.deleteModeration sucesso");
      return { success: true };
    } catch (erro) {
      console.error("moderationService.deleteModeration erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao deletar ação de moderação' };
    }
  },

  async searchUsers(query) {
    try {
      const resposta = await api.get(`/moderation/search/users?query=${encodeURIComponent(query)}`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("moderationService.searchUsers erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar usuários' };
    }
  },

  async banUser(userId) {
    try {
      const resposta = await api.post(`/moderation/users/${userId}/ban`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("moderationService.banUser erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao banir usuário' };
    }
  },

  async unbanUser(userId) {
    try {
      const resposta = await api.post(`/moderation/users/${userId}/unban`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("moderationService.unbanUser erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao desbanir usuário' };
    }
  },

  async muteUser(userId) {
    try {
      const resposta = await api.post(`/moderation/users/${userId}/mute`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("moderationService.muteUser erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao mutar usuário' };
    }
  },

  async unmuteUser(userId) {
    try {
      const resposta = await api.post(`/moderation/users/${userId}/unmute`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("moderationService.unmuteUser erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao desmutar usuário' };
    }
  }
};

export const contentModerationService = {
  async searchBooks(query) {
    try {
      const resposta = await api.get(`/reports/search/books?query=${encodeURIComponent(query)}`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("contentModerationService.searchBooks erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar livros' };
    }
  },

  async searchMovies(query) {
    try {
      const resposta = await api.get(`/reports/search/movies?query=${encodeURIComponent(query)}`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("contentModerationService.searchMovies erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao buscar filmes' };
    }
  },

  async banBook(bookId) {
    try {
      const resposta = await api.post(`/reports/books/${bookId}/ban`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("contentModerationService.banBook erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao banir livro' };
    }
  },

  async unbanBook(bookId) {
    try {
      const resposta = await api.post(`/reports/books/${bookId}/unban`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("contentModerationService.unbanBook erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao desbanir livro' };
    }
  },

  async muteBook(bookId) {
    try {
      const resposta = await api.post(`/reports/books/${bookId}/mute`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("contentModerationService.muteBook erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao mutar livro' };
    }
  },

  async unmuteBook(bookId) {
    try {
      const resposta = await api.post(`/reports/books/${bookId}/unmute`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("contentModerationService.unmuteBook erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao desmutar livro' };
    }
  },

  async banMovie(movieId) {
    try {
      const resposta = await api.post(`/reports/movies/${movieId}/ban`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("contentModerationService.banMovie erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao banir filme' };
    }
  },

  async unbanMovie(movieId) {
    try {
      const resposta = await api.post(`/reports/movies/${movieId}/unban`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("contentModerationService.unbanMovie erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao desbanir filme' };
    }
  },

  async muteMovie(movieId) {
    try {
      const resposta = await api.post(`/reports/movies/${movieId}/mute`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("contentModerationService.muteMovie erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao mutar filme' };
    }
  },

  async unmuteMovie(movieId) {
    try {
      const resposta = await api.post(`/reports/movies/${movieId}/unmute`);
      return { success: true, data: resposta.data };
    } catch (erro) {
      console.error("contentModerationService.unmuteMovie erro:", erro);
      return { success: false, error: erro.response?.data?.detail || 'Erro ao desmutar filme' };
    }
  }
};
