import type { WatchProvider, WatchProviders } from '@movie-explorer/contracts';

import { API_REQUEST_TIMEOUT_MS, getWatchProviders } from './apiUtils';

const provider: WatchProvider = {
  id: 8,
  name: 'Service',
  category: 'streaming',
  region: 'HU',
};

describe.each(['movies', 'series'] as const)(
  '%s Watch Providers API client',
  (kind) => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
      fetchMock.mockReset();
      vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it('requests the canonical endpoint and parses all supported categories', async () => {
      const body: WatchProviders = {
        providers: (['streaming', 'rent', 'buy'] as const).map((category) => ({
          ...provider,
          category,
          logoUrl: 'https://images.example/logo.png',
          watchUrl: 'https://www.themoviedb.org/movie/603/watch',
        })),
      };
      fetchMock.mockResolvedValue(Response.json(body));

      await expect(
        getWatchProviders(kind, 603, new AbortController().signal)
      ).resolves.toEqual(body);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `http://localhost:4000/api/v1/${kind}/603/watch-providers`,
        { signal: expect.any(AbortSignal) }
      );
    });

    it.each([{ providers: [] }, { providers: [provider] }])(
      'accepts empty categories and absent optional metadata: %j',
      async (body) => {
        fetchMock.mockResolvedValue(Response.json(body));

        await expect(
          getWatchProviders(kind, 603, new AbortController().signal)
        ).resolves.toEqual(body);
      }
    );

    it.each([
      null,
      [],
      {},
      { providers: null },
      { providers: {} },
      { providers: [null] },
      { providers: [{}] },
    ])('rejects malformed collections: %j', async (body) => {
      fetchMock.mockResolvedValue(Response.json(body));

      await expect(
        getWatchProviders(kind, 603, new AbortController().signal)
      ).rejects.toMatchObject({ category: 'invalid-response' });
    });

    it.each([
      { id: 0 },
      { id: -1 },
      { id: 1.5 },
      { id: '8' },
      { id: Number.MAX_SAFE_INTEGER + 1 },
      { name: '' },
      { name: ' ' },
      { name: null },
      { category: 'flatrate' },
      { category: 'free' },
      { category: null },
      { region: 'US' },
      { region: null },
      { logoUrl: null },
      { logoUrl: 42 },
      { watchUrl: null },
      { watchUrl: {} },
    ])(
      'rejects invalid entries even alongside a valid provider: %j',
      async (fields) => {
        fetchMock.mockResolvedValue(
          Response.json({ providers: [provider, { ...provider, ...fields }] })
        );

        await expect(
          getWatchProviders(kind, 603, new AbortController().signal)
        ).rejects.toMatchObject({ category: 'invalid-response' });
      }
    );

    it('rejects malformed JSON with a safe classified error', async () => {
      fetchMock.mockResolvedValue(new Response('private invalid JSON'));

      await expect(
        getWatchProviders(kind, 603, new AbortController().signal)
      ).rejects.toMatchObject({
        category: 'invalid-response',
        status: 200,
        message: 'API request failed: invalid-response',
      });
    });

    it('classifies network failures without exposing connection details', async () => {
      fetchMock.mockRejectedValue(new TypeError('private network details'));

      await expect(
        getWatchProviders(kind, 603, new AbortController().signal)
      ).rejects.toMatchObject({
        category: 'network',
        message: 'API request failed: network',
      });
    });

    it.each([
      [400, 'invalid-request'],
      [404, 'not-found'],
      [429, 'rate-limited'],
      [500, 'internal-server'],
      [502, 'service-unavailable'],
      [504, 'service-unavailable'],
    ])('propagates HTTP %s as %s', async (status, category) => {
      fetchMock.mockResolvedValue(
        new Response('private server error', { status: Number(status) })
      );

      await expect(
        getWatchProviders(kind, 603, new AbortController().signal)
      ).rejects.toMatchObject({
        category,
        status,
        message: `API request failed: ${category}`,
      });
    });

    it('cancels an in-flight fetch when the caller aborts', async () => {
      const controller = new AbortController();
      let requestSignal: AbortSignal | null | undefined;
      fetchMock.mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            requestSignal = init?.signal;
            requestSignal?.addEventListener(
              'abort',
              () => reject(new Error('private abort')),
              { once: true }
            );
          })
      );
      const pending = getWatchProviders(kind, 603, controller.signal);
      const rejected = expect(pending).rejects.toMatchObject({
        category: 'cancelled',
      });

      expect(requestSignal?.aborted).toBe(false);
      controller.abort();

      await rejected;
      expect(requestSignal?.aborted).toBe(true);
    });

    it('does not fetch when the caller has already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        getWatchProviders(kind, 603, controller.signal)
      ).rejects.toMatchObject({ category: 'cancelled' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('classifies its request deadline as a timeout', async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new Error('private timeout')),
              { once: true }
            );
          })
      );
      const rejected = expect(
        getWatchProviders(kind, 603, new AbortController().signal)
      ).rejects.toMatchObject({ category: 'timeout' });

      await vi.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);

      await rejected;
    });
  }
);
