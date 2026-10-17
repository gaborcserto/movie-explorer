import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from 'react';

import { useLocation } from 'react-router-dom';
import type {
  MovieListResponse,
  MovieSummary,
  PersonListResponse,
  PersonSummary,
} from '@movie-explorer/contracts';

export type MovieSnapshot = {
  data: MovieListResponse;
  items: MovieSummary[];
  visible: number;
};
export type PeopleSnapshot = {
  data: PersonListResponse;
  items: PersonSummary[];
  visible: number;
};

export const SearchHistory = createContext<{
  movies: Map<string, MovieSnapshot>;
  people: Map<string, PeopleSnapshot>;
  scroll: Map<string, number>;
} | null>(null);

// Keep history local to this app instance and bound memory during long sessions.
function remember<T>(cache: Map<string, T>, key: string, value: T) {
  cache.set(key, value);
  if (cache.size > 30) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export const useSearchHistory = () => useContext(SearchHistory);

export const movieHistorySignature = (
  query: string | undefined,
  params: URLSearchParams
) =>
  JSON.stringify([
    query,
    ...['filter', 'year', 'rating', 'sorting', 'order'].map((key) =>
      params.get(key)
    ),
  ]);

export function useResultHistory<T>(
  cache: Map<string, T> | undefined,
  signature: string
) {
  const location = useLocation();
  const key = `${location.key}:${signature}`;
  const [restored] = useState(() => cache?.get(key));
  const save = useCallback(
    (snapshot: T | undefined) => {
      if (cache && snapshot) remember(cache, key, snapshot);
    },
    [cache, key]
  );
  return { restored, save };
}

export function useSearchScroll() {
  const history = useSearchHistory();
  const location = useLocation();
  useLayoutEffect(() => {
    const saved = history?.scroll.get(location.key);
    if (saved !== undefined)
      window.scrollTo({ top: saved, behavior: 'instant' });
    const save = () => {
      if (history) remember(history.scroll, location.key, window.scrollY);
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      save();
      window.removeEventListener('scroll', save);
    };
  }, [history, location.key]);
}
