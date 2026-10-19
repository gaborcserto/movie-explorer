import { BadGatewayException, HttpException } from '@nestjs/common';
import type { MovieProvider } from '../movies/movie-provider';
import { SearchService } from './search.service';

describe('independent autocomplete groups', () => {
  const provider: jest.Mocked<MovieProvider> = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findPerson: jest.fn(),
    findPeople: jest.fn(),
    findSuggestions: jest.fn(),
    findMovieSection: jest.fn(),
    findFilmography: jest.fn(),
  };
  const service = new SearchService(provider);

  beforeEach(() => jest.resetAllMocks());

  it.each(['movie', 'person', 'neither'] as const)(
    'retains successful groups when %s fails',
    async (failure) => {
      provider.findSuggestions.mockResolvedValue({
        suggestions: [{ id: 1, title: 'Movie' }],
      });
      provider.findPeople.mockResolvedValue({
        people: [{ id: 2, name: 'Person' }],
        page: 1,
        totalPages: 1,
        totalResults: 1,
      });
      if (failure === 'movie') {
        provider.findSuggestions.mockRejectedValue(new BadGatewayException());
      }
      if (failure === 'person') {
        provider.findPeople.mockRejectedValue(new BadGatewayException());
      }

      const result = await service.suggestions('query', 6);
      expect(result.suggestions.map((item) => item.mediaType)).toEqual(
        failure === 'movie'
          ? ['person']
          : failure === 'person'
            ? ['movie']
            : ['movie', 'person'],
      );
      expect(result.groups).toEqual({
        movie: { status: failure === 'movie' ? 'unavailable' : 'available' },
        person: { status: failure === 'person' ? 'unavailable' : 'available' },
      });
    },
  );

  it('distinguishes a successful empty movie group from a failed person group', async () => {
    provider.findSuggestions.mockResolvedValue({ suggestions: [] });
    provider.findPeople.mockRejectedValue(new BadGatewayException());
    await expect(service.suggestions('query', 6)).resolves.toEqual({
      suggestions: [],
      groups: {
        movie: { status: 'available' },
        person: { status: 'unavailable' },
      },
    });
  });

  it('preserves the classified error when both groups fail', async () => {
    provider.findSuggestions.mockRejectedValue(
      new HttpException('Safe rate limit', 429),
    );
    provider.findPeople.mockRejectedValue(new BadGatewayException());
    await expect(service.suggestions('query', 6)).rejects.toMatchObject({
      status: 429,
    });
  });

  it('retains a safe rate-limit delay for an unavailable group', async () => {
    provider.findSuggestions.mockResolvedValue({ suggestions: [] });
    provider.findPeople.mockRejectedValue(
      new HttpException({ retryAfter: 15 }, 429),
    );
    await expect(service.suggestions('query', 6)).resolves.toMatchObject({
      groups: { person: { status: 'unavailable', retryAfterSeconds: 15 } },
    });
  });

  it('keeps rate limits meaningful when the other failure is a gateway error', async () => {
    provider.findSuggestions.mockRejectedValue(new BadGatewayException());
    provider.findPeople.mockRejectedValue(
      new HttpException('Safe rate limit', 429),
    );
    await expect(service.suggestions('query', 6)).rejects.toMatchObject({
      status: 429,
    });
  });
});
