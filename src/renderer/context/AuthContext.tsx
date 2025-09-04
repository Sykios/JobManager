import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string) => Promise<{
    user: User | null;
    session: Session | null;
    error: any;
    needsEmailConfirmation?: boolean;
  }>;
  signIn: (email: string, password: string) => Promise<{
    user: User | null;
    session: Session | null;
    error: any;
  }>;
  signOut: () => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{
    user: User | null;
    error: any;
  }>;
  // Add development bypass function
  setDevBypass: (user: User, session: Session) => void;
  // Add refresh auth state function
  refreshAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check for development bypass first
      if (process.env.NODE_ENV === 'development') {
        const devBypass = localStorage.getItem('jobmanager_dev_bypass');
        if (devBypass === 'true') {
          console.log('🛠️ Development bypass enabled - creating mock auth state');
          
          // Create a mock user and session for development
          const mockUser: User = {
            id: 'dev-user-' + Date.now(),
            email: 'dev@jobmanager.local',
            email_confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
          
          const mockSession: Session = {
            access_token: 'dev-access-token-' + Date.now(),
            refresh_token: 'dev-refresh-token-' + Date.now(),
            expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            user: mockUser,
          };
          
          setUser(mockUser);
          setSession(mockSession);
          setIsLoading(false);
          return;
        }
      }
      
      // Normal authentication flow
      const currentSession = await window.electronAPI.authGetSession();
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const result = await window.electronAPI.authSignUp(email, password);
      
      if (result.session && result.user) {
        setSession(result.session);
        setUser(result.user);
      }
      
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      return { 
        user: null, 
        session: null, 
        error: { message: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await window.electronAPI.authSignIn(email, password);
      
      if (result.session && result.user) {
        setSession(result.session);
        setUser(result.user);
      }
      
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        user: null, 
        session: null, 
        error: { message: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  };

  const signOut = async () => {
    try {
      // Clear development bypass if it exists
      if (process.env.NODE_ENV === 'development') {
        localStorage.removeItem('jobmanager_dev_bypass');
      }
      
      const result = await window.electronAPI.authSignOut();
      
      // Clear local state regardless of API result
      setSession(null);
      setUser(null);
      
      return result;
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear local state even on error
      setSession(null);
      setUser(null);
      
      // Clear development bypass even on error
      if (process.env.NODE_ENV === 'development') {
        localStorage.removeItem('jobmanager_dev_bypass');
      }
      
      return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      return await window.electronAPI.authMagicLink(email);
    } catch (error) {
      console.error('Magic link error:', error);
      return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      return await window.electronAPI.authResetPassword(email);
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      return await window.electronAPI.authUpdatePassword(password);
    } catch (error) {
      console.error('Update password error:', error);
      return { 
        user: null, 
        error: { message: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  };

  // Development bypass function
  const setDevBypass = (mockUser: User, mockSession: Session) => {
    console.log('🛠️ Setting development bypass with mock user:', mockUser.email);
    setUser(mockUser);
    setSession(mockSession);
    localStorage.setItem('jobmanager_dev_bypass', 'true');
    localStorage.setItem('jobmanager_keep_logged_in', 'true');
  };

  // Refresh auth state from main process
  const refreshAuthState = async () => {
    try {
      const currentSession = await window.electronAPI.authGetSession();
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
      } else {
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing auth state:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    signInWithMagicLink,
    resetPassword,
    updatePassword,
    setDevBypass,
    refreshAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
