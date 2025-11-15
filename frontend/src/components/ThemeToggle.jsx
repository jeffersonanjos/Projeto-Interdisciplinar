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
        {isDarkMode ? (
          <div className="pixel-sun">
            <div className="sun-center"></div>
            <div className="sun-ray ray-1"></div>
            <div className="sun-ray ray-2"></div>
            <div className="sun-ray ray-3"></div>
            <div className="sun-ray ray-4"></div>
            <div className="sun-ray ray-5"></div>
            <div className="sun-ray ray-6"></div>
            <div className="sun-ray ray-7"></div>
            <div className="sun-ray ray-8"></div>
          </div>
        ) : (
          <div className="pixel-moon">
            <div className="moon-outer"></div>
            <div className="moon-inner"></div>
          </div>
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;

