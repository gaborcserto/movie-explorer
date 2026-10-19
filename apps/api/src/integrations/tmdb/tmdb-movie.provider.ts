import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { parseRetryAfter } from './retry-after';
import type {
  MovieDetails,
  MovieSection,
  MovieSectionResponse,
  SectionAvailability,
  MovieListResponse,
  MovieQueryParams,
  MovieSortField,
  MovieSortOrder,
  MovieSuggestionsResponse,
  PersonDetails,
} from '@movie-explorer/contracts';
import type { MovieProvider } from '../../movies/movie-provider';
import { getTmdbConfig, TmdbConfig } from './tmdb.config';
import { TmdbMovieMapper } from './tmdb-movie.mapper';
import {
  mapPeople,
  searchPage,
  searchRecord,
  searchText,
} from './tmdb-search.mapper';
import { isTmdbPersonDetails, TmdbPersonMapper } from './tmdb-person.mapper';
import {
  TmdbGenre,
  TmdbGenreListResponse,
  TmdbMovieDetails,
  TmdbMovieListItem,
  TmdbPagedResponse,
} from './tmdb.types';

function detailRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

const GENRE_CACHE_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class TmdbMovieProvider implements MovieProvider {
  private readonly logger = new Logger(TmdbMovieProvider.name);
  private readonly config: TmdbConfig;
  private readonly mapper: TmdbMovieMapper;
  private readonly genreCache = new Map<
    string,
    { genres: TmdbGenre[]; expiresAt: number }
  >();
  private readonly genreRequests = new Map<string, Promise<TmdbGenre[]>>();

  constructor(config: TmdbConfig = getTmdbConfig()) {
    this.config = config;
    this.mapper = new TmdbMovieMapper(config.imageBaseUrl);
  }

  public async findAll(query: MovieQueryParams): Promise<MovieListResponse> {
    const page = Number(query.page ?? 1);
    const response = await this.fetchMoviePage(query, page);
    const genres = await this.getGenres();
    const requestedGenres = new Set(this.normalizeGenreFilter(query.genre));
    const genreNamesById = new Map(
      genres.map((genre) => [genre.id, genre.name.toLowerCase()]),
    );
    let movies: MovieListResponse['movies'];
    try {
      movies = response.results
        .filter((movie) =>
          query.search
            ? this.movieMatchesSearchFilters(
                movie,
                query,
                genreNamesById,
                requestedGenres,
              )
            : true,
        )
        .map((movie) => this.mapper.toMovieSummary(movie, genres));
    } catch {
      this.logFailure('movie-list', 'invalid-response', 502, 200);
      throw new BadGatewayException('Movie provider response was invalid');
    }

    return {
      movies,
      page: response.page,
      totalPages: response.total_pages,
      totalResults: response.total_results,
    };
  }

  public async findPeople(query: string, page: number) {
    const response = await this.request<unknown>('/search/person', {
      query: query.trim(),
      include_adult: 'false',
      page: String(page),
    });
    return mapPeople(response, this.config.imageBaseUrl);
  }

  public async findSuggestions(
    query: string,
    limit: number,
  ): Promise<MovieSuggestionsResponse> {
    const response = await this.request<unknown>('/search/movie', {
      query: query.trim(),
      include_adult: 'false',
      page: '1',
    });

    const suggestions = searchPage(response).results.flatMap((value) => {
      const movie = searchRecord(value);
      const title = searchText(movie?.title);
      if (
        !movie ||
        !title ||
        (movie.media_type && movie.media_type !== 'movie')
      ) {
        return [];
      }

      return [
        this.mapper.toMovieSuggestion({
          id: Number(movie.id),
          title,
          release_date: searchText(movie.release_date),
          poster_path: searchText(movie.poster_path)?.startsWith('/')
            ? searchText(movie.poster_path)
            : null,
        }),
      ];
    });
    return {
      suggestions: [
        ...new Map(suggestions.map((movie) => [movie.id, movie])).values(),
      ].slice(0, limit),
    };
  }

  // Successful appends stay a single request. Only an atomic transport/upstream
  // failure needs a profile-only fallback; there are no retry loops.
  private async detailRequest<T>(path: string, query: Record<string, string>) {
    try {
      return await this.request<T>(path, query, true);
    } catch (error) {
      if (
        !(error instanceof HttpException) ||
        error.getStatus() !== 502 ||
        error.message === 'Movie provider response was invalid'
      ) {
        throw error;
      }

      return this.request<T>(path, {}, true);
    }
  }

  public async findOne(id: number): Promise<MovieDetails | undefined> {
    const movie = await this.detailRequest<TmdbMovieDetails>(`/movie/${id}`, {
      append_to_response: 'credits,images,videos',
      ...this.mediaLanguages(),
    });
    if (!movie) {
      return undefined;
    }

    if (
      movie.id !== id ||
      typeof movie.title !== 'string' ||
      !movie.title.trim() ||
      typeof movie.overview !== 'string' ||
      !Array.isArray(movie.genres) ||
      !movie.genres.every(
        (genre) =>
          genre &&
          Number.isSafeInteger(genre.id) &&
          typeof genre.name === 'string',
      )
    ) {
      this.logFailure('movie-detail', 'invalid-response', 502, 200);
      throw new BadGatewayException('Movie provider response was invalid');
    }
    let details: MovieDetails;
    try {
      details = this.mapper.toMovieDetails({
        ...movie,
        credits: undefined,
        images: undefined,
        videos: undefined,
      });
    } catch {
      this.logFailure('movie-detail', 'invalid-response', 502, 200);
      throw new BadGatewayException('Movie provider response was invalid');
    }
    const sections: Record<MovieSection, SectionAvailability> = {
      credits: { status: 'unavailable' },
      photos: { status: 'unavailable' },
      posters: { status: 'unavailable' },
      videos: { status: 'unavailable' },
    };
    for (const section of ['credits', 'videos', 'photos', 'posters'] as const) {
      try {
        Object.assign(
          details,
          this.mapMovieSection(
            section,
            section === 'photos' || section === 'posters'
              ? movie.images
              : movie[section],
          ),
        );
        sections[section] = { status: 'available' };
      } catch {
        this.logFailure(`movie-${section}`, 'invalid-response', 502, 200);
        sections[section] = { status: 'unavailable' };
      }
    }
    return { ...details, sections };
  }

  private mapMovieSection(
    section: MovieSection,
    value: unknown,
  ): MovieSectionResponse {
    const resource = detailRecord(value);
    const imageKey = section === 'posters' ? 'posters' : 'backdrops';
    const isImages = section === 'photos' || section === 'posters';
    if (
      !resource ||
      resource.success === false ||
      (section === 'credits'
        ? !Array.isArray(resource.cast) || !Array.isArray(resource.crew)
        : !Array.isArray(resource[isImages ? imageKey : 'results']))
    ) {
      throw new BadGatewayException('Movie section response was invalid');
    }

    const validEntries = (
      key: string,
      fields: string[],
      metadata: (item: Record<string, unknown>) => boolean = () => true,
    ) =>
      Array.isArray(resource[key]) &&
      resource[key].every((entry: unknown) => {
        const item = detailRecord(entry);
        return (
          item &&
          fields.every((field) => typeof item[field] === 'string') &&
          metadata(item)
        );
      });
    if (
      section === 'credits'
        ? !validEntries('cast', ['name']) ||
          !validEntries('crew', ['name', 'job'])
        : isImages
          ? !validEntries(imageKey, ['file_path'], (image) => {
              return (
                typeof image.file_path === 'string' &&
                image.file_path.startsWith('/') &&
                ['width', 'height', 'aspect_ratio'].every(
                  (key) =>
                    image[key] === undefined ||
                    (typeof image[key] === 'number' &&
                      Number.isFinite(image[key]) &&
                      image[key] > 0),
                ) &&
                (image.iso_639_1 === undefined ||
                  image.iso_639_1 === null ||
                  typeof image.iso_639_1 === 'string')
              );
            })
          : !validEntries('results', ['name', 'key', 'site'], (video) => {
              return (
                ['id', 'type'].every(
                  (key) =>
                    video[key] === undefined || typeof video[key] === 'string',
                ) &&
                (video.iso_639_1 === undefined ||
                  video.iso_639_1 === null ||
                  typeof video.iso_639_1 === 'string')
              );
            })
    ) {
      throw new BadGatewayException('Movie section response was invalid');
    }

    const movie: TmdbMovieDetails = {
      id: 1,
      title: '',
      overview: '',
      genres: [],
      poster_path: null,
      runtime: null,
      vote_average: 0,
    };
    // Mapping errors are isolated to their section, including malformed entries.
    if (section === 'credits') {
      movie.credits = value as TmdbMovieDetails['credits'];
    }
    if (isImages) {
      movie.images = {
        [imageKey]: resource[imageKey],
      } as TmdbMovieDetails['images'];
    }
    if (section === 'videos') {
      movie.videos = value as TmdbMovieDetails['videos'];
    }

    const mapped = this.mapper.toMovieDetails(movie);
    if (section === 'photos') {
      return { backdrops: mapped.backdrops ?? [] };
    }
    if (section === 'posters') {
      return { posters: mapped.posters ?? [] };
    }
    if (section === 'videos') {
      return { videos: mapped.videos ?? [] };
    }

    return {
      cast: mapped.cast,
      castMembers: mapped.castMembers ?? [],
      director: mapped.director,
      directors: mapped.directors ?? [],
      writers: mapped.writers ?? [],
      producers: mapped.producers ?? [],
    };
  }

  public async findMovieSection(
    id: number,
    section: MovieSection,
  ): Promise<MovieSectionResponse> {
    const source =
      section === 'photos' || section === 'posters' ? 'images' : section;
    const value = await this.request<unknown>(
      `/movie/${id}/${source}`,
      source === 'images' || section === 'videos' ? this.mediaLanguages() : {},
      true,
    );
    try {
      return this.mapMovieSection(section, value);
    } catch {
      this.logFailure(`movie-${section}`, 'invalid-response', 502, 200);
      throw new BadGatewayException('Movie section response was invalid');
    }
  }

  private mediaLanguages(): Record<string, string> {
    // Appended and standalone requests use the same explicit fallback union.
    const languages = [
      ...new Set([this.config.language.split('-')[0], 'en', 'null']),
    ].join(',');
    return {
      include_image_language: languages,
      include_video_language: languages,
    };
  }

  public async findPerson(id: number): Promise<PersonDetails | undefined> {
    const person = await this.detailRequest<unknown>(`/person/${id}`, {
      append_to_response: 'movie_credits,images',
    });
    if (person === undefined) {
      return undefined;
    }

    const record = detailRecord(person);
    const primary = record && {
      ...record,
      movie_credits: { cast: [], crew: [] },
    };
    if (!isTmdbPersonDetails(primary) || primary.id !== id) {
      this.logFailure('person-detail', 'invalid-response', 502, 200);
      throw new BadGatewayException('Person provider response was invalid');
    }
    const mapped = new TmdbPersonMapper(
      this.config.imageBaseUrl,
    ).toPersonDetails(primary);
    try {
      mapped.filmography = this.mapFilmography(id, record.movie_credits);
      mapped.filmographyAvailability = { status: 'available' };
    } catch {
      this.logFailure('person-filmography', 'invalid-response', 502, 200);
      mapped.filmographyAvailability = { status: 'unavailable' };
    }
    return mapped;
  }

  private mapFilmography(id: number, value: unknown) {
    const person = { id, name: 'Profile', movie_credits: value };
    if (!isTmdbPersonDetails(person)) {
      throw new BadGatewayException('Filmography response was invalid');
    }

    return new TmdbPersonMapper(this.config.imageBaseUrl).toPersonDetails(
      person,
    ).filmography;
  }

  public async findFilmography(id: number) {
    const value = await this.request<unknown>(
      `/person/${id}/movie_credits`,
      {},
      true,
    );
    try {
      return { filmography: this.mapFilmography(id, value) };
    } catch {
      this.logFailure('person-filmography', 'invalid-response', 502, 200);
      throw new BadGatewayException('Filmography response was invalid');
    }
  }

  private async fetchMoviePage(
    query: MovieQueryParams,
    page: number,
  ): Promise<TmdbPagedResponse<TmdbMovieListItem>> {
    if (query.search) {
      return this.request<TmdbPagedResponse<TmdbMovieListItem>>(
        '/search/movie',
        {
          query: query.search,
          include_adult: 'false',
          page: String(page),
          primary_release_year: query.releaseYear
            ? String(query.releaseYear)
            : undefined,
        },
      );
    }

    if (
      query.genre ||
      query.releaseYear ||
      query.minimumRating !== undefined ||
      query.sort
    ) {
      const genreIds = await this.getGenreIds(query.genre);

      if (query.genre && genreIds.length === 0) {
        return {
          page,
          results: [],
          total_pages: 0,
          total_results: 0,
        };
      }

      return this.request<TmdbPagedResponse<TmdbMovieListItem>>(
        '/discover/movie',
        {
          include_adult: 'false',
          include_video: 'false',
          page: String(page),
          'primary_release_date.lte':
            query.sort === 'releaseDate' ? this.getToday() : undefined,
          sort_by: this.getTmdbSort(query.sort, query.sortOrder),
          with_genres: genreIds.join(',') || undefined,
          primary_release_year: query.releaseYear
            ? String(query.releaseYear)
            : undefined,
          'vote_average.gte':
            query.minimumRating !== undefined
              ? String(query.minimumRating)
              : undefined,
        },
      );
    }

    return this.request<TmdbPagedResponse<TmdbMovieListItem>>(
      '/movie/popular',
      { page: String(page) },
    );
  }

  private async getGenres(): Promise<TmdbGenre[]> {
    const key = this.config.language;
    const cached = this.genreCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.genres;
    }

    const inFlight = this.genreRequests.get(key);
    if (inFlight) {
      return inFlight;
    }

    const request = this.request<TmdbGenreListResponse>(
      '/genre/movie/list',
    ).then((response) => {
      this.genreCache.set(key, {
        genres: response.genres,
        expiresAt: Date.now() + GENRE_CACHE_TTL_MS,
      });
      return response.genres;
    });
    this.genreRequests.set(key, request);
    try {
      return await request;
    } finally {
      if (this.genreRequests.get(key) === request) {
        this.genreRequests.delete(key);
      }
    }
  }

  private async getGenreIds(genre?: string | string[]): Promise<number[]> {
    const requestedGenres = this.normalizeGenreFilter(genre);
    if (requestedGenres.length === 0) {
      return [];
    }

    const genres = await this.getGenres();
    return genres
      .filter((genre) => requestedGenres.includes(genre.name.toLowerCase()))
      .map((genre) => genre.id);
  }

  private normalizeGenreFilter(genre?: string | string[]): string[] {
    if (!genre || !genre.length) {
      return [];
    }

    const genres = typeof genre === 'string' ? [genre] : genre;
    return genres.map((genre) => genre.toLowerCase());
  }

  private movieMatchesGenres(
    movie: TmdbMovieListItem,
    genreNamesById: ReadonlyMap<number, string>,
    requestedGenres: ReadonlySet<string>,
  ): boolean {
    if (requestedGenres.size === 0) {
      return true;
    }

    return (
      movie.genre_ids !== undefined &&
      movie.genre_ids.some((genreId) => {
        const genreName = genreNamesById.get(genreId);
        return genreName ? requestedGenres.has(genreName) : false;
      })
    );
  }

  private movieMatchesSearchFilters(
    movie: TmdbMovieListItem,
    query: MovieQueryParams,
    genreNamesById: ReadonlyMap<number, string>,
    requestedGenres: ReadonlySet<string>,
  ): boolean {
    if (!this.movieMatchesGenres(movie, genreNamesById, requestedGenres)) {
      return false;
    }

    return (
      query.minimumRating === undefined ||
      movie.vote_average >= query.minimumRating
    );
  }

  private getTmdbSort(
    sort?: MovieSortField,
    sortOrder?: MovieSortOrder,
  ): string {
    const sortByContractField = {
      popularity: 'popularity',
      title: 'title',
      releaseDate: 'primary_release_date',
      rating: 'vote_average',
    } satisfies Record<MovieSortField, string>;

    const field = sort ? sortByContractField[sort] : 'popularity';
    const direction = sortOrder ?? this.getDefaultSortOrder(sort);

    return `${field}.${direction}`;
  }

  private getDefaultSortOrder(sort?: MovieSortField): MovieSortOrder {
    return sort === 'title' ? 'asc' : 'desc';
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async request<T>(
    path: string,
    query: Record<string, string | undefined> = {},
    allowNotFound = false,
  ): Promise<T | undefined> {
    const url = new URL(`${this.config.apiBaseUrl}${path}`);
    url.searchParams.set('language', this.config.language);

    if (this.config.region) {
      url.searchParams.set('region', this.config.region);
    }

    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    const operation = allowNotFound
      ? path.startsWith('/person/')
        ? 'person-detail'
        : 'movie-detail'
      : path;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs ?? 8000,
    );
    let upstreamStatus: number | undefined;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });
      upstreamStatus = response.status;
      controller.signal.throwIfAborted();
      if (response.status === 404 && allowNotFound) {
        this.logFailure(operation, 'not-found', 404, upstreamStatus);
        return undefined;
      }
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseRetryAfter(
            response.headers.get('Retry-After'),
          );
          throw new HttpException(
            {
              statusCode: 429,
              error: 'Too Many Requests',
              message: 'Movie provider rate limit reached',
              ...(retryAfter !== undefined && { retryAfter }),
            },
            429,
          );
        }
        throw new BadGatewayException('Movie provider request failed');
      }
      try {
        const body: unknown = await response.json();
        controller.signal.throwIfAborted();
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          throw new Error();
        }

        if (!allowNotFound) {
          if (path === '/genre/movie/list') {
            if (
              !('genres' in body) ||
              !Array.isArray(body.genres) ||
              !body.genres.every(
                (genre: unknown) =>
                  genre &&
                  typeof genre === 'object' &&
                  'id' in genre &&
                  Number.isSafeInteger(genre.id) &&
                  'name' in genre &&
                  typeof genre.name === 'string',
              )
            ) {
              throw new Error();
            }
          } else {
            searchPage(body);
          }
        }
        return body as T;
      } catch {
        if (controller.signal.aborted) {
          throw controller.signal.reason;
        }
        throw new BadGatewayException('Movie provider response was invalid');
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        this.logFailure(operation, 'timeout', 504, upstreamStatus);
        throw new GatewayTimeoutException('Movie provider request timed out');
      }
      if (error instanceof HttpException) {
        this.logFailure(
          operation,
          error.message === 'Movie provider response was invalid'
            ? 'invalid-response'
            : 'http',
          error.getStatus(),
          upstreamStatus,
        );
        throw error;
      }
      this.logFailure(operation, 'connection', 502, upstreamStatus);
      throw new BadGatewayException('Movie provider request failed');
    } finally {
      clearTimeout(timer);
      // Release unread error bodies as well as an interrupted JSON body read.
      controller.abort();
    }
  }

  private logFailure(
    operation: string,
    failure: string,
    applicationStatus: number,
    upstreamStatus?: number,
  ) {
    this.logger.warn({ operation, failure, upstreamStatus, applicationStatus });
  }
}
