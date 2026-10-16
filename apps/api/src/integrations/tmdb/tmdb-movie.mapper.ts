import type {
  MovieDetails,
  MovieSuggestion,
  MovieSummary,
  MovieDirector,
  MovieCrewMember,
} from '@movie-explorer/contracts';
import type {
  TmdbGenre,
  TmdbCrewMember,
  TmdbMovieDetails,
  TmdbMovieListItem,
} from './tmdb.types';

const MAIN_CAST_LIMIT = 6;

export class TmdbMovieMapper {
  private readonly originalImageBaseUrl: string;

  constructor(private readonly imageBaseUrl: string) {
    const imageBaseUrlParts = imageBaseUrl.split('/');
    imageBaseUrlParts[imageBaseUrlParts.length - 1] = 'original';
    this.originalImageBaseUrl = imageBaseUrlParts.join('/');
  }

  public toMovieSummary(
    movie:
      | TmdbMovieListItem
      | Pick<
          TmdbMovieListItem,
          'id' | 'title' | 'release_date' | 'poster_path' | 'genre_ids'
        >,
    genres: TmdbGenre[],
  ): MovieSummary {
    // TMDB may omit genre_ids on an individual discovery result. The public
    // contract represents unavailable genre metadata as an empty list.
    const movieGenres =
      movie.genre_ids === undefined
        ? []
        : movie.genre_ids
            .map(
              (genreId) => genres.find((genre) => genre.id === genreId)?.name,
            )
            .filter((genreName): genreName is string => Boolean(genreName));

    return {
      id: movie.id,
      title: movie.title,
      ...(movie.release_date && { releaseDate: movie.release_date }),
      posterUrl: this.toPosterUrl(movie.poster_path),
      ...(movie.poster_path && {
        posterSrcSet: this.toPosterSrcSet(movie.poster_path),
      }),
      genres: movieGenres,
    };
  }

  public toMovieDetails(movie: TmdbMovieDetails): MovieDetails {
    const crew = movie.credits?.crew ?? [];
    const writers = this.toCrewMembers(crew, ['Writer', 'Screenplay', 'Story']);
    const producers = this.toCrewMembers(crew, ['Producer']);
    const directorIds = new Set<number>();
    const directors: MovieDirector[] = (movie.credits?.crew ?? [])
      .filter((credit) => {
        if (credit.job !== 'Director' || !credit.name.trim()) return false;
        if (!Number.isSafeInteger(credit.id) || credit.id <= 0) return true;
        if (directorIds.has(credit.id)) return false;
        directorIds.add(credit.id);
        return true;
      })
      .map((credit) => this.toPersonReference(credit));
    const director = directors?.length
      ? [...new Set(directors.map((credit) => credit.name))].join(', ')
      : undefined;
    const castIds = new Set<number>();
    const orderedCast = [...(movie.credits?.cast ?? [])]
      .sort((first, second) => first.order - second.order)
      .filter((credit) => credit.name.trim());
    const charactersByPerson = new Map<number, Set<string>>();
    orderedCast.forEach((credit) => {
      const character = credit.character?.trim();
      if (!Number.isSafeInteger(credit.id) || credit.id <= 0 || !character)
        return;
      const characters = charactersByPerson.get(credit.id) ?? new Set<string>();
      characters.add(character);
      charactersByPerson.set(credit.id, characters);
    });
    const castMembers = orderedCast
      .filter((credit) => {
        if (!Number.isSafeInteger(credit.id) || credit.id <= 0) return true;
        if (castIds.has(credit.id)) return false;
        castIds.add(credit.id);
        return true;
      })
      .slice(0, MAIN_CAST_LIMIT)
      .map((credit) => ({
        ...this.toPersonReference(credit),
        character:
          (charactersByPerson.has(credit.id)
            ? [...(charactersByPerson.get(credit.id) ?? [])].join(' / ')
            : credit.character?.trim()) || undefined,
      }));
    const cast = castMembers.map((credit) => credit.name);
    const photos = (movie.images?.backdrops ?? [])
      .slice(0, 12)
      .map((image) => ({
        thumbnailUrl: this.toImageUrl(image.file_path),
        fullUrl: this.toOriginalImageUrl(image.file_path),
      }))
      .filter((image) => image.thumbnailUrl && image.fullUrl);
    const videos = (movie.videos?.results ?? [])
      .filter((video) => video.site === 'YouTube' && video.key)
      .slice(0, 6)
      .map((video) => ({
        name: video.name,
        url: `https://www.youtube.com/watch?v=${video.key}`,
        thumbnailUrl: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
      }));

    const details: MovieDetails = {
      id: movie.id,
      title: movie.title,
      ...(movie.release_date && { releaseDate: movie.release_date }),
      posterUrl: this.toPosterUrl(movie.poster_path),
      ...(movie.poster_path && {
        posterSrcSet: this.toPosterSrcSet(movie.poster_path),
        // w92 is included in TMDB /configuration poster_sizes.
        posterPreviewUrl: `${this.originalImageBaseUrl.replace(/\/original$/, '/w92')}${movie.poster_path}`,
      }),
      genres: movie.genres.map((genre) => genre.name),
      cast,
    };

    if (castMembers.length) {
      details.castMembers = castMembers;
    }
    const description = movie.overview.trim();
    const backdropUrl = this.toImageUrl(movie.backdrop_path);
    if (description) details.description = description;
    if (director) details.director = director;
    if (directors.length) details.directors = directors;
    if (writers.length) details.writers = writers;
    if (producers.length) details.producers = producers;
    if (movie.vote_average > 0) details.rating = movie.vote_average;
    if (movie.runtime && movie.runtime > 0)
      details.runtimeMinutes = movie.runtime;
    if (backdropUrl) details.backdropUrl = backdropUrl;
    if (photos.length) details.photos = photos;
    if (videos.length) details.videos = videos;

    return details;
  }

