import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Taskbar.css';

const Taskbar = ({ user, metrics, timeline, onProfileClick }) => {
  const [openModal, setOpenModal] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  const avgRating =
    metrics?.avgRating && !Number.isNaN(metrics.avgRating)
      ? Number(metrics.avgRating).toFixed(1)
      : '--';

  const favoriteGenres = metrics?.favoriteGenres?.length
    ? metrics.favoriteGenres
    : [{ label: '???', count: 0 }];

  const safeTimeline = Array.isArray(timeline) && timeline.length
    ? timeline.slice(0, 6)
    : [];

  const toggleModal = (type) => {
    setOpenModal((prev) => (prev === type ? null : type));
  };

  const closeModal = () => setOpenModal(null);
  const toggleVisibility = () => {
    setIsVisible((prev) => {
      if (prev) {
        // Ao ocultar, fecha os modais
        setOpenModal(null);
      }
      return !prev;
    });
  };

  return (
    <>
      <div className={`taskbar ${!isVisible ? 'taskbar--hidden' : ''}`} role="navigation" aria-label="Atalhos do painel">
        <div className="taskbar-icons">
          <button
            type="button"
            className={`taskbar-icon ${openModal === 'timeline' ? 'active' : ''}`}
            onClick={() => toggleModal('timeline')}
            aria-pressed={openModal === 'timeline'}
            aria-label="Abrir linha do tempo"
          >
            <span className="pixel-icon pixel-icon--clock" aria-hidden="true" />
            <span className="taskbar-label">Timeline</span>
          </button>

          <button
            type="button"
            className={`taskbar-icon ${openModal === 'metrics' ? 'active' : ''}`}
            onClick={() => toggleModal('metrics')}
            aria-pressed={openModal === 'metrics'}
            aria-label="Abrir métricas"
          >
            <span className="pixel-icon pixel-icon--star" aria-hidden="true" />
            <span className="taskbar-label">Métricas</span>
          </button>
        </div>

        <div className="taskbar-right">
          <button
            type="button"
            className="taskbar-profile"
            onClick={onProfileClick}
            title="Ir para o perfil"
          >
            <div className="taskbar-profile__avatar">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={`Avatar de ${user.username}`} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="taskbar-profile__info">
              <span className="taskbar-profile__name">{user?.username || 'Usuário'}</span>
              <span className="taskbar-profile__email">{user?.email || 'email não informado'}</span>
            </div>
          </button>

          {isVisible && (
            <button
              type="button"
              className="taskbar-toggle"
              onClick={toggleVisibility}
              aria-label="Ocultar taskbar"
              title="Ocultar taskbar"
            >
              <span className="pixel-icon pixel-icon--arrow" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {!isVisible && (
        <button
          type="button"
          className="taskbar-toggle taskbar-toggle--hidden"
          onClick={toggleVisibility}
          aria-label="Mostrar taskbar"
          title="Mostrar taskbar"
        >
          <span className="pixel-icon pixel-icon--arrow" aria-hidden="true" />
        </button>
      )}

      {openModal && isVisible && (
        <div className="taskbar-modal__backdrop" onClick={closeModal} role="presentation" />
      )}

      {openModal === 'timeline' && isVisible && (
        <div className="taskbar-modal taskbar-modal--timeline">
          <header className="taskbar-modal__header">
            <span>Hub da Comunidade</span>
            <button type="button" className="taskbar-modal__close" onClick={closeModal}>
              ✕
            </button>
          </header>
          <ul className="taskbar-timeline">
            {safeTimeline.length ? (
              safeTimeline.map((event) => (
                <li key={event.id} className="taskbar-timeline__event">
                  <div className="taskbar-timeline__avatar">
                    {event.avatar ? (
                      <img src={event.avatar} alt={`Avatar de ${event.nickname}`} />
                    ) : (
                      <span>{event.nickname?.slice(0, 2).toUpperCase() || '??'}</span>
                    )}
                  </div>
                  <div className="taskbar-timeline__details">
                    <strong>{event.nickname}</strong>
                    <p>
                      {event.action}
                      {event.highlight ? (
                        <span className="taskbar-timeline__highlight">
                          {` "${event.highlight}"`}
                        </span>
                      ) : null}
                      {event.rating ? ` · ${event.rating}★` : ''}
                    </p>
                    <span className="taskbar-timeline__time">{event.timestamp}</span>
                  </div>
                </li>
              ))
            ) : (
              <li className="taskbar-timeline__empty">Sem atividades recentes por aqui.</li>
            )}
          </ul>
        </div>
      )}

      {openModal === 'metrics' && isVisible && (
        <div className="taskbar-modal taskbar-modal--metrics">
          <header className="taskbar-modal__header">
            <span>Painel de Métricas</span>
            <button type="button" className="taskbar-modal__close" onClick={closeModal}>
              ✕
            </button>
          </header>

          <div className="taskbar-metrics">
            <div className="taskbar-metrics__card">
              <span className="taskbar-metrics__label">Média geral</span>
              <strong className="taskbar-metrics__value">{avgRating}</strong>
            </div>
            <div className="taskbar-metrics__card">
              <span className="taskbar-metrics__label">Total de avaliações</span>
              <strong className="taskbar-metrics__value">{metrics?.totalReviews ?? 0}</strong>
            </div>
          </div>

          <div className="taskbar-genres">
            <span className="taskbar-genres__title">Gêneros preferidos</span>
            <div className="taskbar-genres__chips">
              {favoriteGenres.map((genre) => (
                <span key={genre.label} className="taskbar-genres__chip">
                  {genre.label}
                  {genre.count ? ` · ${genre.count}` : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

Taskbar.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string,
    email: PropTypes.string,
    avatar_url: PropTypes.string,
  }),
  metrics: PropTypes.shape({
    avgRating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    totalReviews: PropTypes.number,
    favoriteGenres: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        count: PropTypes.number,
      })
    ),
  }),
  timeline: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      nickname: PropTypes.string,
      action: PropTypes.string,
      highlight: PropTypes.string,
      rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      avatar: PropTypes.string,
      timestamp: PropTypes.string,
    })
  ),
  onProfileClick: PropTypes.func,
};

Taskbar.defaultProps = {
  user: null,
  metrics: {
    avgRating: null,
    totalReviews: 0,
    favoriteGenres: [],
  },
  timeline: [],
  onProfileClick: () => {},
};

export default Taskbar;

