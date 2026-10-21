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
  SearchResponse,
  SearchResult,
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

export type UnifiedSnapshot = {
  data: SearchResponse;
  items: SearchResult[];
  visible: number;
};

export const SearchHistory = createContext<{
  movies: Map<string, MovieSnapshot>;
  people: Map<string, PeopleSnapshot>;
  unified?: Map<string, UnifiedSnapshot>;
  scroll: Map<string, number>;
  detailOrigins: Map<string, string>;
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
    if (saved === undefined) save();
    window.addEventListener('scroll', save, { passive: true });
    // Capture departure before routing changes the document's height, including
    // a position change whose scroll event has not been delivered yet.
    document.addEventListener('click', save, true);
    document.addEventListener('submit', save, true);
    window.addEventListener('popstate', save, true);
    return () => {
      // The destination layout may already have clamped scrollY during unmount.
      // Preserve the last scroll event recorded while this Search entry was active.
      window.removeEventListener('scroll', save);
      document.removeEventListener('click', save, true);
      document.removeEventListener('submit', save, true);
      window.removeEventListener('popstate', save, true);
    };
  }, [history, location.key]);
}
