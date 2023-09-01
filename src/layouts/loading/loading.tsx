interface LoadingProps {
  className: string;
}
function Loading({ className }: LoadingProps) {
  return (
    <section className={className}>
      <div>Loading...</div>
    </section>
  );
}

export default Loading;
