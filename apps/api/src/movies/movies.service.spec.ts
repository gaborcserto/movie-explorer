import type {
  MovieDetails,
  MovieListResponse,
} from '@movie-explorer/contracts';
import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';

import { MovieProvider } from './movie-provider';
import { MoviesService } from './movies.service';

const moviesResponse: MovieListResponse = {
  movies: [
    {
      id: 1,
      title: 'Alpha',
      releaseDate: '2020-01-01',
      posterUrl: 'https://example.com/posters/alpha.jpg',
      genres: ['Drama', 'Comedy'],
    },
  ],
  page: 1,
  totalPages: 1,
  totalResults: 1,
};

const movieDetails: MovieDetails = {
  ...moviesResponse.movies[0],
  cast: ['Actor One'],
  rating: 8,
  runtimeMinutes: 100,
  description: 'Alpha overview',
};

describe('MoviesService', () => {
  let service: MoviesService;
  let movieProvider: jest.Mocked<Required<MovieProvider>>;

  beforeEach(() => {
    movieProvider = {
      findAll: jest.fn(),
      findRelated: jest.fn(),
      findCollection: jest.fn(),
      findSuggestions: jest.fn(),
      findOne: jest.fn(),
      findRatings: jest.fn(),
      findPerson: jest.fn(),
      findPeople: jest.fn(),
      findMovieSection: jest.fn(),
      findFilmography: jest.fn(),
      findWatchProviders: jest.fn(),
    };
    service = new MoviesService(movieProvider);
  });

  const title = (id: number) => ({
    mediaType: 'movie' as const,
    id,
    title: `Movie ${id}`,
  });

  it('merges chronological collection members before recommended and similar titles', async () => {
    movieProvider.findCollection.mockResolvedValue({
      collection: { id: 10 },
      availability: 'available',
      results: [
        { ...title(2), releaseDate: '2000-01-01' },
        { ...title(3), releaseDate: '2010-01-01' },
      ],
    });
    movieProvider.findRelated.mockImplementation(async (_id, kind) => ({
      availability: 'available',
      results:
        kind === 'recommendations'
          ? [title(3), title(4), title(1)]
          : [title(2), title(5), title(4)],
    }));

    const result = await service.findRelated(1, 'similar');

    expect(result.results.map(({ id }) => id)).toEqual([2, 3, 4, 5]);
    expect(result.availability).toBe('available');
  });

  it.each([null, { id: 10 }])(
    'preserves recommendations for an empty collection %j',
    async (collection) => {
      movieProvider.findCollection.mockResolvedValue({
        collection,
        results: [],
        availability: 'available',
      });
      movieProvider.findRelated.mockResolvedValue({
        results: [title(2)],
        availability: 'available',
      });

      await expect(service.findRelated(1, 'similar')).resolves.toEqual({
        results: [title(2)],
        availability: 'available',
      });
    },
  );

  it('falls back on collection failure and limits only after merging', async () => {
    movieProvider.findCollection.mockRejectedValue(new BadGatewayException());
    movieProvider.findRelated.mockResolvedValue({
      results: [title(2)],
      availability: 'available',
    });

    await expect(service.findRelated(1, 'similar')).resolves.toEqual({
      results: [title(2)],
      availability: 'partial',
    });

    movieProvider.findCollection.mockResolvedValue({
      collection: { id: 10 },
      results: Array.from({ length: 15 }, (_, i) => title(i + 20)),
      availability: 'available',
    });
    const result = await service.findRelated(1, 'similar');

    expect(result.results.map(({ id }) => id)).toEqual(
      Array.from({ length: 10 }, (_, i) => i + 20),
    );
  });

  it('keeps direct recommendations independent of collections', async () => {
    movieProvider.findRelated.mockResolvedValue({
      results: [],
      availability: 'available',
    });
    await service.findRelated(1, 'recommendations');

    expect(movieProvider.findCollection).not.toHaveBeenCalled();
  });

  it('retains Fellowship of the Ring collection entries despite a large synthetic rating gap', async () => {
    movieProvider.findCollection.mockResolvedValue({
      collection: { id: 119 },
      availability: 'available',
      results: [{ ...title(2), title: 'The Two Towers', rating: 5.1 }],
    });
    movieProvider.findRelated.mockResolvedValue({
      results: [
        { ...title(3), title: 'Unrelated acclaimed film', rating: 9.1 },
      ],
      availability: 'available',
      scores: new Map([[3, 0.99]]),
      sourceSignals: { rating: 8.8, genreIds: [12, 14] },
    });

    const result = await service.findRelated(1, 'similar');

    expect(result.results.map(({ id }) => id)).toEqual([2, 3]);
    expect(Object.keys(result).sort()).toEqual(['availability', 'results']);
    expect(JSON.stringify(result)).not.toMatch(/scores|sourceSignals|genreIds/);
  });

  it('compares ranked Similar and Recommendations together after collection priority', async () => {
    movieProvider.findCollection.mockResolvedValue({
      collection: null,
      results: [],
      availability: 'available',
    });
    movieProvider.findRelated.mockImplementation(async (_id, kind) =>
      kind === 'similar'
        ? {
            results: [title(3)],
            availability: 'available',
            scores: new Map([[3, 0.9]]),
          }
        : {
            results: [title(2)],
            availability: 'available',
            scores: new Map([[2, 0.4]]),
          },
    );

    expect(
      (await service.findRelated(1, 'similar')).results.map(({ id }) => id),
    ).toEqual([3, 2]);
    expect(
      Object.keys(await service.findRelated(1, 'recommendations')).sort(),
    ).toEqual(['availability', 'results']);
  });

  it('returns movies from the configured provider using query filters', async () => {
    const query = {
      search: 'Alpha',
      genre: ['Drama'],
      sort: 'rating' as const,
      sortOrder: 'desc' as const,
      page: 1,
    };
    movieProvider.findAll.mockResolvedValue(moviesResponse);

    await expect(service.findAll(query)).resolves.toBe(moviesResponse);
    expect(movieProvider.findAll).toHaveBeenCalledWith(query);
  });

  it('finds one movie through the configured provider', async () => {
    movieProvider.findOne.mockResolvedValue(movieDetails);

    await expect(service.findOne(1)).resolves.toBe(movieDetails);
    expect(movieProvider.findOne).toHaveBeenCalledWith(1);
  });

  it('returns undefined when the configured provider cannot find a movie', async () => {
    movieProvider.findOne.mockResolvedValue(undefined);

    await expect(service.findOne(999)).resolves.toBeUndefined();
  });

  it.each([
    [new GatewayTimeoutException(), 'timeout'],
    [
      new BadGatewayException('Movie provider response was invalid'),
      'invalid-response',
    ],
    [new BadGatewayException('provider failure'), 'upstream-error'],
    [new Error('provider failure'), 'upstream-error'],
    [{ unexpected: true }, 'upstream-error'],
  ] as const)(
    'classifies a rating provider failure as %s',
    async (error, reason) => {
      movieProvider.findRatings?.mockRejectedValue(error);

      await expect(service.findRatings(1)).resolves.toEqual({
        tmdb: { status: 'unavailable', reason },
        imdb: { status: 'unavailable', reason: 'not-configured' },
      });
    },
  );

  it('preserves available, unavailable, missing and missing-resource rating outcomes', async () => {
    movieProvider.findRatings?.mockResolvedValueOnce({
      status: 'available',
      score: 8,
      voteCount: 10,
    });

    await expect(service.findRatings(1)).resolves.toMatchObject({
      tmdb: { status: 'available', score: 8 },
    });

    movieProvider.findRatings?.mockResolvedValueOnce({
      status: 'unavailable',
      reason: 'upstream-error',
    });

    await expect(service.findRatings(1)).resolves.toMatchObject({
      tmdb: { status: 'unavailable', reason: 'upstream-error' },
    });

    movieProvider.findRatings?.mockResolvedValueOnce({ status: 'missing' });

    await expect(service.findRatings(1)).resolves.toMatchObject({
      tmdb: { status: 'missing' },
    });

    movieProvider.findRatings?.mockResolvedValueOnce(undefined);

    await expect(service.findRatings(1)).resolves.toBeUndefined();
  });
});
