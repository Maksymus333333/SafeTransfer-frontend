import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { getMe, User } from '../global/api/authApi';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  logout: () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const logout = () => {
    Cookies.remove('access_token');
    setUser(null);
    navigate('/');
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get('access_token');
      if (token) {
        try {
          const user: User = await getMe(token);
          setUser(user);
        } catch {
          Cookies.remove('access_token');
          navigate('/login');
        }
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, logout, setUser }}>{children}</AuthContext.Provider>
  );
};
