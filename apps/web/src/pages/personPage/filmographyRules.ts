import type {
  CombinedFilmographyEntry,
  PersonCrewCredit,
  PersonFilmographyEntry,
} from '@movie-explorer/contracts';

export type FilmographyEntry =
  PersonFilmographyEntry | CombinedFilmographyEntry;

export function filmographyIdentity(entry: FilmographyEntry) {
  return `${'mediaType' in entry ? entry.mediaType : 'movie'}:${entry.id}`;
}

export function filmographyDate(entry: FilmographyEntry) {
  return 'mediaType' in entry && entry.mediaType === 'tv'
    ? entry.firstAirDate
    : entry.releaseDate;
}

export type FilmographyView = 'acting' | 'crew';
type Sort = 'newest' | 'oldest' | 'title';

interface FilmographySelection {
  mediaType: 'all' | 'movie' | 'tv';
  hasActing: boolean;
  hasCrew: boolean;
  view: FilmographyView;
  role: string;
  roles: string[];
  sort: Sort;
  canonicalQuery: string;
  sortedMovies: FilmographyEntry[];
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

function mergeMovies(entries: readonly FilmographyEntry[]) {
  const movies = new Map<string, FilmographyEntry>();
  entries.forEach((entry) => {
    const previous = movies.get(filmographyIdentity(entry));
    movies.set(filmographyIdentity(entry), {
      ...entry,
      ...('mediaType' in entry &&
        entry.mediaType === 'tv' && {
          actingRoles: [
            ...new Map(
              [
                ...(previous && 'actingRoles' in previous
                  ? (previous.actingRoles ?? [])
                  : []),
                ...(entry.actingRoles ?? []),
              ].map((credit) => [JSON.stringify(credit), credit])
            ).values(),
          ],
        }),
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

function compareTitles(a: FilmographyEntry, b: FilmographyEntry) {
  return (
    a.title.localeCompare(b.title, 'en') ||
    a.id - b.id ||
    filmographyIdentity(a).localeCompare(filmographyIdentity(b))
  );
}

function sortMovies(movies: readonly FilmographyEntry[], sort: Sort) {
  return [...movies].sort((a, b) => {
    if (sort === 'title') {
      return compareTitles(a, b);
    }
    if (!filmographyDate(a) && filmographyDate(b)) {
      return 1;
    }
    if (filmographyDate(a) && !filmographyDate(b)) {
      return -1;
    }
    const dates = (filmographyDate(a) ?? '').localeCompare(
      filmographyDate(b) ?? ''
    );
    return (sort === 'oldest' ? dates : -dates) || compareTitles(a, b);
  });
}

export function getFilmographySelection(
  entries: readonly FilmographyEntry[],
  searchParams: URLSearchParams,
  preserveSelection = false
): FilmographySelection {
  const requestedType = searchParams.get('personType');
  const mediaType =
    requestedType === 'movie' || requestedType === 'tv' ? requestedType : 'all';
  const movies = mergeMovies(entries).filter(
    (entry) =>
      mediaType === 'all' ||
      ('mediaType' in entry ? entry.mediaType : 'movie') === mediaType
  );
  const hasActing = movies.some((movie) => movie.actingCredits !== undefined);
  const hasCrew = movies.some((movie) => movie.crewCredits.length > 0);
  const defaultView = hasActing ? 'acting' : 'crew';
  const requestedView = searchParams.get('personView');
  const view: FilmographyView =
    (requestedView === 'acting' && (hasActing || preserveSelection)) ||
    (requestedView === 'crew' && (hasCrew || preserveSelection))
      ? requestedView
      : defaultView;
  const roles = uniqueText(
    movies.flatMap((movie) => movie.crewCredits.map(roleKey))
  ).sort((a, b) => a.localeCompare(b, 'en'));
  const requestedRole = searchParams.get('personRole') ?? '';
  const role =
    view === 'crew' && (roles.includes(requestedRole) || preserveSelection)
      ? requestedRole
      : '';
  const requestedSort = searchParams.get('personSort');
  const sort: Sort =
    requestedSort === 'oldest' || requestedSort === 'title'
      ? requestedSort
      : 'newest';

  const canonicalParams = new URLSearchParams(searchParams);
  canonicalParams.delete('personType');
  if (mediaType !== 'all') {
    canonicalParams.set('personType', mediaType);
  }
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
    mediaType,
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
  movie: FilmographyEntry,
  view: FilmographyView,
  role: string
): string[] {
  const isSeries = 'mediaType' in movie && movie.mediaType === 'tv';
  const episodes = (count: number | null | undefined) =>
    count == null ? '' : `${count} ${count === 1 ? 'episode' : 'episodes'}`;
  if (view === 'acting' && isSeries && movie.actingRoles?.length) {
    return uniqueText(
      movie.actingRoles.map((credit) =>
        [credit.character, episodes(credit.episodeCount)]
          .filter(Boolean)
          .join(' - ')
      )
    );
  }
  return view === 'acting'
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
              ...(isSeries ? [episodes(credit.episodeCount)] : []),
            ]
              .filter(Boolean)
              .join(' — ');
          })
      );
}
