interface ErrorProps {
  message: string;
  className: string;
}

function Error({ message, className }: ErrorProps) {
  return (
    <section className={className}>
      <div>{message}</div>
    </section>
  );
}

export default Error;
