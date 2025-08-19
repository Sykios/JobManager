import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('ErrorBoundary: Error in onError callback:', callbackError);
      }
    }
  }

  componentDidMount() {
    // Add global error listeners to catch errors that might escape React
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    // Clean up global error listeners
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleGlobalError = (event: ErrorEvent) => {
    console.error('ErrorBoundary: Global error caught:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    // Don't prevent default behavior, just log
    return false;
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('ErrorBoundary: Unhandled promise rejection caught:', {
      reason: event.reason,
      promise: event.promise
    });
    
    // Log additional details if the reason is an Error object
    if (event.reason instanceof Error) {
      console.error('ErrorBoundary: Promise rejection error details:', {
        message: event.reason.message,
        stack: event.reason.stack,
        name: event.reason.name
      });
    }
    
    // Don't prevent default behavior, just log
    return false;
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI or the provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Ein Fehler ist aufgetreten</h2>
            <p>
              Es gab ein Problem beim Laden dieser Komponente. 
              Bitte versuchen Sie es erneut oder wenden Sie sich an den Support.
            </p>
            {this.state.error && (
              <details className="error-details">
                <summary>Fehlerdetails</summary>
                <pre>{this.state.error.message}</pre>
                {this.state.error.stack && (
                  <pre className="error-stack">{this.state.error.stack}</pre>
                )}
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
              }}
              className="retry-button"
            >
              Erneut versuchen
            </button>
          </div>

          <style>{`
            .error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 200px;
              padding: 20px;
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 8px;
              margin: 16px;
            }

            .error-content {
              text-align: center;
              max-width: 500px;
            }

            .error-content h2 {
              color: #dc2626;
              margin-bottom: 12px;
              font-size: 1.25rem;
              font-weight: 600;
            }

            .error-content p {
              color: #7f1d1d;
              margin-bottom: 16px;
              line-height: 1.5;
            }

            .error-details {
              margin: 16px 0;
              padding: 12px;
              background: #ffffff;
              border: 1px solid #f3f4f6;
              border-radius: 6px;
              text-align: left;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 500;
              color: #374151;
              margin-bottom: 8px;
            }

            .error-details pre {
              font-size: 0.875rem;
              color: #dc2626;
              margin: 8px 0 0 0;
              white-space: pre-wrap;
              word-wrap: break-word;
            }

            .error-stack {
              font-size: 0.75rem !important;
              color: #6b7280 !important;
              margin-top: 8px !important;
            }

            .retry-button {
              background: #dc2626;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 0.2s;
            }

            .retry-button:hover {
              background: #b91c1c;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
