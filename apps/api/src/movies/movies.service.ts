import { Injectable, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as fs from 'fs';
import * as path from 'path';
import type {
  MovieDetails,
  MovieListResponse,
  MovieMutationPayload,
  MovieSummary,
} from '@movie-explorer/contracts';
import { GetMoviesQuery, MovieMutationDto } from './movies.dto';

interface LocalMovieRecord {
  id: number;
  title: string;
  tagline?: string;
  vote_average?: number;
  vote_count?: number;
  release_date: string;
  poster_path: string;
  overview: string;
  budget?: number;
  revenue?: number;
  runtime: number;
  genres: string[];
}

@Injectable()
export class MoviesService {
  private movies: LocalMovieRecord[] = [];

  private readonly moviesFilePath = path.join(
    __dirname,
    '../../data/movies.json',
  );

  constructor() {
    this.movies = JSON.parse(fs.readFileSync(this.moviesFilePath, 'utf-8'));
  }

  public findAll(query: GetMoviesQuery): MovieListResponse {
    let movies = [...this.movies];

    movies = this.filterBySearch(movies, query.search);
    movies = this.filterByGenre(movies, query.genre);
    movies = this.sortByField(movies, query.sort, query.sortOrder);

    const total = movies.length;
    const offset = Number(query.offset ?? 0);
    const limit = Number(query.limit ?? 10);
    movies = this.paginate(movies, offset, limit);

    return {
      movies: movies.map((movie) => this.toMovieSummary(movie)),
      total,
      offset,
      limit,
    };
  }

  public findOne(id: number): MovieDetails | undefined {
    const movie = this.movies.find((movie) => movie.id === id);

    return movie ? this.toMovieDetails(movie) : undefined;
  }

  public async create(movie: MovieMutationPayload): Promise<void> {
    const movieInstance = plainToInstance(MovieMutationDto, movie);
    const errors = await validate(movieInstance);

    if (errors.length > 0) {
      throw new Error('Validation failed!');
    }

    const newMovie = this.toLocalMovieRecord({
      ...movieInstance,
      id: Date.now(),
    });
    this.movies.push(newMovie);
    this.saveMoviesToFile();
  }

  public async update(
    id: number,
    movie: MovieMutationPayload,
  ): Promise<MovieDetails> {
    const index = this.movies.findIndex((m) => m.id === id);

    if (index === -1) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }

    const updatedMovie = {
      ...this.movies[index],
      ...this.toLocalMovieRecord({ ...movie, id }),
    };
    this.movies[index] = updatedMovie;

    this.saveMoviesToFile();

    return this.toMovieDetails(updatedMovie);
  }

  public delete(id: number): MovieDetails | null {
    const movieToDelete = this.movies.find((movie) => movie.id === id);
    if (!movieToDelete) {
      return null;
    }
    this.movies = this.movies.filter((movie) => movie.id !== id);
    this.saveMoviesToFile();
    return this.toMovieDetails(movieToDelete);
  }

  private filterBySearch(
    movies: LocalMovieRecord[],
    search?: string,
  ): LocalMovieRecord[] {
    if (!search) return movies;
    const lowerCaseSearch = search.toLowerCase();

    return movies.filter((movie) =>
      movie.title.toLowerCase().includes(lowerCaseSearch),
    );
  }

  private filterByGenre(
    movies: LocalMovieRecord[],
    genre?: string | string[],
  ): LocalMovieRecord[] {
    if (!genre || !genre.length) return movies;

    const genreFilter = typeof genre === 'string' ? [genre] : genre;

    return movies.filter((movie) =>
      genreFilter.some((genre) =>
        movie.genres.some(
          (movieGenre) => movieGenre.toLowerCase() === genre.toLowerCase(),
        ),
      ),
    );
  }

  private sortByField(
    movies: LocalMovieRecord[],
    sort?: 'title' | 'releaseDate' | 'rating',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): LocalMovieRecord[] {
    if (!sort) return movies;

    const sortFieldByContractField = {
      title: 'title',
      releaseDate: 'release_date',
      rating: 'vote_average',
    } satisfies Record<string, keyof LocalMovieRecord>;

    const sortField = sortFieldByContractField[sort];

    return movies.sort((a, b) => {
      if (sortOrder === 'desc') {
        return a[sortField] > b[sortField] ? -1 : 1;
      }

      return a[sortField] > b[sortField] ? 1 : -1;
    });
  }

  private paginate(
    movies: LocalMovieRecord[],
    offset: number,
    limit: number,
  ): LocalMovieRecord[] {
    return movies.slice(offset, offset + limit);
  }

  private toMovieSummary(movie: LocalMovieRecord): MovieSummary {
    return {
      id: movie.id,
      title: movie.title,
      releaseDate: movie.release_date,
      posterUrl: movie.poster_path,
      genres: movie.genres,
    };
  }

  private toMovieDetails(movie: LocalMovieRecord): MovieDetails {
    return {
      ...this.toMovieSummary(movie),
      rating: movie.vote_average ?? 0,
      runtimeMinutes: movie.runtime,
      description: movie.overview,
    };
  }

  private toLocalMovieRecord(movie: MovieMutationPayload): LocalMovieRecord {
    return {
      id: movie.id,
      title: movie.title,
      release_date: movie.releaseDate,
      poster_path: movie.posterUrl,
      overview: movie.description,
      runtime: movie.runtimeMinutes,
      genres: movie.genres,
      vote_average: movie.rating,
    };
  }

  private saveMoviesToFile(): void {
    fs.writeFileSync(this.moviesFilePath, JSON.stringify(this.movies, null, 2));
  }
}
