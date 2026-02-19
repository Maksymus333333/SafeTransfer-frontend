import React from 'react';
import './styles/styles.css';
import { useNavigate } from 'react-router-dom';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const handleLoginClick = () => navigate('/login');
  return (
    <section className="hero-hero">
      <div className="hero-inner">
        <div className="hero-columns">
          <div className="hero-top hero-left">
            <h1 className="hero-title">
              Welcome to <br />
              SafeTransfer
            </h1>
            <p className="hero-sub">
              Securely store and share files with end‑to‑end encryption — connect your MetaMask wallet to begin.
            </p>
            <div className="hero-cta">
              <button className="cta-button" onClick={handleLoginClick}>
                Get started
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
