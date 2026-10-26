import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type {
  CombinedFilmography,
  CombinedFilmographyEntry,
  FilmographyMediaType,
  PersonDetails,
} from '@movie-explorer/contracts';

import type { PersonFilmographyProvider } from '../../persons/person-filmography-provider';
import { getTmdbConfig, TmdbConfig } from './tmdb.config';
import { TmdbTransport } from './tmdb.transport';
import {
  TmdbPersonMapper,
  isTmdbPersonProfile,
  isTmdbPersonMovieCredits,
} from './tmdb-person.mapper';
import { TmdbPersonFilmographyMapper } from './tmdb-person-filmography.mapper';
import { seriesRecord } from './tmdb-series.validation';

@Injectable()
export class TmdbPersonFilmographyProvider implements PersonFilmographyProvider {
  private readonly transport: TmdbTransport;
  private readonly people: TmdbPersonMapper;
  private readonly filmography: TmdbPersonFilmographyMapper;

  constructor(config: TmdbConfig = getTmdbConfig()) {
    this.transport = new TmdbTransport(
      config,
      new Logger(TmdbPersonFilmographyProvider.name),
    );
    this.people = new TmdbPersonMapper(config.imageBaseUrl);
    this.filmography = new TmdbPersonFilmographyMapper(config.imageBaseUrl);
  }

  async findPerson(id: number): Promise<PersonDetails | undefined> {
    // One compound request, no automatic atomic fallback or per-title lookups.
    const body = await this.transport.request({
      path: `/person/${id}`,
      query: { append_to_response: 'movie_credits,tv_credits,images' },
      operation: 'person-combined-details',
      allowNotFound: true,
      validateBody: (value) => {
        if (!isTmdbPersonProfile(value) || value.id !== id) {
          throw new Error('Invalid person');
        }
      },
    });

    if (body === undefined) {
      return undefined;
    }

    if (!isTmdbPersonProfile(body)) {
      throw new BadGatewayException('Invalid person response');
    }

    const source = seriesRecord(body);
    const combinedFilmography: CombinedFilmography = {
      entries: [],
      groups: {},
    };

    for (const type of ['movie', 'tv'] as const) {
      const credits = source[`${type}_credits`];

      if (isTmdbPersonMovieCredits(credits)) {
        combinedFilmography.entries.push(...this.map(credits, type));
        combinedFilmography.groups[type] = { status: 'available' };
      } else {
        combinedFilmography.groups[type] = { status: 'unavailable' };
      }
    }

    return {
      ...this.people.toPersonProfile(body),
      filmography: isTmdbPersonMovieCredits(source.movie_credits)
        ? this.people.toFilmography(source.movie_credits)
        : [],
      filmographyAvailability: combinedFilmography.groups.movie,
      combinedFilmography,
    };
  }

  async findCombined(
    id: number,
    mediaType: FilmographyMediaType,
  ): Promise<CombinedFilmography | undefined> {
    const types: ('movie' | 'tv')[] =
      mediaType === 'all' ? ['movie', 'tv'] : [mediaType];
    const results = await Promise.allSettled(
      types.map(async (type) => {
        const body = await this.transport.request({
          path: `/person/${id}/${type}_credits`,
          operation: `person-${type}-filmography`,
          allowNotFound: true,
          validateBody: (value) => {
            const row = seriesRecord(value);

            if (!row || row.id !== id || !isTmdbPersonMovieCredits(row)) {
              throw new Error('Invalid person credits');
            }
          },
        });

        return body === undefined ? undefined : this.map(body, type);
      }),
    );
    const response: CombinedFilmography = { entries: [], groups: {} };
    results.forEach((result, index) => {
      const type = types[index];

      if (result.status === 'fulfilled' && result.value !== undefined) {
        response.entries.push(...result.value);
        response.groups[type] = { status: 'available' };
      } else {
        const retry =
          result.status === 'rejected'
            ? this.retryAfter(result.reason)
            : undefined;
        response.groups[type] = {
          status: 'unavailable',
          ...(retry && { retryAfterSeconds: retry }),
        };
      }
    });
    if (
      !Object.values(response.groups).some(
        (group) => group.status === 'available',
      )
    ) {
      const failures = results.flatMap((result) =>
        result.status === 'rejected' ? [result.reason as unknown] : [],
      );

      if (!failures.length) {
        return undefined;
      }
      // Preserve actionable rate limiting before other upstream failures.
      throw (
        failures.find(
          (failure) =>
            failure instanceof HttpException && failure.getStatus() === 429,
        ) ?? failures[0]
      );
    }

    return response;
  }

  private map(
    value: unknown,
    type: 'movie' | 'tv',
  ): CombinedFilmographyEntry[] {
    if (!isTmdbPersonMovieCredits(value)) {
      throw new BadGatewayException('Invalid filmography response');
    }

    return type === 'movie'
      ? this.people
          .toFilmography(value)
          .map((entry) => ({ ...entry, mediaType: 'movie' as const }))
      : this.filmography.series(value);
  }

  private retryAfter(error: unknown): number | undefined {
    const response =
      error instanceof HttpException
        ? seriesRecord(error.getResponse())
        : undefined;

    return typeof response?.retryAfter === 'number'
      ? response.retryAfter
      : undefined;
  }
}
