import type { SeriesImages, SeriesVideos } from '@movie-explorer/contracts';

import { TmdbMediaMapper } from './tmdb-media.mapper';
import { seriesRecord, seriesText } from './tmdb-series.validation';

export class TmdbSeriesMediaMapper {
  private readonly media: TmdbMediaMapper;

  constructor(imageBaseUrl: string) {
    this.media = new TmdbMediaMapper(imageBaseUrl);
  }

  images(value: unknown): SeriesImages {
    const source = seriesRecord(value);
    const posters = this.photos(source?.posters);
    const backdrops = this.photos(source?.backdrops);
    return {
      posters: posters.photos,
      backdrops: backdrops.photos,
      sections: {
        posters: { status: posters.valid ? 'available' : 'unavailable' },
        backdrops: { status: backdrops.valid ? 'available' : 'unavailable' },
      },
    };
  }

  videos(value: unknown): SeriesVideos {
    const source = seriesRecord(value);
    const rows: unknown[] = Array.isArray(source?.results)
      ? source.results
      : [];
    let valid = Array.isArray(source?.results) && source.success !== false;
    const videos = rows.flatMap((value) => {
      const row = seriesRecord(value);
      const key = seriesText(row?.key);
      const name = seriesText(row?.name);
      const site = seriesText(row?.site);
      if (!row || !key || !name || !site) {
        valid = false;
        return [];
      }
      const language: string | null | undefined =
        typeof row.iso_639_1 === 'string'
          ? row.iso_639_1
          : row.iso_639_1 === null
            ? null
            : undefined;
      return [
        {
          key,
          name,
          site,
          type: seriesText(row.type) ?? '',
          official: row.official === true,
          ...(seriesText(row.id) && { id: seriesText(row.id) }),
          ...(typeof language === 'string' || language === null
            ? { iso_639_1: language }
            : {}),
          ...(typeof row.published_at === 'string' &&
          Number.isFinite(Date.parse(row.published_at))
            ? { published_at: row.published_at }
            : {}),
        },
      ];
    });
    return {
      videos: this.media.toMovieVideos({ results: videos }),
      availability: { status: valid ? 'available' : 'unavailable' },
    };
  }

  private photos(value: unknown) {
    let valid = Array.isArray(value);
    const rows: unknown[] = Array.isArray(value) ? value : [];
    const images = rows.flatMap((value) => {
      const row = seriesRecord(value);
      const path = seriesText(row?.file_path);
      if (!row || !path?.startsWith('/')) {
        valid = false;
        return [];
      }
      const positive = (value: unknown) =>
        typeof value === 'number' && Number.isFinite(value) && value > 0
          ? value
          : 0;
      const language: string | null | undefined =
        typeof row.iso_639_1 === 'string'
          ? row.iso_639_1
          : row.iso_639_1 === null
            ? null
            : undefined;
      return [
        {
          file_path: path,
          width: positive(row.width),
          height: positive(row.height),
          aspect_ratio: positive(row.aspect_ratio),
          ...(typeof language === 'string' || language === null
            ? { iso_639_1: language }
            : {}),
        },
      ];
    });
    return { photos: this.media.toImages(images), valid };
  }
}
