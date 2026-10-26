import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { CombinedFilmography } from '@movie-explorer/contracts';

import MovieImage from '../../components/utility/customImage';
import { getPosterDisplaySrcSet } from '../../util/imageSizing';
import { mediaPath } from '../../util/seriesRoutes';
import './filmography.scss';
import {
  filmographyIdentity,
  filmographyDate,
  getFilmographySelection,
  getFilmographyRoles,
} from './filmographyRules';
import type { FilmographyView, FilmographyEntry } from './filmographyRules';

const FILMOGRAPHY_BATCH_SIZE = 10;

function FilmographyResults({
  movies,
  view,
  role,
  combined,
}: {
  movies: FilmographyEntry[];
  view: FilmographyView;
  role: string;
  combined: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(FILMOGRAPHY_BATCH_SIZE);
  const countRef = useRef<HTMLParagraphElement>(null);
  const visibleMovies = movies.slice(0, visibleCount);
  const countLabel = combined ? 'title' : 'movie';

  return (
    <>
      <p
        ref={countRef}
        tabIndex={-1}
        className="filmography__count"
        role="status"
      >
        Showing {visibleMovies.length} of {movies.length}{' '}
        {movies.length === 1 ? countLabel : `${countLabel}s`}
      </p>
      {movies.length === 0 && (
        <p>
          {combined
            ? 'No credits available for this selection.'
            : 'No movie credits available.'}
        </p>
      )}
      <ul className="filmography__list">
        {visibleMovies.map((movie) => {
          const roles = getFilmographyRoles(movie, view, role);
          const metadataId = `filmography-metadata-${filmographyIdentity(movie)}`;
          const date = filmographyDate(movie);
          const isSeries = 'mediaType' in movie && movie.mediaType === 'tv';
          const content = (
            <>
              <div className="filmography__poster">
                <MovieImage
                  src={movie.posterUrl ?? undefined}
                  srcSet={getPosterDisplaySrcSet(
                    movie.posterUrl ?? undefined,
                    movie.posterSrcSet
                  )}
                  sizes="48px"
                  loading="lazy"
                  alt=""
                  className="filmography__image"
                />
              </div>
              <div className="filmography__heading">
                <span className="filmography__title">{movie.title}</span>
                {combined && (
                  <span className="filmography__media-type">
                    {isSeries ? 'Series' : 'Movie'}
                  </span>
                )}
              </div>
              <div id={metadataId} className="filmography__metadata">
                {date && (
                  <time className="filmography__year" dateTime={date}>
                    {date.substring(0, 4)}
                  </time>
                )}
                {roles.length > 0 && (
                  <p className="filmography__role">{roles.join(' · ')}</p>
                )}
              </div>
            </>
          );

          return (
            <li key={filmographyIdentity(movie)}>
              {Number.isSafeInteger(movie.id) && movie.id > 0 ? (
                <Link
                  to={mediaPath(isSeries ? 'tv' : 'movie', movie.id)}
                  className="filmography__row"
                  aria-label={movie.title}
                  aria-describedby={metadataId}
                >
                  {content}
                </Link>
              ) : (
                <div className="filmography__row">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {visibleCount < movies.length && (
        <div className="filmography__more">
          <button
            type="button"
            className="btn btn--outline btn--action"
            onClick={() => {
              const nextCount = visibleCount + FILMOGRAPHY_BATCH_SIZE;
              setVisibleCount(nextCount);
              // Keep focus on a useful, surviving element after the final batch.
              if (nextCount >= movies.length) {
                countRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            Load more
          </button>
        </div>
      )}
    </>
  );
}

export default function Filmography({
  entries,
  unavailable = false,
  recovery,
  groups,
}: {
  entries: FilmographyEntry[];
  unavailable?: boolean;
  recovery?: ReactNode;
  groups?: CombinedFilmography['groups'];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get('personType');
  const partial =
    groups &&
    (requestedType === 'movie' || requestedType === 'tv'
      ? groups[requestedType]?.status === 'unavailable'
      : Object.values(groups).some((group) => group?.status === 'unavailable'));
  const {
    mediaType,
    hasActing,
    hasCrew,
    view,
    role,
    roles,
    sort,
    canonicalQuery,
    sortedMovies,
  } = getFilmographySelection(entries, searchParams, unavailable || partial);
  const query = searchParams.toString();
  let emptyMessage = 'No movie credits available.';

  if (groups) {
    emptyMessage = partial
      ? 'Credits for this selection are unavailable.'
      : 'No credits available for this selection.';
  }

  useEffect(() => {
    if (!unavailable && !partial && query !== canonicalQuery) {
      setSearchParams(canonicalQuery, { replace: true });
    }
  }, [query, canonicalQuery, setSearchParams, unavailable, partial]);

  const updateSelection = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    if (name === 'personView' || name === 'personType') {
      next.delete('personRole');
    }
    setSearchParams(next);
  };

  return (
    <section className="filmography" aria-labelledby="filmography-heading">
      <h2 id="filmography-heading">Filmography</h2>
      {recovery}
      {groups && (
        <div
          className="filmography__media-tabs"
          role="group"
          aria-label="Filmography media type"
        >
          {(['all', 'movie', 'tv'] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={mediaType === type}
              onClick={() =>
                updateSelection('personType', type === 'all' ? '' : type)
              }
            >
              {{ all: 'All', movie: 'Movies', tv: 'Series' }[type]}
            </button>
          ))}
        </div>
      )}
      {!unavailable &&
        (hasActing || hasCrew ? (
          <>
            <div className="filmography__controls">
              <div
                className="filmography__views"
                role="group"
                aria-label="Filmography view"
              >
                {hasActing && (
                  <button
                    type="button"
                    className="btn btn--outline"
                    aria-pressed={view === 'acting'}
                    onClick={() => updateSelection('personView', 'acting')}
                  >
                    Acting
                  </button>
                )}
                {hasCrew && (
                  <button
                    type="button"
                    className="btn btn--outline"
                    aria-pressed={view === 'crew'}
                    onClick={() => updateSelection('personView', 'crew')}
                  >
                    Crew
                  </button>
                )}
              </div>
              {view === 'crew' && (
                <label>
                  Job or department
                  <select
                    value={role}
                    onChange={(event) =>
                      updateSelection('personRole', event.target.value)
                    }
                  >
                    <option value="">All jobs</option>
                    {roles.map((value) => (
                      <option key={value} value={value}>
                        {value.startsWith('job:')
                          ? value.slice(4)
                          : `${value.slice(11)} (department)`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Sort filmography
                <select
                  value={sort}
                  onChange={(event) =>
                    updateSelection('personSort', event.target.value)
                  }
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title A–Z</option>
                </select>
              </label>
            </div>
            <FilmographyResults
              key={`${mediaType}:${view}:${role}:${sort}`}
              combined={Boolean(groups)}
              movies={sortedMovies}
              view={view}
              role={role}
            />
          </>
        ) : (
          <p role="status">{emptyMessage}</p>
        ))}
    </section>
  );
}
