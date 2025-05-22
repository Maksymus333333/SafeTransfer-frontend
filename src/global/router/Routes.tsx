import { Routes, Route } from 'react-router-dom';
import { LandingPage } from '../../pages/LandingPage';
import MetaMaskLogin from '../../modules/Login';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<MetaMaskLogin />} />
    </Routes>
  );
};
