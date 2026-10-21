import type {
  CreditPerson,
  SeriesOrganization,
  SeasonSummary,
  SeriesDetails,
  SeasonDetails,
  EpisodeSummary,
  EpisodeCredits,
  EpisodeCastMember,
  EpisodeCrewMember,
} from '@movie-explorer/contracts';

import { TmdbImageMapper } from './tmdb-image.mapper';
import type {
  TmdbSeriesDetails,
  TmdbSeason,
  TmdbEpisode,
} from './tmdb-series.types';
import {
  seriesCount,
  seriesDate,
  seriesPositiveId,
  seriesRecord,
  seriesText,
} from './tmdb-series.validation';

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const record = seriesRecord(item);
        return record ? [record] : [];
      })
    : [];
}

export class TmdbSeriesMapper {
  private readonly images: TmdbImageMapper;

  constructor(imageBaseUrl: string) {
    this.images = new TmdbImageMapper(imageBaseUrl);
  }

  toSeriesDetails(series: TmdbSeriesDetails): SeriesDetails {
    const rating = series.vote_average;
    return {
      mediaType: 'tv',
      id: series.id,
      title: series.name.trim(),
      originalTitle: seriesText(series.original_name),
      firstAirDate: seriesDate(series.first_air_date),
      ...this.poster(series.poster_path),
      genres: records(series.genres).flatMap((genre) => {
        const name = seriesText(genre.name);
        return name ? [name] : [];
      }),
      description: seriesText(series.overview),
      originalLanguage: seriesText(series.original_language),
      status: seriesText(series.status),
      inProduction:
        typeof series.in_production === 'boolean' ? series.in_production : null,
      lastAirDate: seriesDate(series.last_air_date),
      seasonCount: seriesCount(series.number_of_seasons),
      episodeCount: seriesCount(series.number_of_episodes),
      episodeRuntimeMinutes: Array.isArray(series.episode_run_time)
        ? series.episode_run_time.filter(
            (value): value is number =>
              seriesCount(value) !== null && value > 0,
          )
        : [],
      rating:
        typeof rating === 'number' &&
        Number.isFinite(rating) &&
        rating >= 0 &&
        rating <= 10
          ? rating
          : null,
      voteCount: seriesCount(series.vote_count),
      originCountries: [
        ...new Set(
          Array.isArray(series.origin_country)
            ? series.origin_country.flatMap((value) => {
                const country = seriesText(value)?.toUpperCase();
                return country && /^[A-Z]{2}$/.test(country) ? [country] : [];
              })
            : [],
        ),
      ],
      backdropUrl:
        this.images.toImageUrl(seriesText(series.backdrop_path)) || null,
      creators: this.creators(series.created_by),
      networks: this.organizations(series.networks),
      productionCompanies: this.organizations(series.production_companies),
      seasons: this.seasons(series.seasons),
    };
  }

  toSeasonDetails(season: TmdbSeason, seriesId: number): SeasonDetails {
    const episodes = [
      ...new Map(
        season.episodes.map((episode) => [
          episode.id,
          this.toEpisodeSummary(episode, seriesId),
        ]),
      ).values(),
    ].sort((a, b) => a.episodeNumber - b.episodeNumber || a.id - b.id);
    return {
      id: season.id,
      seriesId,
      seasonNumber: season.season_number,
      title: season.name.trim(),
      description: seriesText(season.overview),
      airDate: seriesDate(season.air_date),
      ...this.poster(season.poster_path),
      episodeCount: episodes.length,
      episodes,
    };
  }

  toEpisodeSummary(episode: TmdbEpisode, seriesId: number): EpisodeSummary {
    const rating = episode.vote_average;
    const runtime = seriesCount(episode.runtime);
    return {
      id: episode.id,
      seriesId,
      seasonNumber: episode.season_number,
      episodeNumber: episode.episode_number,
      title: episode.name.trim(),
      description: seriesText(episode.overview),
      airDate: seriesDate(episode.air_date),
      runtimeMinutes: runtime !== null && runtime > 0 ? runtime : null,
      stillUrl: this.images.toImageUrl(seriesText(episode.still_path)) || null,
      rating:
        typeof rating === 'number' &&
        Number.isFinite(rating) &&
        rating >= 0 &&
        rating <= 10
          ? rating
          : null,
      voteCount: seriesCount(episode.vote_count),
    };
  }

