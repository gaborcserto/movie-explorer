import { BadGatewayException, Injectable } from '@nestjs/common';
import type {
  MovieDetails,
  MovieListResponse,
  MovieQueryParams,
  MovieSortField,
  MovieSortOrder,
} from '@movie-explorer/contracts';
import type { MovieProvider } from '../../movies/movie-provider';
import { getTmdbConfig, TmdbConfig } from './tmdb.config';
import { TmdbMovieMapper } from './tmdb-movie.mapper';
import {
  TmdbGenre,
  TmdbGenreListResponse,
  TmdbMovieDetails,
  TmdbMovieListItem,
  TmdbPagedResponse,
} from './tmdb.types';

const TMDB_PAGE_SIZE = 20;
const TMDB_SEARCH_GENRE_PAGE_LIMIT = 5;

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
    const offset = Number(query.offset ?? 0);
    const limit = Number(query.limit ?? 10);

    if (limit === 0) {
      const total = await this.getTotal(query);
      return { movies: [], total, offset, limit };
    }

    if (query.search && query.genre) {
      return this.findSearchResultsWithLocalGenreFilter(query, offset, limit);
    }

    const page = Math.floor(offset / TMDB_PAGE_SIZE) + 1;
    const startIndex = offset % TMDB_PAGE_SIZE;
    const pageCount = Math.ceil((startIndex + limit) / TMDB_PAGE_SIZE);
    const pages = await Promise.all(
      Array.from({ length: pageCount }, (_, index) =>
        this.fetchMoviePage(query, page + index),
      ),
    );

    const genres = await this.getGenres();
    const movies = pages
      .flatMap((response) => response.results)
      .slice(startIndex, startIndex + limit)
      .map((movie) => this.mapper.toMovieSummary(movie, genres));

    return {
      movies,
      total: pages[0]?.total_results ?? 0,
      offset,
      limit,
    };
  }

  public async findOne(id: number): Promise<MovieDetails | undefined> {
    const movie = await this.request<TmdbMovieDetails>(`/movie/${id}`, {
      append_to_response: 'credits,images,videos',
    });

    return movie ? this.mapper.toMovieDetails(movie) : undefined;
  }

  private async getTotal(query: MovieQueryParams): Promise<number> {
    if (query.search && query.genre) {
      const response = await this.findSearchResultsWithLocalGenreFilter(
        query,
        0,
        0,
      );
      return response.total;
    }

    const response = await this.fetchMoviePage(query, 1);
    return response.total_results;
  }

  private async findSearchResultsWithLocalGenreFilter(
    query: MovieQueryParams,
    offset: number,
    limit: number,
  ): Promise<MovieListResponse> {
    const genres = await this.getGenres();
    const genreNames = this.normalizeGenreFilter(query.genre);
    const searchQuery = { ...query, genre: undefined };
    const firstPage = await this.fetchMoviePage(searchQuery, 1);
    const pagesToFetch = Math.min(
      firstPage.total_pages,
      TMDB_SEARCH_GENRE_PAGE_LIMIT,
    );
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, pagesToFetch - 1) }, (_, index) =>
        this.fetchMoviePage(searchQuery, index + 2),
      ),
    );

    const genreNamesById = new Map(
      genres.map((genre) => [genre.id, genre.name.toLowerCase()]),
    );
    const requestedGenres = new Set(genreNames);

    const movies = [firstPage, ...remainingPages]
      .flatMap((response) => response.results)
      .filter((movie) =>
        this.movieMatchesGenres(movie, genreNamesById, requestedGenres),
      );

    this.sortMoviesLocally(movies, query.sort, query.sortOrder);

    return {
      movies: movies
        .slice(offset, offset + limit)
        .map((movie) => this.mapper.toMovieSummary(movie, genres)),
      total: movies.length,
      offset,
      limit,
    };
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
        },
      );
    }

    if (query.genre || query.sort) {
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

    return movie.genre_ids.some((genreId) => {
      const genreName = genreNamesById.get(genreId);
      return genreName ? requestedGenres.has(genreName) : false;
    });
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

  private sortMoviesLocally(
    movies: TmdbMovieListItem[],
    sort?: MovieSortField,
    sortOrder?: MovieSortOrder,
  ): void {
    if (!sort) {
      return;
    }

    const getValue = (movie: TmdbMovieListItem): string | number => {
      if (sort === 'popularity') return movie.popularity;
      if (sort === 'releaseDate') return movie.release_date;
      if (sort === 'rating') return movie.vote_average;
      return movie.title;
    };

    movies.sort((a, b) => {
      const first = getValue(a);
      const second = getValue(b);
      const result = first > second ? 1 : first < second ? -1 : 0;

      const direction = sortOrder ?? this.getDefaultSortOrder(sort);
      return direction === 'desc' ? result * -1 : result;
    });
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
