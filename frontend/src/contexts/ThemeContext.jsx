import React, { createContext, useContext, useState, useEffect } from 'react';
import backgroundLight from '../assets/background-light.bmp';
import backgroundDark from '../assets/background-dark.bmp';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Verificar preferência salva ou usar preferência do sistema
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    // Verificar preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Aplicar tema ao documento
    const root = document.documentElement;
    const body = document.body;
    
    if (isDarkMode) {
      root.classList.add('dark-mode');
      root.classList.remove('light-mode');
      // Definir background image para dark mode
      root.style.setProperty('--bg-image', `url(${backgroundDark})`);
      body.style.backgroundImage = `url(${backgroundDark})`;
      body.style.backgroundSize = 'contain';
      body.style.backgroundPosition = 'center center';
      body.style.backgroundRepeat = 'no-repeat';
    } else {
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
      // Definir background image para light mode
      root.style.setProperty('--bg-image', `url(${backgroundLight})`);
      body.style.backgroundImage = `url(${backgroundLight})`;
      body.style.backgroundSize = 'contain';
      body.style.backgroundPosition = 'center center';
      body.style.backgroundRepeat = 'no-repeat';
    }
    
    // Salvar preferência
    localStorage.setItem('darkMode', isDarkMode.toString());
    
    // Debug: verificar se as imagens foram carregadas
    console.log('Background images:', { backgroundLight, backgroundDark });
    console.log('Current theme:', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Escutar mudanças na preferência do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Só atualizar se não houver preferência salva
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

