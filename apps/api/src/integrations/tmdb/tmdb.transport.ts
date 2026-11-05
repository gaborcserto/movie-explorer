import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Logger,
} from '@nestjs/common';

import { parseRetryAfter } from './retry-after';
import type { TmdbConfig } from './tmdb.config';

// A private cause keeps recovery policy independent of public error wording.
export type TmdbFailure = 'invalid-response' | 'request-failed';

export function tmdbFailure(error: unknown): TmdbFailure | undefined {
  if (!(error instanceof BadGatewayException)) {
    return undefined;
  }

  const cause: unknown = error.cause;

  return cause === 'invalid-response' || cause === 'request-failed'
    ? cause
    : undefined;
}

type TmdbRequestOptions = {
  path: string;
  query?: Record<string, string | undefined>;
  allowNotFound?: boolean;
  operation: string;
  timeoutMs?: number;
  validateBody: (body: unknown) => void;
};

// Integration-private HTTP mechanics; endpoint validation belongs to the provider.
export class TmdbTransport {
  constructor(
    private readonly config: TmdbConfig,
    private readonly logger: Pick<Logger, 'warn'>,
  ) {}

  async request({
    path,
    query = {},
    allowNotFound = false,
    operation,
    validateBody,
    timeoutMs,
  }: TmdbRequestOptions): Promise<unknown> {
    const url = new URL(`${this.config.apiBaseUrl}${path}`);
    url.searchParams.set('language', this.config.language);

    if (this.config.region) {
      url.searchParams.set('region', this.config.region);
    }

    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(timeoutMs ?? Infinity, this.config.requestTimeoutMs ?? 8000),
    );
    let upstreamStatus: number | undefined;

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });
      upstreamStatus = response.status;
      controller.signal.throwIfAborted();
      if (response.status === 404 && allowNotFound) {
        this.logFailure(operation, 'not-found', 404, upstreamStatus);

        return undefined;
      }
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseRetryAfter(
            response.headers.get('Retry-After'),
          );
          throw new HttpException(
            {
              statusCode: 429,
              error: 'Too Many Requests',
              message: 'Movie provider rate limit reached',
              ...(retryAfter !== undefined && { retryAfter }),
            },
            429,
          );
        }
        throw new BadGatewayException('Movie provider request failed', {
          cause: 'request-failed',
          description: 'Bad Gateway',
        });
      }

      try {
        const body: unknown = await response.json();
        controller.signal.throwIfAborted();

        validateBody(body);

        return body;
      } catch {
        if (controller.signal.aborted) {
          throw controller.signal.reason;
        }

        throw new BadGatewayException('Movie provider response was invalid', {
          cause: 'invalid-response',
          description: 'Bad Gateway',
        });
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        this.logFailure(operation, 'timeout', 504, upstreamStatus);
        throw new GatewayTimeoutException('Movie provider request timed out');
      }
      if (error instanceof HttpException) {
        this.logFailure(
          operation,
          tmdbFailure(error) === 'invalid-response'
            ? 'invalid-response'
            : 'http',
          error.getStatus(),
          upstreamStatus,
        );
        throw error;
      }

      this.logFailure(operation, 'connection', 502, upstreamStatus);
      throw new BadGatewayException('Movie provider request failed', {
        cause: 'request-failed',
        description: 'Bad Gateway',
      });
    } finally {
      clearTimeout(timer);
      // Release unread error bodies as well as an interrupted JSON body read.
      controller.abort();
    }
  }

  private logFailure(
    operation: string,
    failure: string,
    applicationStatus: number,
    upstreamStatus?: number,
  ) {
    this.logger.warn({ operation, failure, upstreamStatus, applicationStatus });
  }
}
