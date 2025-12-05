import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();
console.log("AuthContext loaded");

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  console.log("AuthProvider initialized");

  useEffect(() => {
    // Verificar se há um usuário logado ao carregar a aplicação
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const checkUserStatus = async () => {
      try {
        const response = await fetch('http://localhost:8001/users/me/', {
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          
          if (userData.is_banned) {
            alert('Sua conta foi banida. Você será desconectado.');
            logout();
            window.location.href = '/login';
            return;
          }

          if (userData.is_banned !== user.is_banned || userData.is_muted !== user.is_muted) {
            updateUser(userData);
          }
        } else if (response.status === 401) {
          logout();
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Erro ao verificar status do usuário:', error);
      }
    };

    const interval = setInterval(checkUserStatus, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (username, senha) => {
    setLoading(true);
 console.log("Login iniciado");
    try {
      const resultado = await authService.login(username, senha);
   console.log("Resposta da API de login:", resultado);
      if (resultado.success) {
        setUser(resultado.user);
  console.log("Login bem-sucedido:", resultado.user);
        return { success: true };
      } else {
  console.log("Login falhou:", resultado.error);
        return { success: false, error: resultado.error };
      }
    } catch (erro) {
   console.error("Erro no login:", erro);
      return { success: false, error: 'Erro inesperado ao fazer login' };
    } finally {
      setLoading(false);
   console.log("Login finalizado");
    }
  };

  const register = async (username, email, senha) => {
    setLoading(true);
 console.log("Registro iniciado");
    try {
      const resultado = await authService.register(username, email, senha);
   console.log("Resposta da API de registro:", resultado);
      if (resultado.success) {
        // Após registro bem-sucedido, fazer login automaticamente
        const resultadoLogin = await authService.login(username, senha);
  console.log("Login automático após registro:", resultadoLogin);
        if (resultadoLogin.success) {
          setUser(resultadoLogin.user);
    console.log("Registro e login automático bem-sucedidos:", resultadoLogin.user);
          return { success: true };
        } else {
    console.log("Registro bem-sucedido, mas login automático falhou:", resultadoLogin.error);
          return { success: false, error: 'Conta criada, mas erro ao fazer login automático' };
        }
      } else {
     console.log("Registro falhou:", resultado.error);
        return { success: false, error: resultado.error };
      }
    } catch (erro) {
   console.error("Erro no registro:", erro);
      return { success: false, error: 'Erro inesperado ao criar conta' };
    } finally {
      setLoading(false);
   console.log("Registro finalizado");
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
 console.log("Logout successful");
  };

  const updateUser = (usuarioAtualizado) => {
    setUser(usuarioAtualizado);
    if (usuarioAtualizado) {
      localStorage.setItem('user', JSON.stringify(usuarioAtualizado));
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};