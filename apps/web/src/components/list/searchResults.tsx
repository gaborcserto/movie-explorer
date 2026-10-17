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
import { normalizeFilters } from '../filter/filterState';
import CardList from './list';
import PeopleList from './peopleList';
import './searchResults.scss';
import {
  movieHistorySignature,
  useSearchHistory,
  useSearchScroll,
} from './useSearchHistory';

function ResultViews({ query }: { query: string }) {
  useSearchScroll();
  const [params] = useSearchParams();
  const location = useLocation();
  const people = params.get('view') === 'people';
  const history = useSearchHistory();
  const [visited, setVisited] = useState(() => ({
    movies:
      !people ||
      Boolean(
        history?.movies.has(
          `${location.key}:${movieHistorySignature(query || undefined, params)}`
        )
      ),
    people: people || Boolean(history?.people.has(`${location.key}:${query}`)),
  }));
  // Mount each view on first visit and retain its independent pagination state.
  if ((people && !visited.people) || (!people && !visited.movies)) {
    setVisited((current) => ({
      ...current,
      [people ? 'people' : 'movies']: true,
    }));
  }
  return (
    <>
      <div className="search-toolbar list__container container">
        <div className="search-toolbar__content">
          <nav className="search-views" aria-label="Search result views">
            {(['movies', 'people'] as const).map((view) => {
              const next = new URLSearchParams(params);
              if (view === 'movies') next.delete('view');
              else next.set('view', view);
              const active = people === (view === 'people');
              return (
                <Link
                  key={view}
                  to={{ pathname: location.pathname, search: next.toString() }}
                  aria-current={active ? 'page' : undefined}
                >
                  {view === 'movies' ? (
                    <FaClapperboard aria-hidden="true" />
                  ) : (
                    <FaUsers aria-hidden="true" />
                  )}
                  {view === 'movies' ? 'Movies' : 'People'}
                </Link>
              );
            })}
          </nav>
          {!people && visited.movies && <Filter />}
        </div>
      </div>
      <div hidden={people}>
        {visited.movies && (
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
    </>
  );
}

export default function SearchResults() {
  const { searchQuery = '' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const normalized = normalizeFilters(params, Boolean(searchQuery));
  const view = params.get('view');
  if (view === 'people') normalized.set('view', 'people');
  else normalized.delete('view');
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
