import { createClient, SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  created_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: AuthUser;
}

export class AuthService {
  private supabase: SupabaseClient;
  private currentSession: Session | null = null;
  private authChangeListeners: Array<(session: Session | null) => void> = [];
  private keepLoggedIn: boolean = false;

  constructor(config: AuthConfig) {
    // Note: Don't load persistent login setting here in main process
    // This will be handled by the renderer process via IPC
    
    // Create custom file-based storage for Electron main process
    const sessionFile = path.join(app.getPath('userData'), 'supabase-session.json');
    
    const fileStorage = {
      getItem: (key: string): string | null => {
        try {
          if (!fs.existsSync(sessionFile)) {
            return null;
          }
          const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
          return data[key] || null;
        } catch (error) {
          console.warn('Error reading session file:', error);
          return null;
        }
      },
      setItem: (key: string, value: string): void => {
        try {
          let data: Record<string, any> = {};
          if (fs.existsSync(sessionFile)) {
            try {
              data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
            } catch {
              // If file is corrupted, start fresh
              data = {};
            }
          }
          data[key] = value;
          
          // Ensure directory exists
          const dir = path.dirname(sessionFile);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
          console.log('Session saved to:', sessionFile);
        } catch (error) {
          console.error('Error writing session file:', error);
        }
      },
      removeItem: (key: string): void => {
        try {
          if (!fs.existsSync(sessionFile)) {
            return;
          }
          const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
          delete data[key];
          fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
          console.log('Session key removed:', key);
        } catch (error) {
          console.error('Error removing session key:', error);
        }
      },
    };
    
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: fileStorage, // Custom file-based storage for Electron
      }
    });

    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      this.currentSession = session;
      
      // Notify all listeners
      this.authChangeListeners.forEach(listener => {
        listener(session);
      });
    });
  }

  /**
   * Initialize auth service and restore session
   */
  async initialize(): Promise<Session | null> {
    try {
      console.log('🔐 Initializing AuthService...');
      
      // Always try to get the current session from Supabase
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }

      if (session) {
        console.log('✅ Found existing session for user:', session.user?.email);
        this.currentSession = session;
        return session;
      } else {
        console.log('❌ No existing session found');
        this.currentSession = null;
        return null;
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      return null;
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
    needsEmailConfirmation?: boolean;
  }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // No redirect needed for desktop app
          // We'll handle email confirmation manually or disable it
        }
      });

      if (data.session) {
        this.currentSession = data.session;
      }

      return {
        user: data.user,
        session: data.session,
        error,
        needsEmailConfirmation: !data.session && !!data.user && !data.user.email_confirmed_at
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error as AuthError,
        needsEmailConfirmation: false
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (data.session) {
        this.currentSession = data.session;
      }

      return {
        user: data.user,
        session: data.session,
        error
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error as AuthError
      };
    }
  }

  /**
   * Sign in with magic link
   */
  async signInWithMagicLink(email: string): Promise<{
    error: AuthError | null;
  }> {
    try {
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: 'jobmanager://auth/callback', // Custom deep link for Electron
        }
      });

      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      this.currentSession = null;
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  }

  /**
   * Update password
   */
  async updatePassword(password: string): Promise<{
    user: User | null;
    error: AuthError | null;
  }> {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        password
      });

      return {
        user: data.user,
        error
      };
    } catch (error) {
      return {
        user: null,
        error: error as AuthError
      };
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentSession?.user || null;
  }

  /**
   * Check if user is authenticated (checks Supabase directly)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) {
        console.warn('Error checking authentication:', error);
        return false;
      }
      // Update cached session
      this.currentSession = session;
      return !!session?.user;
    } catch (error) {
      console.error('Exception checking authentication:', error);
      return false;
    }
  }

  /**
   * Synchronous version that checks cached state only
   */
  isAuthenticatedSync(): boolean {
    return !!this.currentSession?.user;
  }

  /**
   * Get access token for API calls (always fresh from Supabase)
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) {
        console.warn('Error getting access token:', error);
        return null;
      }
      // Update cached session
      this.currentSession = session;
      const token = session?.access_token || null;
      console.log('Access token retrieved:', token ? `${token.substring(0, 20)}...` : 'null');
      return token;
    } catch (error) {
      console.error('Exception getting access token:', error);
      return null;
    }
  }

  /**
   * Synchronous version that returns cached token
   */
  getAccessTokenSync(): string | null {
    const token = this.currentSession?.access_token || null;
    console.log('Sync access token:', token ? `${token.substring(0, 20)}...` : 'null');
    return token;
  }

  /**
   * Listen for auth state changes
   */
  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    this.authChangeListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.authChangeListeners.indexOf(callback);
      if (index > -1) {
        this.authChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<{
    session: Session | null;
    error: AuthError | null;
  }> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (data.session) {
        this.currentSession = data.session;
      }

      return {
        session: data.session,
        error
      };
    } catch (error) {
      return {
        session: null,
        error: error as AuthError
      };
    }
  }

  /**
   * Get user profile data
   */
  async getUserProfile(): Promise<{
    data: any;
    error: AuthError | null;
  }> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return {
          data: null,
          error: { message: 'No authenticated user' } as AuthError
        };
      }

      return {
        data: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        },
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error as AuthError
      };
    }
  }

  // Persistent login management
  setKeepLoggedIn(keepLoggedIn: boolean): void {
    this.keepLoggedIn = keepLoggedIn;
    console.log('Keep logged in preference set to:', keepLoggedIn);
    
    // Note: The actual session persistence is handled by Supabase client
    // We just track the user preference here for the renderer process
  }

  getKeepLoggedIn(): boolean {
    return this.keepLoggedIn;
  }

  // These methods are no longer needed in main process, but kept for compatibility
  private loadPersistentLoginSetting(): void {
    // This method is not used in main process
    // Renderer process manages its own localStorage
  }

  private saveSessionToStorage(session: Session): void {
    // Session persistence is handled by Supabase client automatically
    // No need for manual localStorage management in main process
  }

  private clearSessionFromStorage(): void {
    // Session cleanup is handled by Supabase client automatically
    // No need for manual localStorage management in main process
  }

  /**
   * Clear the current session (sign out without API call)
   */
  async clearSession(): Promise<void> {
    try {
      await this.supabase.auth.signOut({ scope: 'local' });
      this.currentSession = null;
      
      // Also manually clear the session file as backup
      this.clearSessionFile();
    } catch (error) {
      console.error('Error clearing session:', error);
      // Force clear session even if API call fails
      this.currentSession = null;
      this.clearSessionFile();
    }
  }

  /**
   * Manually clear the session file (backup method)
   */
  private clearSessionFile(): void {
    try {
      const sessionFile = path.join(app.getPath('userData'), 'supabase-session.json');
      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
        console.log('Session file cleared');
      }
    } catch (error) {
      console.error('Error clearing session file:', error);
    }
  }
}

// Singleton instance
let authService: AuthService | null = null;

export const createAuthService = (config: AuthConfig): AuthService => {
  if (!authService) {
    authService = new AuthService(config);
  }
  return authService;
};

export const getAuthService = (): AuthService | null => {
  return authService;
};
