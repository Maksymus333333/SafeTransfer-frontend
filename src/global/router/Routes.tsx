import { Routes, Route } from 'react-router-dom';
import { LandingPage } from '../../pages/LandingPage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
    </Routes>
  );
};
