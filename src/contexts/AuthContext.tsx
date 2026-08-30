import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

/*
 * useAuth owns state, so calling it from two components created two
 * independent copies — two auth subscriptions, each firing a full profile and
 * stats reload on every auth event, and two sources of truth for `user` that
 * could disagree. App and AuthPage both did exactly that.
 *
 * The hook is mounted once here instead, and everything reads the same value.
 */

type AuthValue = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const value = useAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return context;
};
