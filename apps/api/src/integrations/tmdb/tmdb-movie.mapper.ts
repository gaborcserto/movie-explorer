import type {
  MovieDetails,
  MovieSuggestion,
  MovieSummary,
  MovieDirector,
  MovieCrewMember,
  MoviePhoto,
  MovieVideo,
} from '@movie-explorer/contracts';

import type {
  TmdbGenre,
  TmdbCredits,
  TmdbVideos,
  TmdbCrewMember,
  TmdbMovieDetails,
  TmdbMovieListItem,
  TmdbImage,
} from './tmdb.types';
import { TmdbMediaMapper } from './tmdb-media.mapper';
import { TmdbImageMapper } from './tmdb-image.mapper';

type MovieCredits = {
  cast: MovieDetails['cast'];
  castMembers: NonNullable<MovieDetails['castMembers']>;
  director: MovieDetails['director'];
  directors: NonNullable<MovieDetails['directors']>;
  writers: NonNullable<MovieDetails['writers']>;
  producers: NonNullable<MovieDetails['producers']>;
};

// Exact jobs, not department membership: source authors keep their job labels.
const WRITING_JOBS = [
  'Writer',
  'Screenplay',
  'Story',
  'Novel',
  'Characters',
  'Comic Book',
];
const PRODUCING_JOBS = [
  'Producer',
  'Executive Producer',
  'Co-Producer',
  'Associate Producer',
  'Line Producer',
  'Supervising Producer',
  'Consulting Producer',
  'Co-Executive Producer',
];

export class TmdbMovieMapper {
  private readonly images: TmdbImageMapper;
  private readonly originalImageBaseUrl: string;

  constructor(private readonly imageBaseUrl: string) {
    this.images = new TmdbImageMapper(imageBaseUrl);
    this.originalImageBaseUrl = this.images.originalImageBaseUrl;
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
    const { cast, castMembers, director, directors, writers, producers } =
      this.toMovieCredits(movie.credits);
    const backdrops = this.toImages(movie.images?.backdrops ?? []);
    const posters = this.toImages(movie.images?.posters ?? []);
    const videos = this.toMovieVideos(movie.videos);

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

    if (
      typeof movie.original_title === 'string' &&
      movie.original_title.trim()
    ) {
      details.originalTitle = movie.original_title;
    }
    if (typeof movie.status === 'string' && movie.status.trim()) {
      details.status = movie.status;
    }
    if (
      typeof movie.original_language === 'string' &&
      movie.original_language.trim()
    ) {
      details.originalLanguage = movie.original_language;
    }
    if (
      typeof movie.budget === 'number' &&
      Number.isFinite(movie.budget) &&
      movie.budget >= 0
    ) {
      details.budget = movie.budget;
    }
    if (
      typeof movie.revenue === 'number' &&
      Number.isFinite(movie.revenue) &&
      movie.revenue >= 0
    ) {
      details.revenue = movie.revenue;
    }

    if (castMembers.length) {
      details.castMembers = castMembers;
    }

    const description = movie.overview.trim();
    const backdropUrl = this.toImageUrl(movie.backdrop_path);

    if (description) {
      details.description = description;
    }
    if (director) {
      details.director = director;
    }
    if (directors.length) {
      details.directors = directors;
    }
    if (writers.length) {
      details.writers = writers;
    }
    if (producers.length) {
      details.producers = producers;
    }
    if (movie.vote_average > 0) {
      details.rating = movie.vote_average;
    }
    if (movie.runtime && movie.runtime > 0) {
      details.runtimeMinutes = movie.runtime;
    }
    if (backdropUrl) {
      details.backdropUrl = backdropUrl;
    }
    if (backdrops.length) {
      details.backdrops = backdrops;
    }
    if (posters.length) {
      details.posters = posters;
    }
    if (videos.length) {
      details.videos = videos;
    }

    return details;
  }

