import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Roam ErrorBoundary] Caught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-light tracking-tight text-text mb-2">
            Something went wrong
          </h2>

          <p className="text-[13px] text-muted mb-6">
            An unexpected interface error occurred. Please try refreshing the page.
          </p>

          <Button
            variant="primary"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reload Page</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
