import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FaFilm, FaTv, FaUsers } from 'react-icons/fa6';
import type { SearchMediaType } from '@movie-explorer/contracts';

import { getSearchResults } from '../../util/apiUtils';
import presentApiError from '../../util/errorPresentation';
import { ResultsSkeleton } from '../skeleton';
import SearchResultCard from './searchResultCard';
import { useResultHistory, useSearchHistory } from './useSearchHistory';
import type { GroupedSnapshot } from './useSearchHistory';

const categories = [
  { type: 'movie', view: 'movies', label: 'Movies', Icon: FaFilm },
  { type: 'tv', view: 'tv', label: 'Series', Icon: FaTv },
  { type: 'person', view: 'people', label: 'Persons', Icon: FaUsers },
] as const;

export default function GroupedList({ query }: { query: string }) {
  const history = useSearchHistory();
  const { restored, save } = useResultHistory(history?.grouped, query);
  const [groups, setGroups] = useState<GroupedSnapshot>(restored ?? {});
  const [errors, setErrors] = useState<
    Partial<Record<SearchMediaType, unknown>>
  >({});
  const [pending, setPending] = useState<SearchMediaType[]>([]);
  const controllers = useRef(new Map<SearchMediaType, AbortController>());
  const [params] = useSearchParams();
  const location = useLocation();

  const load = useCallback(
    async (type: SearchMediaType) => {
      if (controllers.current.has(type)) {
        return;
      }
      const controller = new AbortController();
      controllers.current.set(type, controller);
      setPending((current) => [...new Set([...current, type])]);
      try {
        const response = await getSearchResults(
          query,
          type,
          1,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setGroups((current) => ({ ...current, [type]: response }));
          setErrors((current) => ({ ...current, [type]: undefined }));
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setErrors((current) => ({ ...current, [type]: error }));
        }
      } finally {
        if (!controller.signal.aborted) {
          controllers.current.delete(type);
          setPending((current) => current.filter((item) => item !== type));
        }
      }
    },
    [query]
  );

  useEffect(() => {
    categories.forEach(({ type }) => {
      if (!restored?.[type]) {
        load(type);
      }
    });
    const requests = controllers.current;

    return () => {
      requests.forEach((controller) => controller.abort());
      requests.clear();
    };
  }, [load, restored]);

  useLayoutEffect(() => {
    save(groups);
  }, [groups, save]);

  const complete = categories.every(({ type }) => groups[type] || errors[type]);
  const empty =
    complete &&
    categories.every(({ type }) => groups[type]?.results.length === 0);

  return (
    <section
      className="list__container container grouped-results"
      aria-label="All results"
      aria-busy={pending.length > 0}
    >
      {empty && <p role="status">{`No results found for "${query}".`}</p>}
      {categories.map(({ type, view, label, Icon }) => {
        const response = groups[type];
        const error = errors[type];

        if (!response && !error) {
          return (
            <section key={type} aria-label={label}>
              <h2>{label}</h2>
              <ResultsSkeleton
                className="grouped-results__pending"
                label={`Loading ${label.toLowerCase()}`}
              />
            </section>
          );
        }

        if (!error && !response?.results.length) {
          return null;
        }
        const next = new URLSearchParams(params);

        if (view === 'movies') {
          next.delete('view');
        } else {
          next.set('view', view);
        }

        return (
          <section key={type} aria-labelledby={`search-${type}-heading`}>
            <div className="grouped-results__heading">
              <h2 id={`search-${type}-heading`}>
                <Icon aria-hidden="true" />
                {label}
              </h2>
              {response && (
                <p aria-live="polite">
                  {response.results.length} available results
                </p>
              )}
              <Link
                className="text-link"
                to={{ pathname: location.pathname, search: next.toString() }}
                aria-label={`View all ${label.toLowerCase()}`}
              >
                View all
              </Link>
            </div>
            {error ? (
              <div role="alert">
                <p>{presentApiError(error)?.description}</p>
                <button
                  type="button"
                  className="btn btn--outline btn--action"
                  disabled={pending.includes(type)}
                  onClick={() => load(type)}
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="list__items grouped-results__items">
                {response?.results.slice(0, 5).map((item) => (
                  <SearchResultCard
                    key={`${item.mediaType}:${item.id}`}
                    item={item}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}
