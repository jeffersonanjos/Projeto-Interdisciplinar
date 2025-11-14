import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme}
      aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      <span className="theme-toggle-icon">
        {isDarkMode ? '☀️' : '🌙'}
      </span>
    </button>
  );
};

export default ThemeToggle;

