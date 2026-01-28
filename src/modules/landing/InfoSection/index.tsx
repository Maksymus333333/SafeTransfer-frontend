import React from 'react';
import './styles/styles.css';
import { ReactComponent as ShieldIcon } from '../../../assets/icons/ShieldIcon.svg';
import { ReactComponent as ArrowIcon } from '../../../assets/icons/ArrowIcon.svg';
import { ReactComponent as FoxIcon } from '../../../assets/icons/FoxIcon.svg';

export const InfoSection: React.FC = () => {
  return (
    <section className="info-section">
      <div className="info-inner">
        <h2 className="info-title">Secure and Easy File Sharing</h2>
        <div className="info-features">
          <div className="feature-item">
            <ShieldIcon />
            <h3>Secure</h3>
            <p>Leverage the power and MetaMask to ensure only you and you authorize can access your files.</p>
          </div>
          <div className="feature-item">
            <ArrowIcon />
            <h3>Easy Sharing</h3>
            <p>Store share files seamlessy with end-end-as you encryption.</p>
          </div>
          <div className="feature-item">
            <FoxIcon />
            <h3>Decentralized</h3>
            <p>Your digital idenitly security managed throur MetaMask. itabtig se amless a experience.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
