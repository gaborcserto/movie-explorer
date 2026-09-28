interface LoadingProps {
  className: string;
}
function Loading({ className }: LoadingProps) {
  return (
    <div className={className} role="status" aria-live="polite">
      <div>Loading...</div>
    </div>
  );
}

export default Loading;
