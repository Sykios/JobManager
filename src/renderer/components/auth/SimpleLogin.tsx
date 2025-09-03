import React, { useState, useEffect } from 'react';

interface SimpleLoginProps {
  onSuccess?: () => void;
}

export const SimpleLogin: React.FC<SimpleLoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load keep logged in preference
  useEffect(() => {
    const savedPref = localStorage.getItem('jobmanager_keep_logged_in');
    setKeepLoggedIn(savedPref === 'true');
  }, []);

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
      } else {
        // Save keep logged in preference
        localStorage.setItem('jobmanager_keep_logged_in', keepLoggedIn.toString());
        await window.electronAPI.authSetKeepLoggedIn(keepLoggedIn);
        
        setSuccess('✨ Check your email for the login link!');
        // Note: onSuccess() will be called when magic link is clicked
      }
    } catch (error) {
      setError('Something went wrong. Please try again.');
      console.error('Auth error:', error);
    } finally {
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
                Sending...
              </>
            ) : (
              'Send Login Link'
            )}
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              🔒 Secure passwordless authentication<br/>
              ✨ Works for both new and existing accounts
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
