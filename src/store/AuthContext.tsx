import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, tokenStore, type AuthUser } from '../services/api';

type AuthContextValue = {
  user:      AuthUser | null;
  isLoading: boolean;
  isReadonly: boolean;   // true when role === 'readonly'
  isAdmin:   boolean;    // true when role === 'admin' (and not demo)
  login:     (email: string, password: string) => Promise<void>;
  logout:    () => void;
  register:  (name: string, email: string, password: string) => Promise<{ message: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount – restore session from stored JWT
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }
    api.auth.me()
      .then(setUser)
      .catch(() => tokenStore.clear()) // token invalid → clear it
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await api.auth.login(email, password);
    tokenStore.set(token);
    setUser(u);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  // Auto-logout on inactivity
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const register = async (name: string, email: string, password: string) => {
    const res = await api.auth.register(name, email, password);
    return res;
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading,
      isReadonly: user?.role === 'readonly',
      isAdmin:    user?.role === 'admin',
      login, logout, register,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
