import { Injectable, NotFoundException } from '@nestjs/common';
import { GetMoviesFilter, MoviesResponse, Movie } from './movies.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MoviesService {
  private movies: Movie[] = [];

  private readonly moviesFilePath = path.join(
    __dirname,
    '../../data/movies.json',
  );

  constructor() {
    this.movies = JSON.parse(fs.readFileSync(this.moviesFilePath, 'utf-8'));
  }

  public findAll(filterDto: GetMoviesFilter): MoviesResponse {
    let movies = [...this.movies];

    movies = this.filterBySearch(movies, filterDto.search, filterDto.searchBy);
    movies = this.filterByGenre(movies, filterDto.filter);
    movies = this.sortByField(movies, filterDto.sortBy, filterDto.sortOrder);
    const totalAmount = movies.length;
    movies = this.paginate(movies, filterDto.offset, filterDto.limit);

    return {
      data: movies,
      totalAmount,
      offset: filterDto.offset || 0,
      limit: filterDto.limit || 10,
    };
  }

  private filterBySearch(
    movies: Movie[],
    search: string,
    searchBy: 'title' | 'genres',
  ): Movie[] {
    if (!search || !searchBy) return movies;
    const lowerCaseSearch = search.toLowerCase();

    if (searchBy === 'title') {
      return movies.filter((movie) => movie.title.toLowerCase().includes(lowerCaseSearch));
    } else if (searchBy === 'genres') {
      return movies.filter((movie) =>
        movie.genres.some((genre) =>
          genre.toLowerCase().includes(lowerCaseSearch),
        ),
      );
    }

    return movies;
  }

  private filterByGenre(movies: Movie[], filter: string | string[]): Movie[] {
    if (!filter || !filter.length) return movies;

    const genreFilter: string[] =
      typeof filter === 'string' ? [filter] : filter;

    return movies.filter((movie) =>
      genreFilter.some((genre) =>
        movie.genres.some(
          (movieGenre) => movieGenre.toLowerCase() === genre.toLowerCase(),
        ),
      ),
    );
  }

  private sortByField(
    movies: Movie[],
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Movie[] {
    if (!sortBy) return movies;

    return movies.sort((a, b) => {
      if (sortOrder === 'desc') {
        return a[sortBy] > b[sortBy] ? -1 : 1;
      } else {
        return a[sortBy] > b[sortBy] ? 1 : -1;
      }
    });
  }

  private paginate(movies: Movie[], offset?: number, limit?: number): Movie[] {
    const currentOffset = offset !== undefined ? offset : 0;
    const currentLimit = limit !== undefined ? limit : 10;

    return movies.slice(currentOffset, currentOffset + currentLimit);
  }

  public findOne(id: number): Movie {
    return this.movies.find((movie) => movie.id === id);
  }

  public async create(movie: Movie): Promise<void> {
    const movieInstance = plainToInstance(Movie, movie);
    const errors = await validate(movieInstance);

    if (errors.length > 0) {
      throw new Error('Validation failed!');
    }

    const newMovie = { id: Date.now(), ...movieInstance };
    this.movies.push(newMovie);
    this.saveMoviesToFile();
  }

  public update(id: number, movie: Movie): Promise<Movie> {
    const index = this.movies.findIndex((m) => m.id === id);

    if (index === -1) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }

    const updatedMovie = { ...this.movies[index], ...movie };
    this.movies[index] = updatedMovie;

    this.saveMoviesToFile();

    return Promise.resolve(updatedMovie);
  }

  public delete(id: number): Movie | null {
    const movieToDelete = this.movies.find((movie) => movie.id === id);
    if (!movieToDelete) {
      return null;
    }
    this.movies = this.movies.filter((movie) => movie.id !== id);
    this.saveMoviesToFile();
    return movieToDelete;
  }

  private saveMoviesToFile(): void {
    fs.writeFileSync(this.moviesFilePath, JSON.stringify(this.movies, null, 2));
  }
}
