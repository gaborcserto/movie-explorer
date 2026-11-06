import { TmdbRelatedTitles } from './tmdb-related-titles';
import { TmdbTransport } from './tmdb.transport';

describe('bounded source metadata enrichment', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  const config = {
    accessToken: 'offline-placeholder',
    apiBaseUrl: 'https://provider.invalid/3',
    imageBaseUrl: 'https://images.invalid',
    language: 'en-US',
    requestTimeoutMs: 8000,
  };

  const create = () =>
    new TmdbRelatedTitles(
      new TmdbTransport(config, { warn: jest.fn() }),
      config.imageBaseUrl,
    );

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = fetchMock;
    fetchMock.mockReset().mockImplementation(async (url: URL) =>
      url.pathname.endsWith('/similar') ||
      url.pathname.endsWith('/recommendations')
        ? Response.json({
            page: 1,
            total_pages: 1,
            total_results: 20,
            results: Array.from({ length: 20 }, (_, index) => ({
              id: index + 2,
              title: `Candidate ${index}`,
              name: `Candidate ${index}`,
              genre_ids: index === 19 ? [80, 18] : [35],
              vote_average: index === 19 ? 8.2 : 5.1,
              vote_count: 5000,
            })),
          })
        : Response.json({
            id: Number(url.pathname.split('/').pop()),
            genres: [{ id: 80 }, { id: 18 }],
            vote_average: 8.8,
            vote_count: 10000,
          }),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('ranks the whole bounded page, shares source lookups across kinds, and expires them', async () => {
    const related = create();
    const results = await Promise.all([
      related.find('movie', 1, 'similar'),
      related.find('movie', 1, 'recommendations'),
    ]);

    expect(results[0].results[0].id).toBe(21);
    expect(results[0].results).toHaveLength(10);
    expect(results[0].sourceSignals?.genreIds).toEqual([80, 18]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await related.find('movie', 1, 'similar');
    expect(fetchMock).toHaveBeenCalledTimes(4);

    await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
    await related.find('movie', 1, 'similar');
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('reuses primary details, isolates media identity, and bounds cache retention', async () => {
    const related = create();
    related.remember('movie', 1, { id: 1, genres: [{ id: 80 }] });
    await related.find('movie', 1, 'similar');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await related.find('tv', 1, 'similar');
    expect(fetchMock).toHaveBeenCalledTimes(3);

    for (let id = 2; id <= 102; id += 1) {
      related.remember('movie', id, { id, genres: [] });
    }
    await related.find('movie', 1, 'similar');
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('retains candidates on source timeout, discloses degradation and allows recovery', async () => {
    const related = create();
    const normalFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((url: URL, init: RequestInit) =>
      url.pathname.endsWith('/1')
        ? new Promise((_resolve, reject) =>
            init.signal?.addEventListener(
              'abort',
              () => reject(new Error('aborted')),
              { once: true },
            ),
          )
        : normalFetch?.(url, init),
    );
    const pending = related.find('movie', 1, 'similar', 6000);
    await jest.advanceTimersByTimeAsync(1500);
    const result = await pending;

    expect(result.availability).toBe('partial');
    expect(result.results).toHaveLength(10);
    expect(result.sourceSignals).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockImplementation(normalFetch);
    expect((await related.find('movie', 1, 'similar')).availability).toBe(
      'available',
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not cache malformed source bodies', async () => {
    const related = create();
    fetchMock.mockImplementation(async () =>
      Response.json({ page: 1, total_pages: 0, total_results: 0, results: [] }),
    );

    expect((await related.find('movie', 1, 'similar')).availability).toBe(
      'partial',
    );
    expect((await related.find('movie', 1, 'similar')).availability).toBe(
      'partial',
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
