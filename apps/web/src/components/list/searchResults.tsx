import { useState } from 'react';
import {
  Link,
  Navigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { FaClapperboard, FaUsers } from 'react-icons/fa6';
import Filter from '../filter';
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

const viewLabels = {
  all: 'All',
  movies: 'Movies',
  tv: 'Series',
  people: 'Persons',
};

function ResultViews({ query }: { query: string }) {
  useSearchScroll();
  const [params] = useSearchParams();
  const location = useLocation();
  const view = readSearchView(params);
  const people = view === 'people';
  const history = useSearchHistory();
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
          <nav className="search-views" aria-label="Search result views">
            {(['all', 'movies', 'tv', 'people'] as const)
              .filter((target) => query || target !== 'all')
              .map((target) => {
                const next = new URLSearchParams(params);
                if (target === 'movies') next.delete('view');
                else next.set('view', target);
                const active = view === target;
                return (
                  <Link
                    key={target}
                    to={{
                      pathname: location.pathname,
                      search: next.toString(),
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    {target !== 'people' ? (
                      <FaClapperboard aria-hidden="true" />
                    ) : (
                      <FaUsers aria-hidden="true" />
                    )}
                    {viewLabels[target]}
                  </Link>
                );
              })}
          </nav>
          {(view === 'movies' || view === 'tv') && <Filter />}
        </div>
      </div>
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

export default function SearchResults() {
  const { searchQuery: rawQuery = '' } = useParams();
  const searchQuery = rawQuery.trim();
  const [params] = useSearchParams();
  const location = useLocation();
  const normalized = normalizeSearchFilters(params, Boolean(searchQuery));
  // Canonicalize before mounting request owners to avoid an intermediate fetch.
  if (normalized.toString() !== params.toString() || rawQuery !== searchQuery)
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
  return <ResultViews key={searchQuery} query={searchQuery} />;
}
