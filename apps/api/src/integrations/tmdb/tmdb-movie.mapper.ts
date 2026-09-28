import type { MovieDetails, MovieSummary } from '@movie-explorer/contracts';
import type {
  TmdbGenre,
  TmdbMovieDetails,
  TmdbMovieListItem,
} from './tmdb.types';

export class TmdbMovieMapper {
  constructor(private readonly imageBaseUrl: string) {}

  public toMovieSummary(
    movie: TmdbMovieListItem,
    genres: TmdbGenre[],
  ): MovieSummary {
    return {
      id: movie.id,
      title: movie.title,
      releaseDate: movie.release_date,
      posterUrl: this.toPosterUrl(movie.poster_path),
      genres: movie.genre_ids
        .map((genreId) => genres.find((genre) => genre.id === genreId)?.name)
        .filter((genreName): genreName is string => Boolean(genreName)),
    };
  }

  public toMovieDetails(movie: TmdbMovieDetails): MovieDetails {
    return {
      id: movie.id,
      title: movie.title,
      releaseDate: movie.release_date,
      posterUrl: this.toPosterUrl(movie.poster_path),
      genres: movie.genres.map((genre) => genre.name),
      rating: movie.vote_average,
      runtimeMinutes: movie.runtime ?? 0,
      description: movie.overview,
    };
  }

  private toPosterUrl(posterPath: string | null): string {
    if (!posterPath) {
      return '';
    }

    return `${this.imageBaseUrl}${posterPath}`;
  }
}
