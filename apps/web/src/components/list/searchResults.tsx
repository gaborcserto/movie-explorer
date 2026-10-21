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
            {(['all', 'movies', 'tv', 'people'] as const).map((target) => {
              const next = new URLSearchParams(params);
              if (target === 'movies') next.delete('view');
              else next.set('view', target);
              const active = view === target;
              return (
                <Link
                  key={target}
                  to={{ pathname: location.pathname, search: next.toString() }}
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
          {(view === 'movies' || (view === 'tv' && query)) && <Filter />}
        </div>
      </div>
      {view !== 'movies' && (
        <p className="list__container container">
          {view === 'tv'
            ? 'Series text search uses relevance and first-air year only. Genre, rating and custom sorting are unavailable.'
            : 'Text search uses relevance. Year, genre, rating and custom sorting are unavailable in this view.'}{' '}
          Movie genre and rating selections are retained for Movies; they do not
          affect this view.
          {view === 'tv' &&
            params.get('year') &&
            ` First-air year: ${params.get('year')}.`}
        </p>
      )}
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
      {(['all', 'tv'] as const).map((type) => (
        <div key={type} hidden={view !== type}>
          {view === type && (
            <UnifiedList
              key={`${type}:${type === 'tv' ? params.get('year') : ''}`}
              query={query}
              type={type}
              year={
                type === 'tv' ? (params.get('year') ?? undefined) : undefined
              }
            />
          )}
        </div>
      ))}
    </>
  );
}

export default function SearchResults() {
  const { searchQuery = '' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const normalized = normalizeSearchFilters(params, Boolean(searchQuery));
  // Canonicalize before mounting request owners to avoid an intermediate fetch.
  if (normalized.toString() !== params.toString())
    return (
      <Navigate
        replace
        to={{ pathname: location.pathname, search: normalized.toString() }}
      />
    );
  return <ResultViews key={searchQuery} query={searchQuery} />;
}
