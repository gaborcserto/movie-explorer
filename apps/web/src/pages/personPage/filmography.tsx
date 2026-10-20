import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PersonFilmographyEntry } from '@movie-explorer/contracts';

import MovieImage from '../../components/utility/customImage';
import { getPosterDisplaySrcSet } from '../../util/imageSizing';
import './filmography.scss';
import {
  getFilmographySelection,
  getFilmographyRoles,
} from './filmographyRules';
import type { FilmographyView } from './filmographyRules';

const FILMOGRAPHY_BATCH_SIZE = 10;

function FilmographyResults({
  movies,
  view,
  role,
}: {
  movies: PersonFilmographyEntry[];
  view: FilmographyView;
  role: string;
}) {
  const [visibleCount, setVisibleCount] = useState(FILMOGRAPHY_BATCH_SIZE);
  const countRef = useRef<HTMLParagraphElement>(null);
  const visibleMovies = movies.slice(0, visibleCount);

  return (
    <>
      <p
        ref={countRef}
        tabIndex={-1}
        className="filmography__count"
        role="status"
      >
        Showing {visibleMovies.length} of {movies.length}{' '}
        {movies.length === 1 ? 'movie' : 'movies'}
      </p>
      {movies.length === 0 && <p>No movie credits available.</p>}
      <ul className="filmography__list">
        {visibleMovies.map((movie) => {
          const roles = getFilmographyRoles(movie, view, role);
          const metadataId = `filmography-metadata-${movie.id}`;
          const content = (
            <>
              <div className="filmography__poster">
                <MovieImage
                  src={movie.posterUrl}
                  srcSet={getPosterDisplaySrcSet(
                    movie.posterUrl,
                    movie.posterSrcSet
                  )}
                  sizes="48px"
                  loading="lazy"
                  alt=""
                  className="filmography__image"
                />
              </div>
              <span className="filmography__title">{movie.title}</span>
              <div id={metadataId} className="filmography__metadata">
                {movie.releaseDate && (
                  <time
                    className="filmography__year"
                    dateTime={movie.releaseDate}
                  >
                    {movie.releaseDate.substring(0, 4)}
                  </time>
                )}
                {roles.length > 0 && (
                  <p className="filmography__role">{roles.join(' · ')}</p>
                )}
              </div>
            </>
          );
          return (
            <li key={movie.id}>
              {Number.isSafeInteger(movie.id) && movie.id > 0 ? (
                <Link
                  to={`/movie/${movie.id}`}
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
}: {
  entries: PersonFilmographyEntry[];
  unavailable?: boolean;
  recovery?: ReactNode;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    hasActing,
    hasCrew,
    view,
    role,
    roles,
    sort,
    canonicalQuery,
    sortedMovies,
  } = getFilmographySelection(entries, searchParams);
  const query = searchParams.toString();

  useEffect(() => {
    if (!unavailable && query !== canonicalQuery) {
      setSearchParams(canonicalQuery, { replace: true });
    }
  }, [query, canonicalQuery, setSearchParams, unavailable]);

  const updateSelection = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    if (name === 'personView') {
      next.delete('personRole');
    }
    setSearchParams(next);
  };

  return (
    <section className="filmography" aria-labelledby="filmography-heading">
      <h2 id="filmography-heading">Filmography</h2>
      {recovery}
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
              key={`${view}:${role}:${sort}`}
              movies={sortedMovies}
              view={view}
              role={role}
            />
          </>
        ) : (
          <p role="status">No movie credits available.</p>
        ))}
    </section>
  );
}
