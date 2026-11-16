import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  getToken: async () => null,
});

export const useAuth = () => useContext(AuthContext);

// Demo mode (`npm run demo`): runs the app without a Firebase project. scripts/demo.ts
// sets VITE_DEMO_UID and starts the server with NODE_ENV=test, the only mode in which
// the server accepts this token (see src/middleware/auth.ts). A normal `npm run dev`
// or production build never sets the variable, so Google sign-in stays the only way in.
export const DEMO_UID: string | undefined = import.meta.env.VITE_DEMO_UID || undefined;
const DEMO_USER = DEMO_UID
  ? ({
      uid: DEMO_UID,
      displayName: import.meta.env.VITE_DEMO_NAME || 'Demo User',
      email: `${DEMO_UID}@test.local`,
      photoURL: null,
    } as unknown as User)
  : null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEMO_USER) {
      fetch('/api/auth/sync', { method: 'POST', headers: { Authorization: `Bearer TEST_AUTH:${DEMO_UID}` } })
        .catch(() => console.error("Failed to sync user with backend"))
        .finally(() => {
          setUser(DEMO_USER);
          setLoading(false);
        });
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // If user logs in, sync with our backend
      if (currentUser) {
        const token = await currentUser.getIdToken();
        try {
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (e) {
          console.error("Failed to sync user with backend");
        }
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (DEMO_USER) return setUser(DEMO_USER);
    await signInWithPopup(auth, googleAuthProvider);
  };

  const logout = async () => {
    if (DEMO_USER) return setUser(null);
    await signOut(auth);
  };
  
  const getToken = async () => {
    if (DEMO_USER) return `TEST_AUTH:${DEMO_UID}`;
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};
