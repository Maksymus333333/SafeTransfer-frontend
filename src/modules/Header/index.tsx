import { JSX } from 'react/jsx-runtime';
import './styles/styles.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Header = (): JSX.Element => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const handleLoginClick = () => navigate('/login');
  const handleLogoutClick = () => logout();

  return (
    <header className="header-wrapper">
      <p className="header-logo-title">Safe-Transfer</p>
      {isAuthenticated ? (
        <div className="header-auth">
          <button className="header-login-button" onClick={handleLogoutClick}>
            Logout
          </button>
        </div>
      ) : (
        <button className="header-login-button" onClick={handleLoginClick}>
          Login
        </button>
      )}
    </header>
  );
};
