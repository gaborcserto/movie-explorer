import type {
  PersonDetails,
  PersonFilmographyEntry,
} from '@movie-explorer/contracts';
import { TmdbMovieMapper } from './tmdb-movie.mapper';
import type { TmdbPersonDetails } from './tmdb.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

export function isTmdbPersonDetails(
  value: unknown,
): value is TmdbPersonDetails {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    Boolean(text(value.name)) &&
    isRecord(value.movie_credits) &&
    value.movie_credits.success !== false &&
    Array.isArray(value.movie_credits.cast) &&
    Array.isArray(value.movie_credits.crew)
  );
}

export class TmdbPersonMapper {
  private readonly movieMapper: TmdbMovieMapper;

  constructor(imageBaseUrl: string) {
    this.movieMapper = new TmdbMovieMapper(imageBaseUrl);
  }

  public toPersonDetails(person: TmdbPersonDetails): PersonDetails {
    const movies = new Map<number, PersonFilmographyEntry>();
    const addCredit = (value: unknown, acting: boolean) => {
      if (
        !isRecord(value) ||
        value.adult === true ||
        typeof value.id !== 'number' ||
        !Number.isSafeInteger(value.id) ||
        value.id <= 0 ||
        !text(value.title)
      ) {
        return;
      }

      let entry = movies.get(value.id);
      if (!entry) {
        entry = {
          ...this.movieMapper.toMovieSummary(
            {
              id: value.id,
              title: text(value.title),
              release_date: text(value.release_date),
              poster_path: text(value.poster_path) ?? null,
            },
            [],
          ),
          crewCredits: [],
        };
        movies.set(value.id, entry);
      }

      if (acting) {
        entry.actingCredits ??= [];
        const character = text(value.character);
        if (character && !entry.actingCredits.includes(character)) {
          entry.actingCredits.push(character);
        }
      } else {
        const department = text(value.department);
        const job = text(value.job);
        if (
          !entry.crewCredits.some(
            (credit) => credit.department === department && credit.job === job,
          )
        ) {
          entry.crewCredits.push({
            ...(department && { department }),
            ...(job && { job }),
          });
        }
      }
    };
    person.movie_credits.cast.forEach((credit) => addCredit(credit, true));
    person.movie_credits.crew.forEach((credit) => addCredit(credit, false));

    const profiles =
      isRecord(person.images) &&
      person.images.success !== false &&
      Array.isArray(person.images.profiles)
        ? person.images.profiles
        : [];
    const paths = [
      text(person.profile_path),
      ...profiles.map((profile: unknown) =>
        isRecord(profile) ? text(profile.file_path) : undefined,
      ),
    ].filter((path): path is string =>
      Boolean(path && /^\/[^/\s]+$/.test(path)),
    );
    const profilePhotos = [...new Set(paths)].map((path) =>
      this.movieMapper.toProfilePhoto(path, person.name),
    );

    return {
      ...this.movieMapper.toPersonReference({
        id: person.id,
        name: person.name,
        profile_path: text(person.profile_path),
      }),
      id: person.id,
      ...(text(person.known_for_department) && {
        knownForDepartment: text(person.known_for_department),
      }),
      ...(text(person.birthday) && { birthday: text(person.birthday) }),
      ...(text(person.deathday) && { deathDate: text(person.deathday) }),
      ...(text(person.place_of_birth) && {
        placeOfBirth: text(person.place_of_birth),
      }),
      ...(text(person.biography) && { biography: text(person.biography) }),
      ...(profilePhotos.length > 0 && { profilePhotos }),
      filmography: [...movies.values()],
    };
  }
}
