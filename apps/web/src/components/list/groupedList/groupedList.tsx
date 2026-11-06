import { useTranslation } from 'react-i18next';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { FaFilm, FaTv, FaUsers } from 'react-icons/fa6';
import type { SearchMediaType } from '@movie-explorer/contracts';

import usePreferencesStore from '../../../features/preferences/preferencesStore';
import { i18n } from '../../../i18n';
import { getSearchResults } from '../../../util/apiUtils';
import presentApiError from '../../../util/errorPresentation';
import { ResultsSkeleton } from '../../skeleton';
import SearchResultCard from '../searchResultCard';
import { useResultHistory, useSearchHistory } from '../useSearchHistory';
import type { GroupedSnapshot } from '../useSearchHistory';

const categories = [
  {
    type: 'movie',
    view: 'movies',
    get label() {
      return i18n.t('ui.movies');
    },
    Icon: FaFilm,
  },
  {
    type: 'tv',
    view: 'tv',
    get label() {
      return i18n.t('ui.series');
    },
    Icon: FaTv,
  },
  {
    type: 'person',
    view: 'people',
    get label() {
      return i18n.t('ui.persons');
    },
    Icon: FaUsers,
  },
] as const;

export default function GroupedList({ query }: { query: string }) {
  useTranslation();
  const guestPreferences = usePreferencesStore((state) => state.preferences);
  const [requestPreferences, setRequestPreferences] =
    useState(guestPreferences);

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

  if (requestPreferences !== guestPreferences) {
    setRequestPreferences(guestPreferences);
    setGroups(restored ?? {});
    setErrors({});
    setPending([]);
  }

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
  }, [load, restored, guestPreferences]);

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
      aria-label={i18n.t('ui.all_results')}
      aria-busy={pending.length > 0}
    >
      {empty && <p role="status">{i18n.t('messages.noResults', { query })}</p>}
      {categories.map(({ type, view, label, Icon }) => {
        const response = groups[type];
        const error = errors[type];

        if (!response && !error) {
          return (
            <section key={type} aria-label={label}>
              <h2>{label}</h2>
              <ResultsSkeleton
                className="grouped-results__pending"
                label={i18n.t('messages.loadingLabel', {
                  label: label.toLowerCase(),
                })}
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
                  {response.results.length} {i18n.t('ui.available_results')}
                </p>
              )}
              <Link
                className="text-link"
                to={{ pathname: location.pathname, search: next.toString() }}
                aria-label={i18n.t('messages.viewAll', {
                  label: label.toLowerCase(),
                })}
              >
                {i18n.t('ui.view_all')}
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
                  {i18n.t('ui.try_again')}
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
