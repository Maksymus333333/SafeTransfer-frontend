import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getMe, User, getNonce, verifySiwe } from '../global/api/authApi';
import { useNavigate } from 'react-router-dom';
import { SiweMessage } from 'siwe';
import { getAddress } from 'ethers';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const login = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed!');
      return;
    }

    try {
      const { nonce } = await getNonce();
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
      if (!accounts || accounts.length === 0) throw new Error('No Ethereum accounts found.');
      const address = getAddress(accounts[0]);

      const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
      const chainId = parseInt(chainIdHex, 16);

      const siwe = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce,
      });
      const messageToSign = siwe.prepareMessage();

      const signature = (await window.ethereum.request({
        method: 'personal_sign',
        params: [messageToSign, address],
      })) as string;

      await verifySiwe(messageToSign, signature);
      const loggedInUser = await getMe();
      setUser(loggedInUser);
      navigate('/');
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('MetaMask login error:', error.message);
        alert(`Login failed: ${error.message}`);
      } else {
        console.error('MetaMask login error:', error);
        alert('Login failed. Please try again.');
      }
    }
  };

  const logout = () => {
    setUser(null);
    navigate('/');
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user: User = await getMe();
        setUser(user);
      } catch {/* empty */}
    };

    checkAuth();
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
