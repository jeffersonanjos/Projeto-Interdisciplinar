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
    // Remover qualquer overlay existente de tentativas anteriores
    const existingOverlay = document.getElementById('background-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Aplicar tema ao documento
    const root = document.documentElement;
    const body = document.body;
    
    // Adicionar classe de transição para suavizar a mudança
    root.classList.add('theme-transitioning');
    
    // Usar requestAnimationFrame para garantir que a transição seja suave
    const applyBackgroundBaseStyles = () => {
      const rootStyles = getComputedStyle(root);
      const bgPrimary = rootStyles.getPropertyValue('--bg-primary')?.trim() || '#1f5a2d';
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'top center';
      body.style.backgroundRepeat = 'no-repeat';
      body.style.backgroundAttachment = 'fixed';
      body.style.backgroundColor = bgPrimary;
    };

    requestAnimationFrame(() => {
      if (isDarkMode) {
        root.classList.add('dark-mode');
        root.classList.remove('light-mode');
        // Definir background image para dark mode
        root.style.setProperty('--bg-image', `url(${backgroundDark})`);
        body.style.backgroundImage = `url(${backgroundDark})`;
        applyBackgroundBaseStyles();
      } else {
        root.classList.add('light-mode');
        root.classList.remove('dark-mode');
        // Definir background image para light mode
        root.style.setProperty('--bg-image', `url(${backgroundLight})`);
        body.style.backgroundImage = `url(${backgroundLight})`;
        applyBackgroundBaseStyles();
      }
      
      // Remover classe de transição após a animação
      setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 600);
    });
    
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

