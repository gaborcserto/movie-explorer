import { HttpException, Injectable } from '@nestjs/common';
import type {
  ImdbRatingResponse,
  RatingResult,
  Ratings,
} from '@movie-explorer/contracts';

import { TmdbExternalIds } from '../integrations/tmdb/tmdb-external-ids';
import { OmdbAdapter } from '../integrations/omdb/omdb.adapter';

@Injectable()
export class RatingsService {
  constructor(
    private readonly ids: TmdbExternalIds,
    private readonly omdb: OmdbAdapter,
  ) {}

  async findImdb(
    kind: 'movie' | 'series',
    id: number,
  ): Promise<ImdbRatingResponse> {
    if (!this.omdb.enabled) {
      return { imdb: null };
    }

    try {
      const imdbId = await this.ids.resolve(kind, id);
      const result = imdbId
        ? await this.omdb.findRating(imdbId, kind)
        : { status: 'missing' as const };

      return {
        imdb:
          result.status === 'available'
            ? { score: result.score, voteCount: result.voteCount }
            : null,
      };
    } catch {
      // Optional upstream data must never break the primary Details resource.
      return { imdb: null };
    }
  }

  async findRatings(
    kind: 'movie' | 'series',
    id: number,
    tmdb: RatingResult,
  ): Promise<Ratings> {
    let imdb: RatingResult;

    if (!this.omdb.enabled) {
      imdb = { status: 'unavailable', reason: 'not-configured' };
    } else {
      try {
        const imdbId = await this.ids.resolve(kind, id);

        if (imdbId) {
          imdb = await this.omdb.findRating(imdbId, kind);
        } else {
          imdb = { status: 'missing' };
        }
      } catch (error) {
        imdb = {
          status: 'unavailable',
          reason: this.failureReason(error),
        };
      }
    }

    return { tmdb, imdb };
  }

  private failureReason(
    error: unknown,
  ): 'timeout' | 'invalid-response' | 'upstream-error' {
    if (!(error instanceof HttpException)) {
      return 'upstream-error';
    }

    if (error.getStatus() === 504) {
      return 'timeout';
    }

    if (error.message === 'Movie provider response was invalid') {
      return 'invalid-response';
    }

    return 'upstream-error';
  }
}
