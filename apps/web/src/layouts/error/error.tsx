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
  return (
    <section className={className} role="alert">
      {pending && (
        <span role="status" className="visually-hidden">
          Loading...
        </span>
      )}
      {title && <h2>{title}</h2>}
      <p>{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          className="btn btn--primary"
          aria-label={actionLabel}
          aria-disabled={pending}
          onClick={() => {
            if (!pending) onAction();
          }}
        >
          {pending ? 'Trying again...' : actionLabel}
        </button>
      )}
    </section>
  );
}

export default Error;
