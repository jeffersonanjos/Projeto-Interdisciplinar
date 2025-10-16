import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

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
  async login(username, password) {
    try {
      const response = await api.post('/login', {
        username,
        password,
      });
      
      const { access_token } = response.data;
      localStorage.setItem('access_token', access_token);
      
      // Buscar dados do usuário
      const userResponse = await api.get('/users/me/');
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      
      return { success: true, user: userResponse.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erro ao fazer login',
      };
    }
  },

  // Registro de novo usuário
  async register(username, email, password) {
    try {
      const response = await api.post('/users/', {
        username,
        email,
        password,
      });
      
      return { success: true, user: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erro ao criar conta',
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
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Obter token
  getToken() {
    return localStorage.getItem('access_token');
  },
};

export default api;