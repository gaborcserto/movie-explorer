import {
  BadGatewayException,
  GatewayTimeoutException,
  NotFoundException,
} from '@nestjs/common';

import { TmdbMovieProvider } from './tmdb-movie.provider';
import { mapMovieCollection } from './tmdb-collection';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
  language: 'hu-HU',
};

const part = (id: number, release_date?: string) => ({
  id,
  title: `Movie ${id}`,
  release_date,
});

describe('TMDB movie collections', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('maps localized collection metadata, dates and images through the movie provider', async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          id: 1,
          belongs_to_collection: { id: 10, name: 'Fallback' },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: 10,
          name: 'Gyűjtemény',
          poster_path: '/poster.jpg',
          backdrop_path: '/backdrop.jpg',
          parts: [part(2, '2000-01-01')],
        }),
      );
    const result = await new TmdbMovieProvider(config).findCollection(1);

    expect(result).toMatchObject({
      collection: {
        id: 10,
        name: 'Gyűjtemény',
        posterUrl: `${config.imageBaseUrl}/poster.jpg`,
        backdropUrl: `${config.imageBaseUrl}/backdrop.jpg`,
      },
      availability: 'available',
      results: [{ id: 2, mediaType: 'movie', releaseDate: '2000-01-01' }],
    });
    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));
    expect(urls.map((url) => url.pathname)).toEqual([
      '/3/movie/1',
      '/3/collection/10',
    ]);
    expect(
      urls.every((url) => url.searchParams.get('language') === 'hu-HU'),
    ).toBe(true);
  });

  it.each([null, undefined])(
    'returns empty without a collection lookup for membership %s',
    async (belongs_to_collection) => {
      fetchMock.mockResolvedValue(
        Response.json({ id: 1, belongs_to_collection }),
      );
      await expect(
        new TmdbMovieProvider(config).findCollection(1),
      ).resolves.toEqual({
        collection: null,
        results: [],
        availability: 'available',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('excludes the current movie and duplicates, orders full dates chronologically and unknown dates by ID', () => {
    const result = mapMovieCollection(
      {
        id: 10,
        parts: [
          part(7),
          part(3, '2001-12-01'),
          part(4, '2001-02-01'),
          part(1, '1900-01-01'),
          part(4, '2001-02-01'),
          part(2, ''),
          part(6, 'invalid'),
          part(5, '2001-02-01'),
        ],
      },
      10,
      1,
      config.imageBaseUrl,
    );
    expect(result.results.map((movie) => movie.id)).toEqual([4, 5, 3, 2, 6, 7]);
    expect(result.results.every((movie) => movie.posterUrl === undefined)).toBe(
      true,
    );
    expect(result.availability).toBe('available');
  });

  it('retains usable parts and fallback names, skips adult/invalid entries, and reports partial availability', () => {
    const result = mapMovieCollection(
      {
        id: 10,
        parts: [
          part(2),
          { id: 3, title: '' },
          null,
          { ...part(4), adult: true },
          { ...part(5), media_type: 'tv' },
        ],
      },
      10,
      1,
      config.imageBaseUrl,
      'Fallback',
    );
    expect(result.results.map((movie) => movie.id)).toEqual([2]);
    expect(result.collection?.name).toBe('Fallback');
    expect(result.availability).toBe('partial');
  });

  it.each([
    { parts: [] },
    { parts: [part(1)] },
    { parts: [{ id: 2, title: '' }] },
  ])('handles empty or unusable parts %j', ({ parts }) => {
    expect(
      mapMovieCollection({ id: 10, parts }, 10, 1, config.imageBaseUrl).results,
    ).toEqual([]);
  });

  it('does not truncate larger collections to ten titles', () => {
    expect(
      mapMovieCollection(
        { id: 10, parts: Array.from({ length: 15 }, (_, i) => part(i + 2)) },
        10,
        1,
        config.imageBaseUrl,
      ).results,
    ).toHaveLength(15);
  });

  it.each([
    { id: 2 },
    { id: 1, belongs_to_collection: {} },
    { id: 1, belongs_to_collection: { id: -1 } },
  ])('rejects invalid movie membership %j', async (value) => {
    fetchMock.mockResolvedValue(Response.json(value));
    await expect(
      new TmdbMovieProvider(config).findCollection(1),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it.each([null, { id: 11, parts: [] }, { id: 10, parts: null }])(
    'classifies invalid collection envelopes %j',
    async (value) => {
      fetchMock
        .mockResolvedValueOnce(
          Response.json({ id: 1, belongs_to_collection: { id: 10 } }),
        )
        .mockResolvedValueOnce(Response.json(value));
      await expect(
        new TmdbMovieProvider(config).findCollection(1),
      ).rejects.toBeInstanceOf(BadGatewayException);
    },
  );

  it('distinguishes a missing movie from a stale collection reference', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(
      new TmdbMovieProvider(config).findCollection(1),
    ).rejects.toBeInstanceOf(NotFoundException);
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ id: 1, belongs_to_collection: { id: 10 } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(
      new TmdbMovieProvider(config).findCollection(1),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('preserves deadline failures without retrying', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, { signal }: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const load = new TmdbMovieProvider(config).findCollection(1);
    const assertion = expect(load).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
    await jest.advanceTimersByTimeAsync(3000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
