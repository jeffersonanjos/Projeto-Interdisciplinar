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

  const login = async (username, password) => {
    setLoading(true);
 console.log("Login started");
    try {
      const result = await authService.login(username, password);
   console.log("Login API response:", result);
      if (result.success) {
        setUser(result.user);
  console.log("Login successful:", result.user);
        return { success: true };
      } else {
  console.log("Login failed:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
   console.error("Login error:", error);
      return { success: false, error: 'Erro inesperado ao fazer login' };
    } finally {
      setLoading(false);
   console.log("Login finished");
    }
  };

  const register = async (username, email, password) => {
    setLoading(true);
 console.log("Register started");
    try {
      const result = await authService.register(username, email, password);
   console.log("Register API response:", result);
      if (result.success) {
        // Após registro bem-sucedido, fazer login automaticamente
        const loginResult = await authService.login(username, password);
  console.log("Automatic login after register:", loginResult);
        if (loginResult.success) {
          setUser(loginResult.user);
    console.log("Register and automatic login successful:", loginResult.user);
          return { success: true };
        } else {
    console.log("Register successful, but automatic login failed:", loginResult.error);
          return { success: false, error: 'Conta criada, mas erro ao fazer login automático' };
        }
      } else {
     console.log("Register failed:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
   console.error("Register error:", error);
      return { success: false, error: 'Erro inesperado ao criar conta' };
    } finally {
      setLoading(false);
   console.log("Register finished");
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
 console.log("Logout successful");
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};