  toEpisodeCredits(value: unknown, base?: TmdbEpisode): EpisodeCredits {
    const source = seriesRecord(value);
    const usable =
      source && source.success !== false && (!base || source.id === base.id);
    const cast = usable && Array.isArray(source.cast) ? source.cast : undefined;
    const guests =
      usable &&
      this.creditAvailability(source.guest_stars).status === 'available'
        ? source.guest_stars
        : base?.guest_stars;
    const crew =
      usable && this.creditAvailability(source.crew).status === 'available'
        ? source.crew
        : base?.crew;
    return {
      cast: this.episodeCast(cast),
      guestStars: this.episodeCast(guests),
      crew: this.episodeCrew(crew),
      sections: {
        cast: this.creditAvailability(cast),
        guestStars: this.creditAvailability(guests),
        crew: this.creditAvailability(crew),
      },
    };
  }

  private creditAvailability(
    value: unknown,
  ): EpisodeCredits['sections']['cast'] {
    return Array.isArray(value) &&
      value.every((item) => !!seriesText(seriesRecord(item)?.name))
      ? { status: 'available' }
      : { status: 'unavailable' };
  }

  private episodeCast(value: unknown): EpisodeCastMember[] {
    const people = new Map<string, EpisodeCastMember>();
    records(value).forEach((row, index) => {
      const name = seriesText(row.name);
      if (!name) {
        return;
      }
      const id = seriesPositiveId(row.id);
      const key = id === undefined ? `row-${index}` : `id-${id}`;
      const person = people.get(key) ?? {
        ...this.images.toPersonReference({
          id,
          name,
          profile_path: seriesText(row.profile_path),
        }),
        characters: [],
      };
      const character = seriesText(row.character);
      if (character && !person.characters.includes(character)) {
        person.characters.push(character);
      }
      people.set(key, person);
    });
    return [...people.values()];
  }

  private episodeCrew(value: unknown): EpisodeCrewMember[] {
    const people = new Map<string, EpisodeCrewMember>();
    records(value).forEach((row, index) => {
      const name = seriesText(row.name);
      if (!name) {
        return;
      }
      const id = seriesPositiveId(row.id);
      const department = seriesText(row.department);
      const key = `${id === undefined ? `row-${index}` : `id-${id}`}:${department}`;
      const person = people.get(key) ?? {
        ...this.images.toPersonReference({
          id,
          name,
          profile_path: seriesText(row.profile_path),
        }),
        department,
        jobs: [],
      };
      const job = seriesText(row.job);
      if (job && !person.jobs.includes(job)) {
        person.jobs.push(job);
      }
      people.set(key, person);
    });
    return [...people.values()];
  }

  private poster(value: unknown) {
    const path = seriesText(value);
    return {
      posterUrl: this.images.toImageUrl(path) || null,
      ...(path && { posterSrcSet: this.images.toPosterSrcSet(path) }),
    };
  }

  private creators(value: unknown): CreditPerson[] {
    return records(value).flatMap((person) => {
      const name = seriesText(person.name);
      if (!name) {
        return [];
      }
      return [
        this.images.toPersonReference({
          id: seriesPositiveId(person.id),
          name,
          profile_path: seriesText(person.profile_path),
        }),
      ];
    });
  }

  private organizations(value: unknown): SeriesOrganization[] {
    return records(value).flatMap((org) => {
      const id = seriesPositiveId(org.id);
      const name = seriesText(org.name);
      if (id === undefined || !name) {
        return [];
      }
      return [
        {
          id,
          name,
          logoUrl: this.images.toImageUrl(seriesText(org.logo_path)) || null,
          originCountry: seriesText(org.origin_country),
        },
      ];
    });
  }

  private seasons(value: unknown): SeasonSummary[] {
    const seasons = records(value).flatMap((season) => {
      const id = seriesPositiveId(season.id);
      const seasonNumber = seriesCount(season.season_number);
      const title = seriesText(season.name);
      if (id === undefined || seasonNumber === null || !title) {
        return [];
      }
      return [
        {
          id,
          seasonNumber,
          title,
          description: seriesText(season.overview),
          airDate: seriesDate(season.air_date),
          episodeCount: seriesCount(season.episode_count),
          ...this.poster(season.poster_path),
        },
      ];
    });
    const unique = new Map<number, SeasonSummary>();
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
