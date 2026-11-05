import { GatewayTimeoutException, Logger } from '@nestjs/common';

import { MoviesService } from '../../movies/movies.service';
import { TmdbMovieProvider } from './tmdb-movie.provider';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://provider.invalid/3',
  imageBaseUrl: 'https://images.invalid/w500',
  language: 'en-US',
};

const movie = (id: number, collectionId: number | null = 10) => ({
  id,
  title: `Movie ${id}`,
  overview: 'Overview',
  genres: [],
  runtime: 100,
  poster_path: null,
  vote_average: 8,
  belongs_to_collection: collectionId === null ? null : { id: collectionId },
});

const collection = (id = 10) => ({
  id,
  name: 'Collection',
  parts: [movie(1), movie(2), movie(3)],
});

describe('bounded collection enrichment', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    global.fetch = fetchMock;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    fetchMock.mockImplementation(async (url: URL) =>
      Response.json(
        url.pathname.includes('/collection/')
          ? collection()
          : movie(Number(url.pathname.split('/').pop())),
      ),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('coalesces cold identical requests, serves warm hits, and expires both caches', async () => {
    const provider = new TmdbMovieProvider(config);
    const [first, second] = await Promise.all([
      provider.findCollection(1),
      provider.findCollection(1),
    ]);

    expect(first).toEqual(second);
    expect(first.results.map(({ id }) => id)).toEqual([2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await expect(provider.findCollection(1)).resolves.toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(30 * 60 * 1000);
    await provider.findCollection(1);

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('reuses detail metadata and a shared collection while excluding each current movie', async () => {
    const provider = new TmdbMovieProvider(config);
    await Promise.all([provider.findOne(1), provider.findOne(2)]);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [first, second] = await Promise.all([
      provider.findCollection(1),
      provider.findCollection(2),
    ]);

    expect(first.results.map(({ id }) => id)).toEqual([2, 3]);
    expect(second.results.map(({ id }) => id)).toEqual([1, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/collection/'),
      ),
    ).toHaveLength(1);
  });

  it('uses three upstream calls after details and two on a warm Similar request, preserving source order', async () => {
    fetchMock.mockImplementation(async (url: URL) => {
      if (
        url.pathname.endsWith('/recommendations') ||
        url.pathname.endsWith('/similar')
      ) {
        return Response.json({
          page: 1,
          total_pages: 1,
          total_results: 3,
          results: url.pathname.endsWith('/recommendations')
            ? [movie(3), movie(4), movie(1)]
            : [movie(4), movie(5), movie(2)],
        });
      }

      return Response.json(
        url.pathname.includes('/collection/') ? collection() : movie(1),
      );
    });
    const provider = new TmdbMovieProvider(config);
    const service = new MoviesService(provider);
    await provider.findOne(1);
    const first = await service.findRelated(1, 'similar');

    expect(first.results.map(({ id }) => id)).toEqual([2, 3, 4, 5]);
    expect(first.availability).toBe('available');
    expect(fetchMock).toHaveBeenCalledTimes(4);

    await expect(service.findRelated(1, 'similar')).resolves.toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('remembers confirmed absence from details but does not trust omitted or malformed references', async () => {
    const provider = new TmdbMovieProvider(config);
    fetchMock.mockResolvedValueOnce(Response.json(movie(1, null)));
    await provider.findOne(1);

    await expect(provider.findCollection(1)).resolves.toMatchObject({
      collection: null,
      results: [],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    for (const reference of [undefined, { id: -1 }]) {
      fetchMock.mockResolvedValueOnce(
        Response.json({ ...movie(2), belongs_to_collection: reference }),
      );
      await provider.findOne(2);
      await provider.findCollection(2);
    }
    // First lookup supplies the authoritative reference; subsequent details do not erase it.
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('isolates language, region and image configuration across provider instances', async () => {
    const english = new TmdbMovieProvider(config);
    const localized = new TmdbMovieProvider({
      ...config,
      language: 'hu-HU',
      region: 'HU',
      imageBaseUrl: 'https://other.invalid/w500',
    });
    await english.findCollection(1);
    await localized.findCollection(1);
    await english.findCollection(1);
    await localized.findCollection(1);

    expect(fetchMock).toHaveBeenCalledTimes(4);

    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));

    expect(urls.map((url) => url.searchParams.get('language'))).toEqual([
      'en-US',
      'en-US',
      'hu-HU',
      'hu-HU',
    ]);
    expect(
      urls.slice(2).every((url) => url.searchParams.get('region') === 'HU'),
    ).toBe(true);
  });

  it('retries failed and partial collections instead of caching them', async () => {
    const provider = new TmdbMovieProvider(config);
    await provider.findOne(1);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

    await expect(provider.findCollection(1)).rejects.toThrow(
      'Movie provider request failed',
    );

    fetchMock.mockResolvedValueOnce(
      Response.json({ ...collection(), parts: [movie(2), null] }),
    );

    await expect(provider.findCollection(1)).resolves.toMatchObject({
      availability: 'partial',
    });
    await expect(provider.findCollection(1)).resolves.toMatchObject({
      availability: 'available',
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('evicts old collection entries at capacity without losing reusable references', async () => {
    const provider = new TmdbMovieProvider(config);
    fetchMock.mockImplementation(async (url: URL) => {
      const id = Number(url.pathname.split('/').pop());

      return Response.json(
        url.pathname.includes('/collection/') ? collection(id) : movie(id, id),
      );
    });

    for (let id = 1; id <= 101; id += 1) {
      await provider.findCollection(id);
    }

    expect(fetchMock).toHaveBeenCalledTimes(202);

    await provider.findCollection(101);

    expect(fetchMock).toHaveBeenCalledTimes(202);

    await provider.findCollection(1);

    expect(fetchMock).toHaveBeenCalledTimes(203);
  });

  it('bounds reference storage and caches negative membership', async () => {
    const provider = new TmdbMovieProvider(config);
    fetchMock.mockImplementation(async (url: URL) =>
      Response.json(movie(Number(url.pathname.split('/').pop()), null)),
    );

    for (let id = 1; id <= 501; id += 1) {
      await provider.findCollection(id);
    }
    await provider.findCollection(501);

    expect(fetchMock).toHaveBeenCalledTimes(501);

    await provider.findCollection(1);

    expect(fetchMock).toHaveBeenCalledTimes(502);
  });

  it('applies a total three-second budget across reference and collection, retaining other sources', async () => {
    const provider = new TmdbMovieProvider(config);
    const aborted: string[] = [];
    fetchMock.mockImplementation(
      (url: URL, { signal }: RequestInit) =>
        new Promise((resolve, reject) => {
          const reference = url.pathname === '/3/movie/1';
          const isCollection = url.pathname.includes('/collection/');
          const timer = setTimeout(
            () =>
              resolve(
                Response.json(
                  reference
                    ? movie(1)
                    : isCollection
                      ? collection()
                      : {
                          page: 1,
                          total_pages: 1,
                          total_results: 2,
                          results: url.pathname.endsWith('/recommendations')
                            ? [movie(2), movie(3)]
                            : [movie(3), movie(4), movie(1)],
                        },
                ),
              ),
            reference ? 1000 : isCollection ? 2500 : 100,
          );
          signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            if (isCollection) {
              aborted.push(url.pathname);
            }
            reject(new Error('aborted'));
          });
        }),
    );

    const start = Date.now();
    const pending = new MoviesService(provider).findRelated(1, 'similar');
    await jest.advanceTimersByTimeAsync(2999);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    const result = await pending;

    expect(Date.now() - start).toBe(3000);
    expect(result).toMatchObject({ availability: 'partial' });
    expect(result.results.map(({ id }) => id)).toEqual([2, 3, 4]);
    expect(aborted).toEqual(['/3/collection/10']);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('aborts a stalled reference at the same budget without issuing a collection request', async () => {
    fetchMock.mockImplementation(
      (_url, { signal }: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const pending = new TmdbMovieProvider(config).findCollection(1);
    const assertion = expect(pending).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
    await jest.advanceTimersByTimeAsync(3000);
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('bounds an older caller waiting on a shared collection without cancelling a newer caller', async () => {
    const provider = new TmdbMovieProvider(config);
    fetchMock.mockImplementation(
      (url: URL) =>
        new Promise((resolve) => {
          const isCollection = url.pathname.includes('/collection/');
          const id = Number(url.pathname.split('/').pop());
          setTimeout(
            () =>
              resolve(Response.json(isCollection ? collection() : movie(id))),
            isCollection ? 2500 : id === 1 ? 2000 : 0,
          );
        }),
    );

    const older = provider.findCollection(1);
    const olderAssertion = expect(older).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
    await jest.advanceTimersByTimeAsync(1000);
    const newer = provider.findCollection(2);
    await jest.advanceTimersByTimeAsync(2000);
    await olderAssertion;
    await jest.advanceTimersByTimeAsync(500);

    await expect(newer).resolves.toMatchObject({ availability: 'available' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(jest.getTimerCount()).toBe(0);
  });
});