  private toCrewMembers(
    crew: TmdbCrewMember[],
    jobs: string[],
  ): MovieCrewMember[] {
    const people: MovieCrewMember[] = [];
    const byId = new Map<number, MovieCrewMember>();
    crew.forEach((credit) => {
      if (!jobs.includes(credit.job) || !credit.name.trim()) return;
      const person = this.toPersonReference(credit);
      const existing = person.id ? byId.get(person.id) : undefined;
      if (existing) {
        if (!existing.roles.includes(credit.job))
          existing.roles.push(credit.job);
        existing.profileUrl ||= person.profileUrl;
        existing.profileSrcSet ||= person.profileSrcSet;
      } else {
        const member = { ...person, roles: [credit.job] };
        people.push(member);
        if (person.id) byId.set(person.id, member);
      }
    });
    return people;
  }

  public toMovieSuggestion(movie: TmdbMovieListItem): MovieSuggestion {
    const releaseYear = /^\d{4}/.test(movie.release_date)
      ? Number(movie.release_date.slice(0, 4))
      : undefined;
    const posterUrl = movie.poster_path
      ? `${this.imageBaseUrl.replace(/\/w\d+$/, '/w92')}${movie.poster_path}`
      : undefined;

    return {
      id: movie.id,
      title: movie.title,
      ...(releaseYear !== undefined && { releaseYear }),
      ...(posterUrl && { posterUrl }),
    };
  }

  public toPersonReference(person: {
    id?: number;
    name: string;
    profile_path?: string | null;
  }): MovieDirector {
    return {
      ...(Number.isSafeInteger(person.id) &&
        person.id > 0 && { id: person.id }),
      name: person.name.trim(),
      ...(person.profile_path && {
        profileUrl: this.toImageUrl(person.profile_path),
        profileSrcSet: this.toSrcSet(person.profile_path, [
          ['w185', '1x'],
          ['h632', '2x'],
          ['original', '3x'],
        ]),
      }),
    };
  }

  private toPosterUrl(posterPath: string | null): string {
    if (!posterPath) {
      return '';
    }

    return this.toImageUrl(posterPath);
  }

  private toPosterSrcSet(path: string): string {
    // Live /configuration sizes: w342 covers 320 CSS px, w780 covers DPR 2.
    // DPR 3 needs original: the next required width (960) exceeds w780.
    return this.toSrcSet(path, [
      ['w342', '1x'],
      ['w780', '2x'],
      ['original', '3x'],
    ]);
  }

  private toSrcSet(path: string, candidates: [string, string][]): string {
    const baseUrl = this.originalImageBaseUrl.replace(/\/original$/, '');
    return candidates
      .map(([size, descriptor]) => `${baseUrl}/${size}${path} ${descriptor}`)
      .join(', ');
  }

  private toImageUrl(path: string | null): string {
    return path ? `${this.imageBaseUrl}${path}` : '';
  }

  private toOriginalImageUrl(path: string | null): string {
    return path ? `${this.originalImageBaseUrl}${path}` : '';
  }
}
