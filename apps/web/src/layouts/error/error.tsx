import { useTranslation } from 'react-i18next';
import { useLayoutEffect, useRef } from 'react';

import { i18n } from '../../i18n';

interface ErrorProps {
  message: string;
  className: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  pending?: boolean;
}

function Error({
  message,
  className,
  title,
  actionLabel,
  onAction,
  pending = false,
}: ErrorProps) {
  useTranslation();

  const retryRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const button = retryRef.current;

    return () => {
      if (button && document.activeElement === button) {
        button.closest('main')?.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <section className={className}>
      <div role="alert">
        {title && <h2>{title}</h2>}
        <p>{message}</p>
      </div>
      {pending && (
        <span role="status" className="visually-hidden">
          {i18n.t('ui.loading')}
        </span>
      )}
      {actionLabel && onAction && (
        <button
          ref={retryRef}
          type="button"
          className="btn btn--primary"
          aria-label={actionLabel}
          aria-disabled={pending}
          onClick={() => {
            if (!pending) {
              onAction();
            }
          }}
        >
          {pending ? i18n.t('ui.trying_again') : actionLabel}
        </button>
      )}
    </section>
  );
}

export default Error;
