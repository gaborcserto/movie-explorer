export type ApiErrorCategory =
  | 'invalid-request'
  | 'not-found'
  | 'rate-limited'
  | 'internal-server'
  | 'service-unavailable'
  | 'http'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'invalid-response';

export class ApiRequestError extends Error {
  constructor(
    public readonly category: ApiErrorCategory,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number
  ) {
    super(`API request failed: ${category}`);
    this.name = 'ApiRequestError';
  }
}

export const API_REQUEST_TIMEOUT_MS = 12_000;

export function classifyHttpStatus(status: number): ApiErrorCategory {
  switch (status) {
    case 400:
    case 422:
      return 'invalid-request';
    case 404:
      return 'not-found';
    case 429:
      return 'rate-limited';
    case 500:
      return 'internal-server';
    case 502:
    case 503:
    case 504:
      return 'service-unavailable';
    default:
      return 'http';
  }
}

export const isNotFoundError = (error: unknown): boolean => {
  return error instanceof ApiRequestError && error.status === 404;
};
