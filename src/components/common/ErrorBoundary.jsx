import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[420px] w-full flex items-center justify-center p-6 bg-canvas text-ink antialiased">
          <div className="max-w-md w-full bg-white border border-border rounded-card p-6 sm:p-8 shadow-card text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-danger-50 border border-danger-100 flex items-center justify-center text-danger">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-sans">
                Something went wrong
              </h2>
              <p className="text-xs sm:text-sm text-muted">
                We couldn't load this page.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="academic"
                size="sm"
                onClick={this.handleReset}
                className="w-full sm:w-auto flex items-center justify-center gap-2 shadow-tactile-btn"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try again</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Back to Studora</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
