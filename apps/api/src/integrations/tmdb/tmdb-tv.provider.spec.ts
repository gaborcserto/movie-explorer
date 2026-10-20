import { Logger } from '@nestjs/common';

import { TmdbTvProvider } from './tmdb-tv.provider';
import { minimalTvDetails } from '../../../test/fixtures/tv';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://api.example/3',
  imageBaseUrl: 'https://images.example/w500',
  language: 'hu-HU',
  region: 'HU',
  requestTimeoutMs: 50,
};

describe('TmdbTvProvider', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  let provider: TmdbTvProvider;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    provider = new TmdbTvProvider(config);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('makes exactly one authenticated localized details request without appends', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 1399, name: 'Series' }));
    await expect(provider.findOne(1399)).resolves.toEqual(minimalTvDetails);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init]: [URL, RequestInit] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe('/3/tv/1399');
    expect(url.search).toBe('?language=hu-HU&region=HU');
    expect(init.headers).toEqual({
      accept: 'application/json',
      Authorization: 'Bearer test-token',
    });
    expect(init.signal.aborted).toBe(true);
  });

  it('uses default locale and no region when not configured', async () => {
    provider = new TmdbTvProvider({
      ...config,
      region: undefined,
      language: 'en-US',
    });
    fetchMock.mockResolvedValue(Response.json({ id: 1, name: 'Series' }));
    await provider.findOne(1);
    expect(fetchMock.mock.calls[0][0].search).toBe('?language=en-US');
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
        operation: 'tv-details',
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
