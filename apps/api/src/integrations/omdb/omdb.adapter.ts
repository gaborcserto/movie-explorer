import type { ImdbRating } from '@movie-explorer/contracts';
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
): ImdbRating | null {
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
  )
    return null;
  const score = Number(body.imdbRating);
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;
  const rawVotes = 'imdbVotes' in body ? body.imdbVotes : null;
  const votes =
    typeof rawVotes === 'string' &&
    /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(rawVotes)
      ? Number(rawVotes.replaceAll(',', ''))
      : NaN;
  return {
    score,
    voteCount: Number.isSafeInteger(votes) && votes >= 0 ? votes : null,
  };
}

export class OmdbAdapter {
  private readonly cache = new Map<
    string,
    { rating: ImdbRating | null; expires: number }
  >();
  private readonly requests = new Map<string, Promise<ImdbRating | null>>();
  private readonly apiUrl: string;

  constructor(
    private readonly apiKey = {
      ...loadLocalEnv(),
      ...process.env,
    }.OMDB_API_KEY?.trim(),
    apiUrl = (() => {
      const env = { ...loadLocalEnv(), ...process.env };
      return env.OMDB_API_URL?.trim() || DEFAULT_API_URL;
    })(),
  ) {
    this.apiUrl = validateApiUrl(apiUrl);
  }

  get enabled() {
    return Boolean(this.apiKey);
  }

  async findRating(
    id: string,
    kind: 'movie' | 'series',
  ): Promise<ImdbRating | null> {
    if (!this.enabled || !/^tt\d{7,}$/.test(id)) return null;
    const key = `${kind}:${id}`;
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.rating;
    const pending = this.requests.get(key);
    if (pending) return pending;
    const request = this.fetchRating(id, kind)
      .then((rating) => {
        this.cache.delete(key);
        if (this.cache.size >= 500)
          this.cache.delete(this.cache.keys().next().value ?? '');
        this.cache.set(key, {
          rating,
          expires: Date.now() + (rating ? 3_600_000 : 60_000),
        });
        return rating;
      })
      .finally(() => this.requests.delete(key));
    this.requests.set(key, request);
    return request;
  }

  private async fetchRating(id: string, kind: 'movie' | 'series') {
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
      if (!response.ok) return null;
      const body: unknown = await response.json();
      controller.signal.throwIfAborted();
      return normalize(body, id, kind);
    } catch {
      // Do not log upstream errors: their URLs may contain the API key.
      return null;
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}
