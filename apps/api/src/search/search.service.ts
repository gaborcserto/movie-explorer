import { Inject, Injectable } from '@nestjs/common';
import type { SearchSuggestionsResponse } from '@movie-explorer/contracts';
import { MOVIE_PROVIDER, MovieProvider } from '../movies/movie-provider';

@Injectable()
export class SearchService {
  constructor(
    @Inject(MOVIE_PROVIDER) private readonly provider: MovieProvider,
  ) {}

  async suggestions(
    query: string,
    limit: number,
  ): Promise<SearchSuggestionsResponse> {
    const [movies, people] = await Promise.all([
      this.provider.findSuggestions(query, limit),
      this.provider.findPeople(query, 1),
    ]);
    return {
      suggestions: [
        ...movies.suggestions.map((movie) => ({
          ...movie,
          mediaType: 'movie' as const,
        })),
        ...people.people
          .slice(0, limit)
          .map((person) => ({ ...person, mediaType: 'person' as const })),
      ],
    };
  }
}
