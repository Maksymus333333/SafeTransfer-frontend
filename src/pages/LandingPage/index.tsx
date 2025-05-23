import { JSX } from 'react/jsx-runtime';
import { useEffect } from 'react';
import './styles/styles.css';
import { Header } from '../../modules/Header'; // Zakładam, że folder to "Header" (wielka litera)
import { HeroSection } from '../../modules/landing/HeroSection';
import { PrivacySection } from '../../modules/landing/PrivacySection';

export const LandingPage = (): JSX.Element => {
  
  useEffect(() => {
    document.body.classList.add('landing-body-v2');
    return () => {
      document.body.classList.remove('landing-body-v2');
    };
  }, []);

  return (
    <div className="landing-page-container-v2">
      <Header /> {/* Dostosuj, jeśli twój Header oczekuje onSignUpClick */}
      <HeroSection/>
      <PrivacySection />
    </div>
  );
};
