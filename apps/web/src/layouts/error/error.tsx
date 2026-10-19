import { useLayoutEffect, useRef } from 'react';

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
          Loading...
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
          {pending ? 'Trying again...' : actionLabel}
        </button>
      )}
    </section>
  );
}

export default Error;
