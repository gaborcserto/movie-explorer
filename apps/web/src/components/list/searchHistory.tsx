import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { SearchHistory } from './useSearchHistory';
import type {
  MovieSnapshot,
  PeopleSnapshot,
  UnifiedSnapshot,
  GroupedSnapshot,
} from './useSearchHistory';

export default function SearchHistoryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef(location);
  const [history] = useState(() => ({
    grouped: new Map<string, GroupedSnapshot>(),
    unified: new Map<string, UnifiedSnapshot>(),
    movies: new Map<string, MovieSnapshot>(),
    people: new Map<string, PeopleSnapshot>(),
    scroll: new Map<string, number>(),
    detailOrigins: new Map<string, string>(),
  }));
  useLayoutEffect(() => {
    const from = previous.current;

    if (
      navigationType === 'PUSH' &&
      /^\/search(?:\/|$)/.test(from.pathname) &&
      /^\/(movie|person|tv)\//.test(location.pathname)
    ) {
      history.detailOrigins.set(location.key, from.key);
      if (history.detailOrigins.size > 30) {
        const oldest = history.detailOrigins.keys().next().value;

        if (oldest !== undefined) history.detailOrigins.delete(oldest);
      }
    }
    previous.current = location;
  }, [history, location, navigationType]);
  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  return (
    <SearchHistory.Provider value={history}>{children}</SearchHistory.Provider>
  );
}
