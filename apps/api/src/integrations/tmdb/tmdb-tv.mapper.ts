import type {
  CreditPerson,
  TvOrganization,
  TvSeasonSummary,
  TvSeriesDetails,
} from '@movie-explorer/contracts';

import { TmdbImageMapper } from './tmdb-image.mapper';
import type { TmdbTvDetails } from './tmdb-tv.types';
import { tvCount, tvDate, tvId, tvRecord, tvText } from './tmdb-tv.validation';

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const record = tvRecord(item);
        return record ? [record] : [];
      })
    : [];
}

export class TmdbTvMapper {
  private readonly images: TmdbImageMapper;

  constructor(imageBaseUrl: string) {
    this.images = new TmdbImageMapper(imageBaseUrl);
  }

  toSeriesDetails(series: TmdbTvDetails): TvSeriesDetails {
    const rating = series.vote_average;
    return {
      mediaType: 'tv',
      id: series.id,
      title: series.name.trim(),
      originalTitle: tvText(series.original_name),
      firstAirDate: tvDate(series.first_air_date),
      ...this.poster(series.poster_path),
      genres: records(series.genres).flatMap((genre) => {
        const name = tvText(genre.name);
        return name ? [name] : [];
      }),
      description: tvText(series.overview),
      originalLanguage: tvText(series.original_language),
      status: tvText(series.status),
      inProduction:
        typeof series.in_production === 'boolean' ? series.in_production : null,
      lastAirDate: tvDate(series.last_air_date),
      seasonCount: tvCount(series.number_of_seasons),
      episodeCount: tvCount(series.number_of_episodes),
      episodeRuntimeMinutes: Array.isArray(series.episode_run_time)
        ? series.episode_run_time.filter(
            (value): value is number => tvCount(value) !== null && value > 0,
          )
        : [],
      rating:
        typeof rating === 'number' &&
        Number.isFinite(rating) &&
        rating >= 0 &&
        rating <= 10
          ? rating
          : null,
      backdropUrl: this.images.toImageUrl(tvText(series.backdrop_path)) || null,
      creators: this.creators(series.created_by),
      networks: this.organizations(series.networks),
      productionCompanies: this.organizations(series.production_companies),
      seasons: this.seasons(series.seasons),
    };
  }

  private poster(value: unknown) {
    const path = tvText(value);
    return {
      posterUrl: this.images.toImageUrl(path) || null,
      ...(path && { posterSrcSet: this.images.toPosterSrcSet(path) }),
    };
  }

  private creators(value: unknown): CreditPerson[] {
    return records(value).flatMap((person) => {
      const name = tvText(person.name);
      if (!name) {
        return [];
      }
      return [
        this.images.toPersonReference({
          id: tvId(person.id),
          name,
          profile_path: tvText(person.profile_path),
        }),
      ];
    });
  }

  private organizations(value: unknown): TvOrganization[] {
    return records(value).flatMap((org) => {
      const id = tvId(org.id);
      const name = tvText(org.name);
      if (id === undefined || !name) {
        return [];
      }
      return [
        {
          id,
          name,
          logoUrl: this.images.toImageUrl(tvText(org.logo_path)) || null,
          originCountry: tvText(org.origin_country),
        },
      ];
    });
  }

  private seasons(value: unknown): TvSeasonSummary[] {
    const seasons = records(value).flatMap((season) => {
      const id = tvId(season.id);
      const seasonNumber = tvCount(season.season_number);
      const title = tvText(season.name);
      if (id === undefined || seasonNumber === null || !title) {
        return [];
      }
      return [
        {
          id,
          seasonNumber,
          title,
          description: tvText(season.overview),
          airDate: tvDate(season.air_date),
          episodeCount: tvCount(season.episode_count),
          ...this.poster(season.poster_path),
        },
      ];
    });
    const unique = new Map<number, TvSeasonSummary>();
    for (const season of seasons) {
      if (!unique.has(season.id)) {
        unique.set(season.id, season);
      }
    }
    return [...unique.values()].sort(
      (a, b) => a.seasonNumber - b.seasonNumber || a.id - b.id,
    );
  }
}
