import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { backendLogin, backendMe } from './backend-auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const email = (u?.email || '').toLowerCase();
      // If VITE_ADMIN_EMAILS is configured, use that list. Otherwise, treat
      // the backend-seeded admin email (VITE_BACKEND_ADMIN_EMAIL or default)
      // as the admin for developer workflows so signing into Firebase with
      // that address will show the dashboard.
      const backendAdmin = (import.meta.env.VITE_BACKEND_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
      let computedIsAdmin = !!u && (adminEmails.length > 0 ? adminEmails.includes(email) : email === backendAdmin);
      // If no firebase admin, attempt backend cookie session
      if (!computedIsAdmin) {
        const me = await backendMe();
        if (me?.email) {
          const backendEmail = me.email.toLowerCase();
          if (!adminEmails.length || adminEmails.includes(backendEmail)) {
            computedIsAdmin = true;
          }
        } else {
          const auto = await backendLogin();
            if (auto?.email) {
              computedIsAdmin = !adminEmails.length || adminEmails.includes(auto.email.toLowerCase());
            }
        }
      }
      setIsAdmin(computedIsAdmin);
      if (import.meta.env.DEV) {
        console.log('[Auth] firebaseUser:', email || '(none)', 'backendAdmin?', computedIsAdmin);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
export default AuthProvider;
