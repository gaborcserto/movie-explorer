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
    findWatchProviders: jest.fn(),
  };
  const searchProvider = { find: jest.fn() };
  const service = new SearchService(provider, searchProvider);

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

  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    'retains every successful autocomplete group in failure combination %s',
    async (failures) => {
      provider.findSuggestions.mockResolvedValue({
        suggestions: [{ id: 1, title: 'Movie' }],
      });
      provider.findPeople.mockResolvedValue({
        people: [{ id: 1, name: 'Person' }],
        page: 1,
        totalPages: 1,
        totalResults: 1,
      });
      searchProvider.find.mockResolvedValue({
        results: [{ id: 1, mediaType: 'tv', title: 'Series' }],
        page: 1,
        totalPages: 1,
        totalResults: 1,
      });
      if (failures & 1)
        provider.findSuggestions.mockRejectedValue(new BadGatewayException());
      if (failures & 2)
        searchProvider.find.mockRejectedValue(
          new HttpException({ retryAfter: 12 }, 429),
        );
      if (failures & 4)
        provider.findPeople.mockRejectedValue(new BadGatewayException());

      const request = service.suggestions('Query', 1, true);
      if (failures === 7) {
        await expect(request).rejects.toMatchObject({ status: 429 });
        return;
      }
      const response = await request;
      expect(response.suggestions.map((item) => item.mediaType)).toEqual(
        ['movie', 'tv', 'person'].filter(
          (_type, index) => !(failures & (1 << index)),
        ),
      );
      expect(response.groups.tv).toEqual(
        failures & 2
          ? { status: 'unavailable', retryAfterSeconds: 12 }
          : { status: 'available' },
      );
      expect(searchProvider.find).toHaveBeenCalledTimes(1);
    },
  );
});
