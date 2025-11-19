import React from 'react';
import './PixelLoader.css';

const PixelLoader = ({ message = 'Carregando...' }) => {
  return (
    <div className="pixel-loader-container">
      <div className="pixel-loader">
        <div className="pixel-loader__book">
          <div className="book-page page-1"></div>
          <div className="book-page page-2"></div>
          <div className="book-page page-3"></div>
          <div className="book-spine"></div>
        </div>
      </div>
      <p className="pixel-loader__message">{message}</p>
    </div>
  );
};

export default PixelLoader;

