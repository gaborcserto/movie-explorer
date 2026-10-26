import { Logger } from '@nestjs/common';

import { getTmdbConfig, type TmdbConfig } from './tmdb.config';
import { TmdbTransport } from './tmdb.transport';

export function imdbId(value: unknown): string | null {
  return typeof value === 'string' && /^tt\d{7,}$/.test(value) ? value : null;
}

export class TmdbExternalIds {
  private readonly cache = new Map<
    string,
    { value: string | null; expires: number }
  >();
  private readonly requests = new Map<string, Promise<string | null>>();
  private transport?: TmdbTransport;

  constructor(private readonly config?: TmdbConfig) {}

  remember(kind: 'movie' | 'series', id: number, value: unknown) {
    const key = `${kind}:${id}`;
    this.cache.delete(key);
    if (this.cache.size >= 500) {
      this.cache.delete(this.cache.keys().next().value ?? '');
    }
    this.cache.set(key, {
      value: imdbId(value),
      expires: Date.now() + 3_600_000,
    });
  }

  async resolve(kind: 'movie' | 'series', id: number): Promise<string | null> {
    const key = `${kind}:${id}`;
    const cached = this.cache.get(key);

    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    const pending = this.requests.get(key);

    if (pending) {
      return pending;
    }

    const request = this.lookup(kind, id).finally(() =>
      this.requests.delete(key),
    );
    this.requests.set(key, request);

    return request;
  }

  private async lookup(kind: 'movie' | 'series', id: number) {
    if (!this.transport) {
      const config = this.config ?? getTmdbConfig();
      this.transport = new TmdbTransport(
        config,
        new Logger(TmdbExternalIds.name),
      );
    }

    const body = await this.transport.request({
      path: `/${kind === 'movie' ? 'movie' : 'tv'}/${id}/external_ids`,
      operation: 'imdb-identification',
      allowNotFound: true,
      validateBody: (value) => {
        if (
          !value ||
          typeof value !== 'object' ||
          !('id' in value) ||
          value.id !== id
        ) {
          throw new Error('Invalid external IDs');
        }
      },
    });

    const value =
      body && typeof body === 'object' && 'imdb_id' in body
        ? body.imdb_id
        : null;
    this.remember(kind, id, value);

    return imdbId(value);
  }
}
