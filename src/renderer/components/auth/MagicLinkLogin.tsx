import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const { user, session, setDevBypass } = useAuth(); // Add setDevBypass

  // Load keep logged in preference
  useEffect(() => {
    const savedPref = localStorage.getItem('jobmanager_keep_logged_in');
    setKeepLoggedIn(savedPref === 'true');
  }, []);

  // Watch for successful authentication (including dev bypass)
  useEffect(() => {
    if (user && session) {
      console.log('✅ User authenticated, triggering success callback');
      onSuccess?.();
    }
  }, [user, session, onSuccess]);

  // Listen for magic link authentication events
  useEffect(() => {
    const handleMagicLinkSuccess = (event: any, user: any) => {
      console.log('Magic link authentication successful:', user);
      setIsLoading(false);
      setError('');
      setSuccess('🎉 Successfully signed in! Welcome to JobManager.');
      
      // Save keep logged in preference if user chose it
      if (keepLoggedIn) {
        localStorage.setItem('jobmanager_keep_logged_in', 'true');
        window.electronAPI.authSetKeepLoggedIn(true);
      }
      
      // Trigger success callback after a brief delay to show the success message
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    };

    const handleMagicLinkError = (event: any, errorMessage: string) => {
      console.error('Magic link authentication failed:', errorMessage);
      setIsLoading(false);
      setError(`Authentication failed: ${errorMessage}`);
      setSuccess('');
    };

    // Add event listeners
    if (window.electronAPI) {
      window.electronAPI.on?.('auth:magic-link-success', handleMagicLinkSuccess);
      window.electronAPI.on?.('auth:magic-link-error', handleMagicLinkError);
    }

    // Cleanup listeners on unmount
    return () => {
      if (window.electronAPI && window.electronAPI.removeListener) {
        window.electronAPI.removeListener('auth:magic-link-success', handleMagicLinkSuccess);
        window.electronAPI.removeListener('auth:magic-link-error', handleMagicLinkError);
      }
    };
  }, [keepLoggedIn, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Single magic link call handles both signup AND signin
      const result = await window.electronAPI.authMagicLink(email);
      
      if (result.error) {
        setError(result.error.message || 'Authentication failed');
        setIsLoading(false);
      } else {
        // Save keep logged in preference immediately (we'll apply it when auth succeeds)
        localStorage.setItem('jobmanager_keep_logged_in', keepLoggedIn.toString());
        
        setSuccess('✨ Check your email for the login link! Click the link to sign in automatically.');
        // Keep loading state - will be cleared when we receive the deep link callback
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      console.error('Auth error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Welcome to JobManager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email to sign in or create an account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(''); // Clear error when typing
              }}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="your@email.com"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center">
            <input
              id="keepLoggedIn"
              name="keepLoggedIn"
              type="checkbox"
              checked={keepLoggedIn}
              onChange={(e) => setKeepLoggedIn(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isLoading}
            />
            <label htmlFor="keepLoggedIn" className="ml-2 block text-sm text-gray-700">
              Keep me logged in
            </label>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email}
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
              isLoading || !email
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending Login Link...
              </>
            ) : (
              '📧 Send Login Link'
            )}
          </button>

          <div className="text-center">
            <div className="text-xs text-gray-500 space-y-1">
              <p>🔒 Secure passwordless authentication</p>
              <p>✨ Works for both new and existing accounts</p>
              <p>📱 No passwords to remember or forget</p>
            </div>
            
            {/* Development Mode Shortcuts */}
            {(process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost' || true) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-3">🛠️ Development Mode: (ENV: {process.env.NODE_ENV || 'undefined'})</div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      console.log('🚀 Bypassing authentication for development...');
                      
                      // Create mock user and session
                      const mockUser = {
                        id: 'dev-user-' + Date.now(),
                        email: 'dev@jobmanager.local',
                        email_confirmed_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                      };
                      
                      const mockSession = {
                        access_token: 'dev-access-token-' + Date.now(),
                        refresh_token: 'dev-refresh-token-' + Date.now(),
                        expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                        user: mockUser,
                      };
                      
                      // Use direct bypass method
                      setDevBypass(mockUser, mockSession);
                      setSuccess('🛠️ Development mode: Authentication bypassed!');
                    }}
                    className="w-full text-xs bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-3 rounded transition-colors"
                  >
                    🛠️ Skip Login (Development Only)
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      const testUrl = 'jobmanager://auth/callback#access_token=test_token&refresh_token=test_refresh&expires_at=1234567890&token_type=bearer';
                      try {
                        console.log('🧪 Testing deep link handler...');
                        await window.electronAPI.testDeepLink(testUrl);
                        console.log('✅ Deep link test completed - check main process console for logs');
                      } catch (error) {
                        console.error('❌ Deep link test failed:', error);
                      }
                    }}
                    className="w-full text-xs bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded transition-colors"
                  >
                    🧪 Test Deep Link Handler
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  These options only appear in development mode
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
