import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center w-16 h-16 bg-red-500/15 rounded-full mx-auto mb-4">
              <AlertCircle className="text-red-300" size={32} />
            </div>

            <h2 className="text-2xl font-bold text-ink text-center mb-2">
              Oops! Something went wrong
            </h2>

            <p className="text-ink/75 text-center mb-6">
              We're sorry, but something unexpected happened. Don't worry, your data is safe.
            </p>

            {this.state.error && (
              <div className="bg-surface rounded-lg p-4 mb-6">
                <p className="text-sm font-mono text-ink/75 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-sand text-white rounded-lg hover:bg-sand-lo transition-colors font-medium"
              >
                <RefreshCw size={20} />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-6 py-3 bg-surface-high text-ink/75 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Go to Home
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6">
                <summary className="text-sm text-muted cursor-pointer hover:text-ink">
                  View Error Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
