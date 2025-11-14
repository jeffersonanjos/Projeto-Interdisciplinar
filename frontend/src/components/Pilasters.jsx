import React, { useEffect, useRef } from 'react';
import pilastra from '../assets/pilastra.png';
import './Pilasters.css';

const Pilasters = () => {
  const leftPilasterRef = useRef(null);
  const rightPilasterRef = useRef(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const parallaxSpeed = 0.2; // Velocidade do parallax (mais suave)

          if (leftPilasterRef.current) {
            leftPilasterRef.current.style.transform = `translateY(${scrollY * parallaxSpeed}px)`;
          }
          if (rightPilasterRef.current) {
            rightPilasterRef.current.style.transform = `translateY(${scrollY * parallaxSpeed}px) scaleX(-1)`;
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <div 
        className="pilaster pilaster-left" 
        ref={leftPilasterRef}
        style={{ backgroundImage: `url(${pilastra})` }}
      />
      <div 
        className="pilaster pilaster-right" 
        ref={rightPilasterRef}
        style={{ backgroundImage: `url(${pilastra})` }}
      />
    </>
  );
};

export default Pilasters;

