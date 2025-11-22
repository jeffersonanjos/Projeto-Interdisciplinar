import React, { useState, useEffect } from 'react';
import './Search.css';
import SearchResults from './SearchResults';
import { externalApiService } from '../services/apiService';

const Search = () => {
  console.log("Search component loaded");
  const [query, setQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [movieResults, setMovieResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState('books'); // 'books' ou 'movies' - agora é apenas um filtro
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    console.log("Search useEffect called");
    // Clear results when query changes
    setBookResults([]);
    setMovieResults([]);
    setHasSearched(false);
    setError('');
  }, [query]);

  const handleSearch = async () => {
    console.log("Search handleSearch chamado com consulta:", query);
    if (!query.trim()) {
      setError('Digite um termo para buscar.');
      return;
    }
    
    setLoading(true);
    setLoadingBooks(true);
    setLoadingMovies(true);
    setError('');
    setHasSearched(true);
    setBookResults([]);
    setMovieResults([]);

    // Buscar livros e filmes em paralelo
    // Cada busca atualiza os resultados assim que termina, sem esperar a outra
    const promessaLivros = externalApiService.getBooksFromBackend(query)
      .then((respostaLivros) => {
        console.log("Search handleSearch respostaLivros:", respostaLivros);
        if (respostaLivros.success) {
          setBookResults(respostaLivros.data || []);
          console.log("Search handleSearch bookResults definido:", respostaLivros.data);
        } else {
          console.error("Search handleSearch getBooksFromBackend erro:", respostaLivros.error);
          setBookResults([]);
        }
        setLoadingBooks(false);
        return respostaLivros;
      })
      .catch((erro) => {
        console.error("Search handleSearch erro em livros:", erro);
        setBookResults([]);
        setLoadingBooks(false);
        return { success: false, error: erro.message };
      });

    const promessaFilmes = externalApiService.getMoviesFromBackend(query)
      .then((respostaFilmes) => {
        console.log("Search handleSearch respostaFilmes:", respostaFilmes);
        if (respostaFilmes.success) {
          setMovieResults(respostaFilmes.data || []);
        } else {
          console.error("Search handleSearch getMoviesFromBackend erro:", respostaFilmes.error);
          setMovieResults([]);
        }
        setLoadingMovies(false);
        return respostaFilmes;
      })
      .catch((erro) => {
        console.error("Search handleSearch erro em filmes:", erro);
        setMovieResults([]);
        setLoadingMovies(false);
        return { success: false, error: erro.message };
      });

    // Aguardar ambas as buscas terminarem para verificar erros finais
    Promise.all([promessaLivros, promessaFilmes])
      .then(([respostaLivros, respostaFilmes]) => {
        // Verificar se houve erros apenas se ambas falharam
        if (!respostaLivros.success && !respostaFilmes.success) {
          setError('Erro ao buscar livros e filmes. Tente novamente.');
        } else if (!respostaLivros.success && respostaFilmes.success) {
          // Se apenas livros falharam, não mostrar erro (filmes funcionaram)
          console.warn('Busca de livros falhou, mas filmes foram encontrados.');
        } else if (respostaLivros.success && !respostaFilmes.success) {
          // Se apenas filmes falharam, não mostrar erro (livros funcionaram)
          console.warn('Busca de filmes falhou, mas livros foram encontrados.');
        }
        setLoading(false);
        console.log("Search handleSearch loading definido como false");
      })
      .catch((erro) => {
        setError('Erro ao realizar a busca.');
        console.error("Search handleSearch erro geral:", erro);
        setLoading(false);
        setLoadingBooks(false);
        setLoadingMovies(false);
      });
  };
 
  // Determinar qual resultado mostrar baseado no filtro
  const resultadosAtuais = searchType === 'books' ? bookResults : movieResults;
  const carregandoAtual = searchType === 'books' ? loadingBooks : loadingMovies;
  const tipoAtual = searchType === 'books' ? 'book' : 'movie';

  return (
    <div className="search-container">
      <div className="search-form">
        <input
          type="text"
          placeholder="Buscar livros e filmes..."
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <button className="search-button" onClick={handleSearch} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {hasSearched && (
        <>
          <div className="search-header">
            <h2>Resultados da Busca</h2>
            <div className="search-type-toggle">
              <button
                className={searchType === 'books' ? 'active' : ''}
                onClick={() => setSearchType('books')}
                disabled={loading}
              >
                Livros ({bookResults.length})
                {loadingBooks && <span className="loading-indicator">...</span>}
              </button>
              <button
                className={searchType === 'movies' ? 'active' : ''}
                onClick={() => setSearchType('movies')}
                disabled={loading}
              >
                Filmes ({movieResults.length})
                {loadingMovies && <span className="loading-indicator">...</span>}
              </button>
            </div>
          </div>
          
          {carregandoAtual ? (
            <div className="loading-message">Carregando {searchType === 'books' ? 'livros' : 'filmes'}...</div>
          ) : (
            <SearchResults
              results={resultadosAtuais}
              type={tipoAtual}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Search;
