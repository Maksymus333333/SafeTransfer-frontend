import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
    // need to creat api logout
    setUser(null);
    navigate('/');
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user: User = await getMe(); //   HttpOnly cookie
        setUser(user);
      } catch {
        /* empty */
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, logout, setUser }}>{children}</AuthContext.Provider>
  );
};
