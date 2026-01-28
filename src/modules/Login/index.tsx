import { JSX } from 'react';
import './styles/styles.css';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const MetaMaskLogin = (): JSX.Element => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    await login();
    navigate('/');
  };

  return (
    <div className="metamask-wrapper">
      <div className="metamask-card">
        <h2 className="metamask-title">Login through MetaMask</h2>
        <p className="metamask-subtitle">Click the button below to log in with your Ethereum wallet.</p>
        <button className="metamask-button" onClick={handleLogin}>
          {'Log in'}
        </button>
      </div>
    </div>
  );
};

export default MetaMaskLogin;
