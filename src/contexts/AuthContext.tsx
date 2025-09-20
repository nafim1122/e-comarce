import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: { email: string } | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin credentials - in production, this would be handled by a secure backend
const ADMIN_CREDENTIALS = {
  email: 'admin@teatime.com',
  password: 'admin123'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    loading: true
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const session = localStorage.getItem('admin_session');
        if (session) {
          const sessionData = JSON.parse(session);
          const now = Date.now();
          
          // Check if session is still valid (24 hours)
          if (sessionData.expires > now) {
            setAuthState({
              isAuthenticated: true,
              isAdmin: true,
              user: { email: sessionData.email },
              loading: false
            });
            return;
          } else {
            // Session expired, clean up
            localStorage.removeItem('admin_session');
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
        localStorage.removeItem('admin_session');
      }
      
      setAuthState(prev => ({ ...prev, loading: false }));
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Validate credentials
      if (email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() && 
          password === ADMIN_CREDENTIALS.password) {
        
        // Create session
        const sessionData = {
          email: email.toLowerCase(),
          expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
          timestamp: Date.now()
        };
        
        localStorage.setItem('admin_session', JSON.stringify(sessionData));
        
        setAuthState({
          isAuthenticated: true,
          isAdmin: true,
          user: { email: email.toLowerCase() },
          loading: false
        });
        
        return true;
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_session');
    setAuthState({
      isAuthenticated: false,
      isAdmin: false,
      user: null,
      loading: false
    });
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};