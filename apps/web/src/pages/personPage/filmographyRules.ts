import type {
  PersonCrewCredit,
  PersonFilmographyEntry,
} from '@movie-explorer/contracts';

export type FilmographyView = 'acting' | 'crew';
type Sort = 'newest' | 'oldest' | 'title';

interface FilmographySelection {
  hasActing: boolean;
  hasCrew: boolean;
  view: FilmographyView;
  role: string;
  roles: string[];
  sort: Sort;
  canonicalQuery: string;
  sortedMovies: PersonFilmographyEntry[];
}

function uniqueText(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function roleKey(credit: PersonCrewCredit) {
  if (credit.job?.trim()) {
    return `job:${credit.job.trim()}`;
  }
  return credit.department?.trim()
    ? `department:${credit.department.trim()}`
    : '';
}

function matchesRole(credit: PersonCrewCredit, role: string) {
  if (!role) {
    return true;
  }
  return role.startsWith('department:')
    ? `department:${credit.department?.trim()}` === role
    : roleKey(credit) === role;
}

function mergeMovies(entries: readonly PersonFilmographyEntry[]) {
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

function sortMovies(movies: readonly PersonFilmographyEntry[], sort: Sort) {
  return [...movies].sort((a, b) => {
    if (sort === 'title') {
      return compareTitles(a, b);
    }
    if (!a.releaseDate && b.releaseDate) {
      return 1;
    }
    if (a.releaseDate && !b.releaseDate) {
      return -1;
    }
    const dates = (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '');
    return (sort === 'oldest' ? dates : -dates) || compareTitles(a, b);
  });
}

export function getFilmographySelection(
  entries: readonly PersonFilmographyEntry[],
  searchParams: URLSearchParams
): FilmographySelection {
  const movies = mergeMovies(entries);
  const hasActing = movies.some((movie) => movie.actingCredits !== undefined);
  const hasCrew = movies.some((movie) => movie.crewCredits.length > 0);
  const defaultView = hasActing ? 'acting' : 'crew';
  const requestedView = searchParams.get('personView');
  const view: FilmographyView =
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
  if (view !== defaultView) {
    canonicalParams.set('personView', view);
  }
  if (role) {
    canonicalParams.set('personRole', role);
  }
  if (sort !== 'newest') {
    canonicalParams.set('personSort', sort);
  }

  const matchingMovies = movies.filter((movie) =>
    view === 'acting'
      ? movie.actingCredits !== undefined
      : movie.crewCredits.some((credit) => matchesRole(credit, role))
  );
  const sortedMovies = sortMovies(matchingMovies, sort);

  return {
    hasActing,
    hasCrew,
    view,
    role,
    roles,
    sort,
    canonicalQuery: canonicalParams.toString(),
    sortedMovies,
  };
}

export function getFilmographyRoles(
  movie: PersonFilmographyEntry,
  view: FilmographyView,
  role: string
): string[] {
  return view === 'acting'
    ? uniqueText(movie.actingCredits ?? [])
    : uniqueText(
        movie.crewCredits
          .filter((credit) => matchesRole(credit, role))
          .map((credit) => {
            const job = credit.job?.trim();
            const department = credit.department?.trim();
            return [job, department && department !== job ? department : '']
              .filter(Boolean)
              .join(' — ');
          })
      );
}
