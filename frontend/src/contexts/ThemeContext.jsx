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
    
    // Adicionar classe de transição para suavizar a mudança
    root.classList.add('theme-transitioning');
    
    requestAnimationFrame(() => {
      if (isDarkMode) {
        root.classList.add('dark-mode');
        root.classList.remove('light-mode');
      } else {
        root.classList.add('light-mode');
        root.classList.remove('dark-mode');
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
      <div 
        className="background-blur"
        style={{
          position: 'fixed',
          top: '-100px',
          left: '-100px',
          right: '-100px',
          bottom: '-100px',
          width: 'calc(100vw + 200px)',
          height: 'calc(100vh + 200px)',
          backgroundImage: `url(${isDarkMode ? backgroundDark : backgroundLight})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundColor: isDarkMode ? '#000000' : '#ffffff',
          filter: 'blur(8px)',
          WebkitFilter: 'blur(8px)',
          zIndex: -1,
          transition: 'background-image 0.6s ease-in-out, filter 0.6s ease-in-out, background-color 0.6s ease-in-out',
          overflow: 'hidden',
          transform: 'scale(1.15)'
        }}
      />
      {children}
    </ThemeContext.Provider>
  );
};

