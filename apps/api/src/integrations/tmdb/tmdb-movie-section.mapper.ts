import { BadGatewayException } from '@nestjs/common';
import type {
  MovieSection,
  MovieSectionResponse,
} from '@movie-explorer/contracts';

import type { TmdbMovieMapper } from './tmdb-movie.mapper';
import type { TmdbCredits, TmdbImage, TmdbVideos } from './tmdb.types';

function detailRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function mapMovieSection(
  section: MovieSection,
  value: unknown,
  mapper: TmdbMovieMapper,
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
  let entriesAreValid: boolean;

  if (section === 'credits') {
    entriesAreValid =
      validEntries('cast', ['name']) && validEntries('crew', ['name', 'job']);
  } else if (isImages) {
    entriesAreValid = validEntries(imageKey, ['file_path'], (image) => {
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
    });
  } else {
    entriesAreValid = validEntries(
      'results',
      ['name', 'key', 'site'],
      (video) => {
        return (
          ['id', 'type'].every(
            (key) => video[key] === undefined || typeof video[key] === 'string',
          ) &&
          (video.iso_639_1 === undefined ||
            video.iso_639_1 === null ||
            typeof video.iso_639_1 === 'string')
        );
      },
    );
  }

  if (!entriesAreValid) {
    throw new BadGatewayException('Movie section response was invalid');
  }

  // Mapping errors are isolated to their section, including malformed entries.
  if (isImages) {
    const images = mapper.toImages(resource[imageKey] as TmdbImage[]);

    return section === 'photos' ? { backdrops: images } : { posters: images };
  }
  if (section === 'videos') {
    return { videos: mapper.toMovieVideos(value as TmdbVideos) };
  }

  return mapper.toMovieCredits(value as TmdbCredits);
}
