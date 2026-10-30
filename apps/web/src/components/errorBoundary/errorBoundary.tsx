import React, { ReactNode } from 'react';

import './errorBoundary.scss';
import ErrorPresentation from '../errorPresentation';
import useDetailPage from '../../hooks/useDetailPage';

function FatalErrorFallback() {
  const mainRef = useDetailPage('Something went wrong');

  return (
    <main
      className="fatal-error"
      ref={mainRef}
      tabIndex={-1}
      aria-label="Something went wrong"
    >
      <ErrorPresentation
        variant="page"
        headingLevel={1}
        heading="Something went wrong"
        description="An unexpected error interrupted this scene."
        primaryAction={
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        }
        secondaryAction={
          <a className="btn btn--outline" href="/search">
            Back to Search
          </a>
        }
      />
    </main>
  );
}

export interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      return <FatalErrorFallback />;
    }

    return children;
  }
}

export default ErrorBoundary;
