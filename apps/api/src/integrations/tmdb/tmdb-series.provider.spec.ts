import { Logger } from '@nestjs/common';

import { TmdbSeriesProvider } from './tmdb-series.provider';
import { minimalSeriesDetails } from '../../../test/fixtures/series';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://api.example/3',
  imageBaseUrl: 'https://images.example/w500',
  language: 'hu-HU',
  region: 'HU',
  requestTimeoutMs: 50,
};

describe('TmdbSeriesProvider', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  let provider: TmdbSeriesProvider;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    provider = new TmdbSeriesProvider(config);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('makes exactly one authenticated localized details request with aggregate credits', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 1399, name: 'Series' }));
    await expect(provider.findOne(1399)).resolves.toEqual({
      ...minimalSeriesDetails,
      images: {
        posters: [],
        backdrops: [],
        sections: {
          posters: { status: 'unavailable' },
          backdrops: { status: 'unavailable' },
        },
      },
      videos: { videos: [], availability: { status: 'unavailable' } },
      credits: {
        cast: [],
        crew: [],
        sections: {
          cast: { status: 'unavailable' },
          crew: { status: 'unavailable' },
        },
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init]: [URL, RequestInit] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe('/3/tv/1399');
    expect(url.searchParams.get('append_to_response')).toBe(
      'aggregate_credits,images,videos',
    );
    expect(url.searchParams.get('include_image_language')).toBe('hu,en,null');
    expect(init.headers).toEqual({
      accept: 'application/json',
      Authorization: 'Bearer test-token',
    });
    expect(init.signal.aborted).toBe(true);
  });

  it('uses default locale and no region when not configured', async () => {
    provider = new TmdbSeriesProvider({
      ...config,
      region: undefined,
      language: 'en-US',
    });
    fetchMock.mockResolvedValue(Response.json({ id: 1, name: 'Series' }));
    await provider.findOne(1);
    expect(fetchMock.mock.calls[0][0].searchParams.get('language')).toBe(
      'en-US',
    );
    expect(
      fetchMock.mock.calls[0][0].searchParams.get('include_video_language'),
    ).toBe('en,null');
  });

  it('maps embedded and standalone aggregate credits identically with localized recovery', async () => {
    const aggregate = { id: 1, cast: [], crew: [] };
    fetchMock.mockResolvedValueOnce(
      Response.json({ id: 1, name: 'Series', aggregate_credits: aggregate }),
    );
    const details = await provider.findOne(1);
    fetchMock.mockResolvedValueOnce(Response.json(aggregate));
    await expect(provider.findCredits(1)).resolves.toEqual(details.credits);
    expect(fetchMock.mock.calls[1][0].pathname).toBe(
      '/3/tv/1/aggregate_credits',
    );
    expect(fetchMock.mock.calls[1][0].searchParams.get('language')).toBe(
      'hu-HU',
    );
    fetchMock.mockResolvedValueOnce(
      Response.json({ id: 2, cast: [], crew: [] }),
    );
    await expect(provider.findCredits(1)).rejects.toMatchObject({
      status: 502,
    });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(provider.findCredits(1)).resolves.toBeUndefined();
  });

  it.each(['images', 'videos'] as const)(
    'maps appended and standalone %s with identical language union',
    async (section) => {
      const media = {
        id: 1,
        posters: [{ file_path: '/p.jpg', iso_639_1: null }],
        backdrops: [],
        results: [],
      };
      fetchMock.mockResolvedValueOnce(
        Response.json({ id: 1, name: 'Series', [section]: media }),
      );
      const details = await provider.findOne(1);
      fetchMock.mockResolvedValueOnce(Response.json(media));
      const recovered =
        section === 'images'
          ? await provider.findImages(1)
          : await provider.findVideos(1);
      expect(recovered).toEqual(details[section]);
      expect(
        fetchMock.mock.calls[1][0].searchParams.get('include_image_language'),
      ).toBe('hu,en,null');
      expect(fetchMock.mock.calls[1][0].pathname).toBe(`/3/tv/1/${section}`);
    },
  );

  it.each(['findCredits', 'findImages', 'findVideos'] as const)(
    'preserves %s failure classification, 404 and timeout without retries',
    async (method) => {
      for (const [upstream, expected] of [
        [404, undefined],
        [429, 429],
        [500, 502],
      ]) {
        fetchMock.mockResolvedValueOnce(
          new Response(null, { status: upstream }),
        );
        if (expected === undefined) {
          await expect(provider[method](1)).resolves.toBeUndefined();
        } else {
          await expect(provider[method](1)).rejects.toMatchObject({
            status: expected,
          });
        }
      }
      fetchMock.mockResolvedValueOnce(Response.json({ id: 2 }));
      await expect(provider[method](1)).rejects.toMatchObject({ status: 502 });
      jest.useFakeTimers();
      fetchMock.mockImplementationOnce(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () =>
              reject(new Error('aborted')),
            );
          }),
      );
      const pending = expect(provider[method](1)).rejects.toMatchObject({
        status: 504,
      });
      await jest.advanceTimersByTimeAsync(51);
      await pending;
      expect(jest.getTimerCount()).toBe(0);
      expect(fetchMock).toHaveBeenCalledTimes(5);
    },
  );

  it('accepts real appended namespaces without IDs but rejects conflicting section identities', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        id: 1,
        name: 'Series',
        aggregate_credits: { cast: [], crew: [] },
        images: { posters: [], backdrops: [] },
        videos: { results: [] },
      }),
    );
    const result = await provider.findOne(1);
    expect(result.credits.sections.cast.status).toBe('available');
    expect(result.images.sections.posters.status).toBe('available');
    expect(result.videos.availability.status).toBe('available');
    fetchMock.mockResolvedValueOnce(
      Response.json({
        id: 1,
        name: 'Series',
        aggregate_credits: { id: 2, cast: [], crew: [] },
        images: { id: 2, posters: [], backdrops: [] },
        videos: { success: false, results: [] },
      }),
    );
    const invalid = await provider.findOne(1);
    expect(invalid.credits.sections.cast.status).toBe('unavailable');
    expect(invalid.images.sections.posters.status).toBe('unavailable');
    expect(invalid.videos.availability.status).toBe('unavailable');
  });

  it('does not cache series responses', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 1, name: 'Series' }));
    await provider.findOne(1);
    fetchMock.mockResolvedValue(Response.json({ id: 1, name: 'Updated' }));
    await expect(provider.findOne(1)).resolves.toMatchObject({
      title: 'Updated',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns undefined for a missing series without fallback', async () => {
    fetchMock.mockResolvedValue(
      new Response('private upstream body', { status: 404 }),
    );
    await expect(provider.findOne(1)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 500, 503])(
    'normalizes upstream %s without exposing details',
    async (status) => {
      fetchMock.mockResolvedValue(
        new Response('private upstream body', { status }),
      );
      await expect(provider.findOne(1)).rejects.toMatchObject({
        status: 502,
        message: 'Movie provider request failed',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith({
        operation: 'series-details',
        failure: 'http',
        upstreamStatus: status,
        applicationStatus: 502,
      });
      expect(JSON.stringify(warn.mock.calls)).not.toContain('test-token');
    },
  );

  it('preserves rate limit classification and safe retry delay', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 429, headers: { 'Retry-After': '30' } }),
    );
    await expect(provider.findOne(1)).rejects.toMatchObject({
      status: 429,
      response: {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Movie provider rate limit reached',
        retryAfter: 30,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes network errors and clears timers', async () => {
    jest.useFakeTimers();
    fetchMock.mockRejectedValue(new Error('private URL and test-token'));
    await expect(provider.findOne(1)).rejects.toMatchObject({
      status: 502,
      message: 'Movie provider request failed',
    });
    expect(jest.getTimerCount()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'enforces the deadline through fetch and JSON read (body: %s)',
    async (bodyRead) => {
      jest.useFakeTimers();
      fetchMock.mockImplementation((_url: URL, init: RequestInit) => {
        const pending = new Promise<never>((_resolve, reject) => {
          init.signal.addEventListener(
            'abort',
            () => reject(init.signal.reason),
            { once: true },
          );
        });
        return bodyRead
          ? Promise.resolve({ ok: true, status: 200, json: () => pending })
          : pending;
      });
      const result = provider.findOne(1);
      const assertion = expect(result).rejects.toMatchObject({
        status: 504,
        message: 'Movie provider request timed out',
      });
      await jest.advanceTimersByTimeAsync(50);
      await assertion;
      expect(jest.getTimerCount()).toBe(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects invalid upstream JSON', async () => {
    fetchMock.mockResolvedValue(new Response('{invalid'));
    await expect(provider.findOne(1)).rejects.toMatchObject({
      status: 502,
      message: 'Movie provider response was invalid',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    null,
    {},
    [],
    { id: 2, name: 'Wrong' },
    { id: 1, name: '' },
    { id: 1, name: 'Series', success: false },
  ])('rejects malformed primary response %j without recovery', async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(provider.findOne(1)).rejects.toMatchObject({
      status: 502,
      message: 'Movie provider response was invalid',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
