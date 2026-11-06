import { useTranslation } from 'react-i18next';
import React, { ReactNode } from 'react';

import { i18n } from '../../i18n';

import './errorBoundary.scss';
import ErrorPresentation from '../errorPresentation';
import useDetailPage from '../../hooks/useDetailPage';

function FatalErrorFallback() {
  useTranslation();

  const mainRef = useDetailPage(i18n.t('ui.something_went_wrong'));

  return (
    <main
      className="fatal-error"
      ref={mainRef}
      tabIndex={-1}
      aria-label={i18n.t('ui.something_went_wrong')}
    >
      <ErrorPresentation
        variant="page"
        headingLevel={1}
        heading={i18n.t('ui.something_went_wrong')}
        description={i18n.t('ui.an_unexpected_error_interrupted_this_scene')}
        primaryAction={
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => window.location.reload()}
          >
            {i18n.t('ui.reload_page')}
          </button>
        }
        secondaryAction={
          <a className="btn btn--outline" href="/search">
            {i18n.t('ui.back_to_search')}
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
