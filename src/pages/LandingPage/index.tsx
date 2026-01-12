import { JSX } from 'react/jsx-runtime';
import { Header } from '../../modules/Header';
import { HeroSection } from '../../modules/landing/HeroSection';
import { useAuth } from '../../context/AuthContext';
import { FileManager } from '../../modules/FileManager';
import { InfoSection } from '../../modules/landing/InfoSection';

export const LandingPage = (): JSX.Element => {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <Header />
      {isAuthenticated ? (
        <FileManager />
      ) : (
        <>
          <HeroSection />
          <InfoSection />
        </>
      )}
    </>
  );
};
