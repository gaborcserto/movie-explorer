import type { MovieDetails, MovieSummary } from '@movie-explorer/contracts';
import type {
  TmdbGenre,
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
    const castMembers = [...(movie.credits?.cast ?? [])]
      .sort((first, second) => first.order - second.order)
      .filter((credit) => credit.name.trim())
      .slice(0, MAIN_CAST_LIMIT)
      .map((credit) => ({
        name: credit.name.trim(),
        character: credit.character?.trim() || undefined,
        profileUrl: this.toImageUrl(credit.profile_path),
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
      releaseDate: movie.release_date,
      posterUrl: this.toPosterUrl(movie.poster_path),
      genres: movie.genres.map((genre) => genre.name),
      cast,
    };

    if (
      castMembers.length &&
      castMembers.some((member) => member.character || member.profileUrl)
    ) {
      details.castMembers = castMembers;
    }
    const description = movie.overview.trim();
    const backdropUrl = this.toImageUrl(movie.backdrop_path);
    if (description) details.description = description;
    if (director) details.director = director;
    if (movie.vote_average > 0) details.rating = movie.vote_average;
    if (movie.runtime && movie.runtime > 0)
      details.runtimeMinutes = movie.runtime;
    if (backdropUrl) details.backdropUrl = backdropUrl;
    if (photos.length) details.photos = photos;
    if (videos.length) details.videos = videos;

    return details;
  }

  private toPosterUrl(posterPath: string | null): string {
    if (!posterPath) {
      return '';
    }

    return this.toImageUrl(posterPath);
  }

  private toImageUrl(path: string | null): string {
    return path ? `${this.imageBaseUrl}${path}` : '';
  }

  private toOriginalImageUrl(path: string | null): string {
    return path ? `${this.originalImageBaseUrl}${path}` : '';
  }
}
