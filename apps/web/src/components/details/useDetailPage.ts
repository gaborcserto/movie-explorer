import { useEffect, useRef } from 'react';

export default function useDetailPage(title: string) {
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    const previousTitle = document.title;
    return () => {
      document.title = previousTitle;
    };
  }, []);
  useEffect(() => {
    document.title = `${title} | Movie Explorer`;
  }, [title]);
  return mainRef;
}
