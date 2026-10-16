import { BadGatewayException, Injectable } from '@nestjs/common';
import type {
  MovieDetails,
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
import { isTmdbPersonDetails, TmdbPersonMapper } from './tmdb-person.mapper';
import {
  TmdbGenre,
  TmdbGenreListResponse,
  TmdbMovieDetails,
  TmdbMovieListItem,
  TmdbPagedResponse,
} from './tmdb.types';

@Injectable()
export class TmdbMovieProvider implements MovieProvider {
  private readonly config: TmdbConfig;
  private readonly mapper: TmdbMovieMapper;
  private genreCache?: TmdbGenre[];

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
    const movies = response.results
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

    return {
      movies,
      page: response.page,
      totalPages: response.total_pages,
      totalResults: response.total_results,
    };
  }

  public async findSuggestions(
    query: string,
    limit: number,
  ): Promise<MovieSuggestionsResponse> {
    const response = await this.request<TmdbPagedResponse<TmdbMovieListItem>>(
      '/search/movie',
      {
        query: query.trim(),
        include_adult: 'false',
        page: '1',
      },
    );

    return {
      suggestions: (response?.results ?? [])
        .slice(0, limit)
        .map((movie) => this.mapper.toMovieSuggestion(movie)),
    };
  }

  public async findOne(id: number): Promise<MovieDetails | undefined> {
    const movie = await this.request<TmdbMovieDetails>(`/movie/${id}`, {
      append_to_response: 'credits,images,videos',
      // Images use ISO 639-1 language codes; also include language-neutral stills.
      include_image_language: `${this.config.language.split('-')[0]},null`,
    });

    if (!movie) return undefined;

    // A successful details request can contain missing/failed appended resources.
    // Reject partial responses rather than presenting failures as empty collections.
    if (
      !Array.isArray(movie.credits?.cast) ||
      !Array.isArray(movie.credits?.crew) ||
      !Array.isArray(movie.images?.backdrops) ||
      !Array.isArray(movie.videos?.results)
    ) {
      throw new BadGatewayException('Movie provider response was incomplete');
    }

    return this.mapper.toMovieDetails(movie);
  }

  public async findPerson(id: number): Promise<PersonDetails | undefined> {
    const person = await this.request<unknown>(`/person/${id}`, {
      append_to_response: 'movie_credits',
    });
    if (person === undefined) return undefined;
    if (!isTmdbPersonDetails(person) || person.id !== id) {
      throw new BadGatewayException('Person provider response was invalid');
    }
    return new TmdbPersonMapper(this.config.imageBaseUrl).toPersonDetails(
      person,
    );
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
    if (!this.genreCache) {
      const response =
        await this.request<TmdbGenreListResponse>('/genre/movie/list');
      this.genreCache = response.genres;
    }

    return this.genreCache;
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

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });
    } catch {
      throw new BadGatewayException('Movie provider request failed');
    }

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw new BadGatewayException('Movie provider request failed');
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new BadGatewayException('Movie provider response was invalid');
    }
  }
}