  public toMovieCredits(credits: TmdbCredits | undefined): MovieCredits {
    const crew = credits?.crew ?? [];
    const writers = this.toCrewMembers(crew, WRITING_JOBS);
    const producers = this.toCrewMembers(crew, PRODUCING_JOBS);
    const directorIds = new Set<number>();
    const directors: MovieDirector[] = (credits?.crew ?? [])
      .filter((credit) => {
        if (credit.job !== 'Director' || !credit.name.trim()) {
          return false;
        }
        if (!Number.isSafeInteger(credit.id) || credit.id <= 0) {
          return true;
        }
        if (directorIds.has(credit.id)) {
          return false;
        }

        directorIds.add(credit.id);

        return true;
      })
      .map((credit) => this.toPersonReference(credit));

    const director = directors?.length
      ? [...new Set(directors.map((credit) => credit.name))].join(', ')
      : undefined;
    const castIds = new Set<number>();
    const orderedCast = [...(credits?.cast ?? [])]
      .sort((first, second) => first.order - second.order)
      .filter((credit) => credit.name.trim());
    const charactersByPerson = new Map<number, Set<string>>();
    orderedCast.forEach((credit) => {
      const character = credit.character?.trim();

      if (!Number.isSafeInteger(credit.id) || credit.id <= 0 || !character) {
        return;
      }

      const characters = charactersByPerson.get(credit.id) ?? new Set<string>();
      characters.add(character);
      charactersByPerson.set(credit.id, characters);
    });
    const castMembers = orderedCast
      .filter((credit) => {
        if (!Number.isSafeInteger(credit.id) || credit.id <= 0) {
          return true;
        }
        if (castIds.has(credit.id)) {
          return false;
        }

        castIds.add(credit.id);

        return true;
      })
      .map((credit) => ({
        ...this.toPersonReference(credit),
        character:
          (charactersByPerson.has(credit.id)
            ? [...(charactersByPerson.get(credit.id) ?? [])].join(' / ')
            : credit.character?.trim()) || undefined,
      }));
    const cast = castMembers.map((credit) => credit.name);

    return { cast, castMembers, director, directors, writers, producers };
  }

  public toMovieVideos(payload: TmdbVideos | undefined): MovieVideo[] {
    return new TmdbMediaMapper(this.imageBaseUrl).toMovieVideos(payload);
  }

  public toImages(images: TmdbImage[]): MoviePhoto[] {
    return new TmdbMediaMapper(this.imageBaseUrl).toImages(images);
  }

  private toCrewMembers(
    crew: TmdbCrewMember[],
    jobs: string[],
  ): MovieCrewMember[] {
    const people: MovieCrewMember[] = [];
    const byId = new Map<number, MovieCrewMember>();
    crew.forEach((credit) => {
      if (!jobs.includes(credit.job) || !credit.name.trim()) {
        return;
      }

      const person = this.toPersonReference(credit);
      const existing = person.id ? byId.get(person.id) : undefined;

      if (existing) {
        if (!existing.roles.includes(credit.job)) {
          existing.roles.push(credit.job);
        }
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

  public toMovieSuggestion(
    movie: Pick<
      TmdbMovieListItem,
      'id' | 'title' | 'release_date' | 'poster_path'
    >,
  ): MovieSuggestion {
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
    return this.images.toPersonReference(person);
  }

  public toProfilePhoto(path: string, name: string) {
    return {
      thumbnailUrl: this.toImageUrl(path),
      fullUrl: this.toOriginalImageUrl(path),
      alt: `Portrait of ${name.trim()}`,
    };
  }

  private toPosterUrl(posterPath: string | null): string {
    if (!posterPath) {
      return '';
    }

    return this.toImageUrl(posterPath);
  }

  private toPosterSrcSet(path: string): string {
    return this.images.toPosterSrcSet(path);
  }

  private toImageUrl(path: string | null): string {
    return this.images.toImageUrl(path);
  }

  private toOriginalImageUrl(path: string | null): string {
    return path ? `${this.originalImageBaseUrl}${path}` : '';
  }
}
