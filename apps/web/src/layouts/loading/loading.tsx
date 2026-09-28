interface LoadingProps {
  className: string;
}
function Loading({ className }: LoadingProps) {
  return (
    <section className={className} role="status" aria-live="polite">
      <div>Loading...</div>
    </section>
  );
}

export default Loading;
