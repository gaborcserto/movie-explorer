import type { MovieDetails, MovieSummary } from '@movie-explorer/contracts';
import type {
  TmdbGenre,
  TmdbMovieDetails,
  TmdbMovieListItem,
} from './tmdb.types';

const MAIN_CAST_LIMIT = 6;

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
    const directors = movie.credits?.crew
      .filter((credit) => credit.job === 'Director')
      .map((credit) => credit.name.trim())
      .filter(Boolean);
    const director = directors?.length
      ? [...new Set(directors)].join(', ')
      : undefined;
    const cast = [...(movie.credits?.cast ?? [])]
      .sort((first, second) => first.order - second.order)
      .map((credit) => credit.name.trim())
      .filter(Boolean)
      .slice(0, MAIN_CAST_LIMIT);

    return {
      id: movie.id,
      title: movie.title,
      releaseDate: movie.release_date,
      posterUrl: this.toPosterUrl(movie.poster_path),
      genres: movie.genres.map((genre) => genre.name),
      cast,
      description: movie.overview.trim() || undefined,
      director,
      rating: movie.vote_average > 0 ? movie.vote_average : undefined,
      runtimeMinutes:
        movie.runtime && movie.runtime > 0 ? movie.runtime : undefined,
    };
  }

  private toPosterUrl(posterPath: string | null): string {
    if (!posterPath) {
      return '';
    }

    return `${this.imageBaseUrl}${posterPath}`;
  }
}
