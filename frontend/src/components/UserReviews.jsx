import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ratingService } from '../services/apiService';
import './UserReviews.css';

const UserReviews = () => {
  const { user: usuario } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const carregarAvaliacoes = async () => {
      if (!usuario) return;

      try {
        setCarregando(true);
        const resposta = await ratingService.getUserRatings(usuario.id);
        if (resposta.success) {
          setAvaliacoes(resposta.data);
        } else {
          setErro('Erro ao carregar avaliações');
          console.error('Erro ao carregar avaliações:', resposta.message);
        }
      } catch (erro) {
        setErro('Erro ao carregar avaliações');
        console.error('Erro ao carregar avaliações:', erro);
      } finally {
        setCarregando(false);
      }
    };

    carregarAvaliacoes();
  }, [usuario]);

  if (carregando) {
    return <div>Carregando...</div>;
  }

  if (erro) {
    return <div className="error">{erro}</div>;
  }

  return (
    <div className="user-reviews-container">
      <h2>Minhas Avaliações</h2>
      {avaliacoes.length === 0 ? (
        <p>Nenhuma avaliação encontrada.</p>
      ) : (
        <table className="reviews-table">
          <thead>
            <tr>
              <th>Livro/Filme</th>
              <th>Avaliação</th>
              <th>Comentário</th>
            </tr>
          </thead>
          <tbody>
            {avaliacoes.map(avaliacao => (
              <tr key={avaliacao.id}>
                <td>
                  {avaliacao.book_id && <span>Livro: {avaliacao.book_id}</span>}
                  {avaliacao.movie_id && <span>Filme: {avaliacao.movie_id}</span>}
                </td>
                <td>{avaliacao.score}</td>
                <td>{avaliacao.comment || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserReviews;