import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  PersonCrewCredit,
  PersonFilmographyEntry,
} from '@movie-explorer/contracts';
import Card from '../../components/card';
import './filmography.scss';

type View = 'acting' | 'crew';
type Sort = 'newest' | 'oldest' | 'title';

const FILMOGRAPHY_BATCH_SIZE = 12;

function uniqueText(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function roleKey(credit: PersonCrewCredit) {
  if (credit.job?.trim()) return `job:${credit.job.trim()}`;
  return credit.department?.trim()
    ? `department:${credit.department.trim()}`
    : '';
}

function matchesRole(credit: PersonCrewCredit, role: string) {
  if (!role) return true;
  return role.startsWith('department:')
    ? `department:${credit.department?.trim()}` === role
    : roleKey(credit) === role;
}

function mergeMovies(entries: PersonFilmographyEntry[]) {
  const movies = new Map<number, PersonFilmographyEntry>();
  entries.forEach((entry) => {
    const previous = movies.get(entry.id);
    movies.set(entry.id, {
      ...entry,
      actingCredits:
        previous?.actingCredits || entry.actingCredits
          ? uniqueText([
              ...(previous?.actingCredits ?? []),
              ...(entry.actingCredits ?? []),
            ])
          : undefined,
      crewCredits: [...(previous?.crewCredits ?? []), ...entry.crewCredits],
    });
  });
  return [...movies.values()];
}

function compareTitles(a: PersonFilmographyEntry, b: PersonFilmographyEntry) {
  return a.title.localeCompare(b.title, 'en') || a.id - b.id;
}

function sortMovies(movies: PersonFilmographyEntry[], sort: Sort) {
  return [...movies].sort((a, b) => {
    if (sort === 'title') return compareTitles(a, b);
    if (!a.releaseDate && b.releaseDate) return 1;
    if (a.releaseDate && !b.releaseDate) return -1;
    const dates = (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '');
    return (sort === 'oldest' ? dates : -dates) || compareTitles(a, b);
  });
}

function FilmographyResults({
  movies,
  view,
  role,
}: {
  movies: PersonFilmographyEntry[];
  view: View;
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
      <div className="filmography__grid">
        {visibleMovies.map((movie) => {
          const roles =
            view === 'acting'
              ? uniqueText(movie.actingCredits ?? [])
              : uniqueText(
                  movie.crewCredits
                    .filter((credit) => matchesRole(credit, role))
                    .map((credit) => {
                      const job = credit.job?.trim();
                      const department = credit.department?.trim();
                      return [
                        job,
                        department && department !== job ? department : '',
                      ]
                        .filter(Boolean)
                        .join(' — ');
                    })
                );
          return (
            <Card
              key={movie.id}
              movie={movie}
              destination={`/movie/${movie.id}`}
              genreNavigation={false}
              subtitle={roles.join(' · ')}
            />
          );
        })}
      </div>
      {visibleCount < movies.length && (
        <div className="filmography__more">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              const nextCount = visibleCount + FILMOGRAPHY_BATCH_SIZE;
              setVisibleCount(nextCount);
              // Keep focus on a useful, surviving element after the final batch.
              if (nextCount >= movies.length)
                countRef.current?.focus({ preventScroll: true });
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
}: {
  entries: PersonFilmographyEntry[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const movies = mergeMovies(entries);
  const hasActing = movies.some((movie) => movie.actingCredits !== undefined);
  const hasCrew = movies.some((movie) => movie.crewCredits.length > 0);
  const defaultView = hasActing ? 'acting' : 'crew';
  const requestedView = searchParams.get('personView');
  const view: View =
    (requestedView === 'acting' && hasActing) ||
    (requestedView === 'crew' && hasCrew)
      ? requestedView
      : defaultView;
  const roles = uniqueText(
    movies.flatMap((movie) => movie.crewCredits.map(roleKey))
  ).sort((a, b) => a.localeCompare(b, 'en'));
  const requestedRole = searchParams.get('personRole') ?? '';
  const role =
    view === 'crew' && roles.includes(requestedRole) ? requestedRole : '';
  const requestedSort = searchParams.get('personSort');
  const sort: Sort =
    requestedSort === 'oldest' || requestedSort === 'title'
      ? requestedSort
      : 'newest';

  const canonicalParams = new URLSearchParams(searchParams);
  canonicalParams.delete('personView');
  canonicalParams.delete('personRole');
  canonicalParams.delete('personSort');
  if (view !== defaultView) canonicalParams.set('personView', view);
  if (role) canonicalParams.set('personRole', role);
  if (sort !== 'newest') canonicalParams.set('personSort', sort);
  const canonicalQuery = canonicalParams.toString();
  const query = searchParams.toString();
  useEffect(() => {
    if (query !== canonicalQuery)
      setSearchParams(canonicalQuery, { replace: true });
  }, [query, canonicalQuery, setSearchParams]);

  const updateSelection = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name === 'personView') next.delete('personRole');
    setSearchParams(next);
  };
  const matchingMovies = movies.filter((movie) =>
    view === 'acting'
      ? movie.actingCredits !== undefined
      : movie.crewCredits.some((credit) => matchesRole(credit, role))
  );
  const sortedMovies = sortMovies(matchingMovies, sort);

  return (
    <section className="filmography" aria-labelledby="filmography-heading">
      <h2 id="filmography-heading">Filmography</h2>
      {hasActing || hasCrew ? (
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
      )}
    </section>
  );
}
