import type { MoviePhoto, MovieVideo } from '@movie-explorer/contracts';

import type { TmdbVideos, TmdbImage } from './tmdb.types';
import { TmdbImageMapper } from './tmdb-image.mapper';

export class TmdbMediaMapper extends TmdbImageMapper {
  public toMovieVideos(payload: TmdbVideos | undefined): MovieVideo[] {
    const seenVideos = new Set<string>();
    const videos: MovieVideo[] = (payload?.results ?? []).flatMap((video) => {
      const identity = `${video.site}:${video.key}`;
      // TMDB currently supports YouTube and Vimeo. Vimeo remains an external
      // link; only YouTube is embedded by the application player.
      if (!video.key || seenVideos.has(identity)) {
        return [];
      }

      const url =
        video.site === 'YouTube'
          ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.key)}`
          : video.site === 'Vimeo' && /^\d+$/.test(video.key)
            ? `https://vimeo.com/${video.key}`
            : '';
      seenVideos.add(identity);
      return [
        {
          ...(video.id && { id: video.id }),
          key: video.key,
          site: video.site,
          ...(video.type && { type: video.type }),
          ...(video.iso_639_1 !== undefined && { language: video.iso_639_1 }),
          name: video.name,
          ...(video.published_at && { publishedAt: video.published_at }),
          url,
          ...(video.site === 'YouTube' && {
            thumbnailUrl: `https://img.youtube.com/vi/${encodeURIComponent(video.key)}/hqdefault.jpg`,
          }),
        },
      ];
    });

    return videos;
  }

  public toImages(images: TmdbImage[]): MoviePhoto[] {
    const seen = new Set<string>();
    return images.flatMap((image) => {
      if (!image.file_path?.startsWith('/') || seen.has(image.file_path)) {
        return [];
      }

      seen.add(image.file_path);
      return [
        {
          filePath: image.file_path,
          thumbnailUrl: this.toImageUrl(image.file_path),
          fullUrl: `${this.originalImageBaseUrl}${image.file_path}`,
          ...(image.width > 0 &&
            Number.isFinite(image.width) && { width: image.width }),
          ...(image.height > 0 &&
            Number.isFinite(image.height) && { height: image.height }),
          ...(image.aspect_ratio > 0 &&
            Number.isFinite(image.aspect_ratio) && {
              aspectRatio: image.aspect_ratio,
            }),
          ...(image.iso_639_1 !== undefined && { language: image.iso_639_1 }),
        },
      ];
    });
  }
}
