import React from 'react';
import './styles/styles.css';
import { useAuth } from '../../../context/AuthContext';

export const HeroSection: React.FC = () => {
  const { login } = useAuth();
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
              <button className="cta-button" onClick={login}>
                Get started
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
