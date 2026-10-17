import React, { ReactNode } from 'react';
import './errorBoundary.scss';
import ErrorPresentation from '../errorPresentation/errorPresentation';
import useDetailPage from '../details/useDetailPage';

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

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
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
