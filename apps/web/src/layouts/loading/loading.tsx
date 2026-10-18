import { useEffect } from 'react';

interface LoadingProps {
  className: string;
  title?: string;
}
function Loading({ className, title }: LoadingProps) {
  useEffect(() => {
    if (!title) return undefined;

    const previousTitle = document.title;
    document.title = `${title} | Movie Explorer`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className={className} role="status" aria-live="polite">
      <div>Loading...</div>
    </div>
  );
}

export default Loading;
