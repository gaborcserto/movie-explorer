import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type {
  SearchSuggestionsResponse,
  SectionAvailability,
  SearchType,
} from '@movie-explorer/contracts';
import { MOVIE_PROVIDER, MovieProvider } from '../movies/movie-provider';
import { SEARCH_PROVIDER, SearchProvider } from './search-provider';

function groupAvailability(
  result: PromiseSettledResult<unknown>,
): SectionAvailability {
  if (result.status === 'fulfilled') {
    return { status: 'available' };
  }

  const error: unknown = result.reason;

  if (error instanceof HttpException && error.getStatus() === 429) {
    const body = error.getResponse();

    if (
      typeof body === 'object' &&
      'retryAfter' in body &&
      typeof body.retryAfter === 'number' &&
      Number.isSafeInteger(body.retryAfter) &&
      body.retryAfter > 0 &&
      body.retryAfter <= 86400
    ) {
      return { status: 'unavailable', retryAfterSeconds: body.retryAfter };
    }
  }

  return { status: 'unavailable' };
}

@Injectable()
export class SearchService {
  constructor(
    @Inject(MOVIE_PROVIDER) private readonly provider: MovieProvider,
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: SearchProvider,
  ) {}

  find(query: string, type: SearchType, page: number, year?: number) {
    if (year !== undefined && (type === 'all' || type === 'person')) {
      throw new BadRequestException(
        'Year is only supported for Movies and Series',
      );
    }

    return this.searchProvider.find(query, type, page, year);
  }

  async suggestions(
    query: string,
    limit: number,
    includeSeries = false,
  ): Promise<SearchSuggestionsResponse> {
    const [movies, people, series] = await Promise.allSettled([
      this.provider.findSuggestions(query, limit),
      this.provider.findPeople(query, 1),
      ...(includeSeries ? [this.searchProvider.find(query, 'tv', 1)] : []),
    ]);

    if (
      movies.status === 'rejected' &&
      people.status === 'rejected' &&
      (!series || series.status === 'rejected')
    ) {
      if (
        series?.status === 'rejected' &&
        series.reason instanceof HttpException &&
        series.reason.getStatus() === 429
      ) {
        throw series.reason;
      }

      const personError: unknown = people.reason;

      if (
        personError instanceof HttpException &&
        personError.getStatus() === 429
      ) {
        throw personError;
      }

      throw movies.reason;
    }

    return {
      groups: {
        movie: groupAvailability(movies),
        person: groupAvailability(people),
        ...(series && { tv: groupAvailability(series) }),
      },
      suggestions: [
        ...(movies.status === 'fulfilled' ? movies.value.suggestions : []).map(
          (movie) => ({
            ...movie,
            mediaType: 'movie' as const,
          }),
        ),
        ...(series?.status === 'fulfilled'
          ? series.value.results
              .filter((item) => item.mediaType === 'tv')
              .slice(0, limit)
          : []),
        ...(people.status === 'fulfilled' ? people.value.people : [])
          .slice(0, limit)
          .map((person) => ({ ...person, mediaType: 'person' as const })),
      ],
    };
  }
}
