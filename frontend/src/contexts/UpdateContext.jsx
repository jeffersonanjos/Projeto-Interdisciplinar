import React, { createContext, useContext, useState, useCallback } from 'react';

const UpdateContext = createContext();

export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate deve ser usado dentro de um UpdateProvider');
  }
  return context;
};

export const UpdateProvider = ({ children }) => {
  const [atualizacaoBiblioteca, setAtualizacaoBiblioteca] = useState(0);
  const [atualizacaoAvaliacoes, setAtualizacaoAvaliacoes] = useState(0);
  const [atualizacaoTimeline, setAtualizacaoTimeline] = useState(0);
  const [atualizacaoMetricas, setAtualizacaoMetricas] = useState(0);

  const notificarAtualizacaoBiblioteca = useCallback(() => {
    setAtualizacaoBiblioteca((anterior) => anterior + 1);
    setAtualizacaoMetricas((anterior) => anterior + 1);
    setAtualizacaoTimeline((anterior) => anterior + 1);
  }, []);

  const notificarAtualizacaoAvaliacoes = useCallback(() => {
    setAtualizacaoAvaliacoes((anterior) => anterior + 1);
    setAtualizacaoMetricas((anterior) => anterior + 1);
    setAtualizacaoTimeline((anterior) => anterior + 1);
  }, []);

  const notificarAtualizacaoTimeline = useCallback(() => {
    setAtualizacaoTimeline((anterior) => anterior + 1);
  }, []);

  const notificarAtualizacaoMetricas = useCallback(() => {
    setAtualizacaoMetricas((anterior) => anterior + 1);
  }, []);

  const valor = {
    atualizacaoBiblioteca,
    atualizacaoAvaliacoes,
    atualizacaoTimeline,
    atualizacaoMetricas,
    notificarAtualizacaoBiblioteca,
    notificarAtualizacaoAvaliacoes,
    notificarAtualizacaoTimeline,
    notificarAtualizacaoMetricas,
  };

  return (
    <UpdateContext.Provider value={valor}>
      {children}
    </UpdateContext.Provider>
  );
};

