import { useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SearchHistory } from './useSearchHistory';
import type { MovieSnapshot, PeopleSnapshot } from './useSearchHistory';

export default function SearchHistoryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [history] = useState(() => ({
    movies: new Map<string, MovieSnapshot>(),
    people: new Map<string, PeopleSnapshot>(),
    scroll: new Map<string, number>(),
  }));
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);
  return (
    <SearchHistory.Provider value={history}>{children}</SearchHistory.Provider>
  );
}
