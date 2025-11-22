import axios from 'axios';
const API_BASE_URL = 'http://localhost:8001';

// Configurar axios com base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com respostas de erro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Login do usuário
  async login(username, senha) {
	console.log("authService.login chamado com:", username, senha);
    try {
      const resposta = await api.post('/login', {
        username,
        password: senha,
      });
	  console.log("authService.login resposta da API:", resposta);
      
      const { access_token } = resposta.data;
      localStorage.setItem('access_token', access_token);
	  console.log("authService.login access_token definido:", access_token);
      
      // Buscar dados do usuário
      const respostaUsuario = await api.get('/users/me/');
	  console.log("authService.login respostaUsuario:", respostaUsuario);
      localStorage.setItem('user', JSON.stringify(respostaUsuario.data));
	  console.log("authService.login usuário definido:", respostaUsuario.data);
      
      return { success: true, user: respostaUsuario.data };
    } catch (erro) {
	  console.error("authService.login erro:", erro);
      return {
        success: false,
        error: erro.response?.data?.detail || 'Erro ao fazer login',
      };
    }
  },

  // Registro de novo usuário
  async register(username, email, senha) {
	console.log("authService.register chamado com:", username, email, senha);
    try {
      const resposta = await api.post('/users/', {
        username,
        email,
        password: senha,
      });
	  console.log("authService.register resposta da API:", resposta);
      return { success: true, user: resposta.data };
    } catch (erro) {
	  console.error("authService.register erro:", erro);
      return {
        success: false,
        error: erro.response?.data?.detail || 'Erro ao criar conta',
      };
    }
  },

  // Logout
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  // Verificar se usuário está autenticado
  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },

  // Obter usuário atual
  getCurrentUser() {
    const usuario = localStorage.getItem('user');
    return usuario ? JSON.parse(usuario) : null;
  },

  // Obter token
  getToken() {
    return localStorage.getItem('access_token');
  },
};

export default api;