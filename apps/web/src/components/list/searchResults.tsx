import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import Filter from '../filter';
import PrimaryNavigation from '../navigation';
import { normalizeSearchFilters, readSearchView } from '../filter/filterState';
import CardList from './list';
import PeopleList from './peopleList';
import UnifiedList from './unifiedList';
import GroupedList from './groupedList';
import './searchResults.scss';
import {
  movieHistorySignature,
  useSearchHistory,
  useSearchScroll,
} from './useSearchHistory';

function ResultViews({
  query,
  children,
}: {
  query: string;
  children?: ReactNode;
}) {
  useSearchScroll();
  const [params] = useSearchParams();
  const location = useLocation();
  const view =
    location.pathname === '/' && !query && !params.has('view')
      ? 'discover'
      : readSearchView(params);
  const people = view === 'people';
  const history = useSearchHistory();
  const isHomepage = location.pathname === '/' && !query;
  const [visited, setVisited] = useState(() => ({
    movies:
      view === 'movies' ||
      Boolean(
        history?.movies.has(
          `${location.key}:${movieHistorySignature(query || undefined, params)}`
        )
      ),
    people: people || Boolean(history?.people.has(`${location.key}:${query}`)),
  }));

  // Mount each view on first visit and retain its independent pagination state.
  if ((people && !visited.people) || (view === 'movies' && !visited.movies)) {
    setVisited((current) => ({
      ...current,
      [view]: true,
    }));
  }

  return (
    <>
      <div className="search-toolbar list__container container">
        <div className="search-toolbar__content">
          <PrimaryNavigation
            mode={isHomepage ? 'home' : 'results'}
            activeView={view}
            query={query}
          />
        </div>
        {(view === 'movies' || view === 'tv') && (
          <div className="search-toolbar__filters">
            <Filter />
          </div>
        )}
      </div>
      {children}
      <div hidden={view !== 'movies'}>
        {visited.movies && (view === 'movies' || people) && (
          <CardList
            key={['filter', 'year', 'rating', 'sorting', 'order']
              .map((key) => params.get(key))
              .join(':')}
          />
        )}
      </div>
      <div hidden={!people}>
        {visited.people && <PeopleList query={query} />}
      </div>
      {view === 'all' && <GroupedList query={query} />}
      {view === 'tv' && (
        <UnifiedList
          key={['year', 'rating', 'sorting', 'order']
            .map((key) => params.get(key))
            .join(':')}
          query={query}
          type="tv"
          year={params.get('year') ?? undefined}
          rating={!query ? (params.get('rating') ?? undefined) : undefined}
          sorting={!query ? (params.get('sorting') ?? undefined) : undefined}
          order={!query ? (params.get('order') ?? undefined) : undefined}
        />
      )}
    </>
  );
}

export default function SearchResults({ children }: { children?: ReactNode }) {
  const { searchQuery: rawQuery = '' } = useParams();
  const searchQuery = rawQuery.trim();
  const [params] = useSearchParams();
  const location = useLocation();
  const normalized = normalizeSearchFilters(params, Boolean(searchQuery));

  if (
    location.pathname === '/' &&
    params.get('view') === 'movies' &&
    normalized.get('view') !== 'movies'
  ) {
    normalized.set('view', 'movies');
  }

  // Canonicalize before mounting request owners to avoid an intermediate fetch.
  if (normalized.toString() !== params.toString() || rawQuery !== searchQuery) {
    return (
      <Navigate
        replace
        to={{
          pathname:
            rawQuery === searchQuery
              ? location.pathname
              : `/search${searchQuery ? `/${encodeURIComponent(searchQuery)}` : ''}`,
          search: normalized.toString(),
        }}
      />
    );
  }

  return (
    <ResultViews key={searchQuery} query={searchQuery}>
      {children}
    </ResultViews>
  );
}
