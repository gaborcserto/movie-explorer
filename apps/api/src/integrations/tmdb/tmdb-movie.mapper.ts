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
    const seenVideos = new Set<string>();
    const videos: MovieVideo[] = (payload?.results ?? []).flatMap((video) => {
      const identity = `${video.site}:${video.key}`;
      // TMDB currently supports YouTube and Vimeo. Vimeo remains an external
      // link; only YouTube is embedded by the application player.
      if (!video.key || seenVideos.has(identity)) {
        return [];
      }

      const url =
        video.site === 'YouTube'
          ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`
          : video.site === 'Vimeo' && /^\d+$/.test(video.key)
            ? `https://vimeo.com/${video.key}`
            : '';
      seenVideos.add(identity);
      return [
        {
          ...(video.id && { id: video.id }),
          key: video.key,
          site: video.site,
          ...(video.type && { type: video.type }),
          ...(video.iso_639_1 !== undefined && { language: video.iso_639_1 }),
          name: video.name,
          url,
          ...(video.site === 'YouTube' && {
            thumbnailUrl: `https://img.youtube.com/vi/${encodeURIComponent(video.key)}/hqdefault.jpg`,
          }),
        },
      ];
    });

    return videos;
  }

  public toImages(images: TmdbImage[]): MoviePhoto[] {
    const seen = new Set<string>();
    return images.flatMap((image) => {
      if (!image.file_path?.startsWith('/') || seen.has(image.file_path)) {
        return [];
      }

      seen.add(image.file_path);
      return [
        {
          filePath: image.file_path,
          thumbnailUrl: this.toImageUrl(image.file_path),
          fullUrl: this.toOriginalImageUrl(image.file_path),
          ...(image.width > 0 &&
            Number.isFinite(image.width) && { width: image.width }),
          ...(image.height > 0 &&
            Number.isFinite(image.height) && { height: image.height }),
          ...(image.aspect_ratio > 0 &&
            Number.isFinite(image.aspect_ratio) && {
              aspectRatio: image.aspect_ratio,
            }),
          ...(image.iso_639_1 !== undefined && { language: image.iso_639_1 }),
        },
      ];
    });
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
