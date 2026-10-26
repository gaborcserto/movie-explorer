import type { RatingResult } from '@movie-explorer/contracts';

import { loadLocalEnv } from '../../configuration/local-env';

const DEFAULT_API_URL = 'https://www.omdbapi.com/';

function validateApiUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid OMDB_API_URL configuration');
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'OMDB_API_URL must be an HTTPS URL without credentials, query, or fragment',
    );
  }

  return url.toString();
}

function normalize(
  body: unknown,
  id: string,
  kind: 'movie' | 'series',
): RatingResult {
  if (
    body &&
    typeof body === 'object' &&
    'Response' in body &&
    body.Response === 'False' &&
    'Error' in body &&
    (body.Error === 'Movie not found!' || body.Error === 'Series not found!')
  ) {
    return { status: 'missing' };
  }
  if (
    !body ||
    typeof body !== 'object' ||
    !('Response' in body) ||
    body.Response !== 'True' ||
    !('imdbID' in body) ||
    body.imdbID !== id ||
    !('Type' in body) ||
    body.Type !== kind ||
    !('imdbRating' in body) ||
    typeof body.imdbRating !== 'string' ||
    !/^(?:\d|10)(?:\.\d+)?$/.test(body.imdbRating)
  ) {
    return { status: 'unavailable', reason: 'invalid-response' };
  }

  const score = Number(body.imdbRating);
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    return { status: 'unavailable', reason: 'invalid-response' };
  }

  const rawVotes = 'imdbVotes' in body ? body.imdbVotes : null;
  const votes =
    typeof rawVotes === 'string' &&
    /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(rawVotes)
      ? Number(rawVotes.replaceAll(',', ''))
      : NaN;

  return {
    status: 'available',
    score,
    voteCount: Number.isSafeInteger(votes) && votes >= 0 ? votes : null,
  };
}

function isProviderErrorResponse(body: unknown): boolean {
  return (
    body !== null &&
    typeof body === 'object' &&
    'Response' in body &&
    body.Response === 'False' &&
    'Error' in body &&
    (body.Error === 'Request limit reached!' ||
      body.Error === 'Invalid API key!')
  );
}

export class OmdbAdapter {
  private readonly cache = new Map<
    string,
    { rating: RatingResult; expires: number }
  >();
  private readonly requests = new Map<string, Promise<RatingResult>>();
  private readonly apiKey: string | undefined;
  private readonly apiUrl: string;

  constructor(apiKey?: string, apiUrl?: string) {
    if (apiKey === undefined || apiUrl === undefined) {
      const env = { ...loadLocalEnv(), ...process.env };

      apiKey = apiKey ?? env.OMDB_API_KEY?.trim();
      apiUrl = apiUrl ?? (env.OMDB_API_URL?.trim() || DEFAULT_API_URL);
    }

    this.apiKey = apiKey;
    this.apiUrl = validateApiUrl(apiUrl);
  }

  get enabled() {
    return Boolean(this.apiKey);
  }

  async findRating(
    id: string,
    kind: 'movie' | 'series',
  ): Promise<RatingResult> {
    if (!this.enabled || !/^tt\d{7,}$/.test(id)) {
      return { status: 'unavailable', reason: 'not-configured' };
    }

    const key = `${kind}:${id}`;
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.rating;
    }

    const pending = this.requests.get(key);
    if (pending) {
      return pending;
    }

    const request = this.fetchRating(id, kind)
      .then((rating) => {
        this.cache.delete(key);
        if (this.cache.size >= 500) {
          this.cache.delete(this.cache.keys().next().value ?? '');
        }
        if (rating.status === 'available' || rating.status === 'missing') {
          this.cache.set(key, {
            rating,
            expires:
              Date.now() + (rating.status === 'available' ? 3_600_000 : 60_000),
          });
        }
        return rating;
      })
      .finally(() => this.requests.delete(key));
    this.requests.set(key, request);
    return request;
  }

  private async fetchRating(
    id: string,
    kind: 'movie' | 'series',
  ): Promise<RatingResult> {
    const url = new URL(this.apiUrl);
    url.searchParams.set('apikey', this.apiKey ?? '');
    url.searchParams.set('i', id);
    url.searchParams.set('type', kind);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
        redirect: 'error',
      });
      if (!response.ok) {
        return { status: 'unavailable', reason: 'upstream-error' };
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return controller.signal.aborted
          ? {
              status: 'unavailable',
              reason: 'timeout',
              retryAfterSeconds: 3,
            }
          : { status: 'unavailable', reason: 'invalid-response' };
      }

      controller.signal.throwIfAborted();
      const result = normalize(body, id, kind);
      if (
        result.status === 'unavailable' &&
        result.reason === 'invalid-response' &&
        isProviderErrorResponse(body)
      ) {
        return { status: 'unavailable', reason: 'upstream-error' };
      }

      return result;
    } catch {
      // Do not log upstream errors: their URLs may contain the API key.
      return controller.signal.aborted
        ? { status: 'unavailable', reason: 'timeout', retryAfterSeconds: 3 }
        : { status: 'unavailable', reason: 'upstream-error' };
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}
