interface ErrorProps {
  message: string;
  className: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function Error({
  message,
  className,
  title,
  actionLabel,
  onAction,
}: ErrorProps) {
  return (
    <section className={className} role="alert">
      {title && <h2>{title}</h2>}
      <p>{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn--primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </section>
  );
}

export default Error;
