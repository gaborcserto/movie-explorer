import { HttpException, Inject, Injectable } from '@nestjs/common';
import type {
  SearchSuggestionsResponse,
  SectionAvailability,
} from '@movie-explorer/contracts';
import { MOVIE_PROVIDER, MovieProvider } from '../movies/movie-provider';

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
  ) {}

  async suggestions(
    query: string,
    limit: number,
  ): Promise<SearchSuggestionsResponse> {
    const [movies, people] = await Promise.allSettled([
      this.provider.findSuggestions(query, limit),
      this.provider.findPeople(query, 1),
    ]);

    if (movies.status === 'rejected' && people.status === 'rejected') {
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
      },
      suggestions: [
        ...(movies.status === 'fulfilled' ? movies.value.suggestions : []).map(
          (movie) => ({
            ...movie,
            mediaType: 'movie' as const,
          }),
        ),
        ...(people.status === 'fulfilled' ? people.value.people : [])
          .slice(0, limit)
          .map((person) => ({ ...person, mediaType: 'person' as const })),
      ],
    };
  }
}
