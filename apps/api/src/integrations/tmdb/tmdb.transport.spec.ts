import { BadGatewayException } from '@nestjs/common';

import { TmdbTransport } from './tmdb.transport';

describe('TMDB transport validation boundary', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    jest.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([false, true])(
    'keeps provider validation before abort and cleanup (invalid: %s)',
    async (invalid) => {
      const logger = { warn: jest.fn() };
      const transport = new TmdbTransport(
        {
          accessToken: 'test-token',
          apiBaseUrl: 'https://example.com',
          imageBaseUrl: 'https://example.com/images',
          language: 'en-US',
        },
        logger,
      );
      const body = { results: [] };
      fetchMock.mockResolvedValueOnce(Response.json(body, { status: 201 }));
      let signalAbortedDuringValidation: boolean | undefined;
      let timersDuringValidation: number | undefined;
      const validateBody = jest.fn(() => {
        const init: RequestInit & { signal: AbortSignal } =
          fetchMock.mock.calls[0][1];

        signalAbortedDuringValidation = init.signal.aborted;
        timersDuringValidation = jest.getTimerCount();
        if (invalid) {
          throw new Error('private validation failure');
        }
      });

      const result = transport.request({
        path: '/search/movie',
        operation: '/search/movie',
        validateBody,
      });

      if (invalid) {
        await expect(result).rejects.toBeInstanceOf(BadGatewayException);
        await expect(result).rejects.toMatchObject({
          status: 502,
          message: 'Movie provider response was invalid',
        });
        expect(logger.warn.mock.calls).toEqual([
          [
            {
              operation: '/search/movie',
              failure: 'invalid-response',
              upstreamStatus: 201,
              applicationStatus: 502,
            },
          ],
        ]);
      } else {
        await expect(result).resolves.toEqual(body);
        expect(logger.warn).not.toHaveBeenCalled();
      }
      expect(validateBody).toHaveBeenCalledTimes(1);
      expect(validateBody).toHaveBeenCalledWith(body);
      expect(signalAbortedDuringValidation).toBe(false);
      expect(timersDuringValidation).toBe(1);
      const init: RequestInit & { signal: AbortSignal } =
        fetchMock.mock.calls[0][1];

      expect(init.signal.aborted).toBe(true);
      expect(jest.getTimerCount()).toBe(0);
    },
  );
});
