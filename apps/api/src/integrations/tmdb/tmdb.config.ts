import { loadLocalEnv } from '../../configuration/local-env';

export interface TmdbConfig {
  accessToken: string;
  apiBaseUrl: string;
  imageBaseUrl: string;
  language: string;
  region?: string;
  requestTimeoutMs?: number;
}

export function getTmdbConfig(
  env: NodeJS.ProcessEnv = { ...loadLocalEnv(), ...process.env },
): TmdbConfig {
  const accessToken = env.TMDB_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('Missing required TMDB_ACCESS_TOKEN environment variable');
  }

  const timeout = env.TMDB_REQUEST_TIMEOUT_MS ?? '8000';
  const requestTimeoutMs = Number(timeout);

  if (
    !/^\d+$/.test(timeout) ||
    !Number.isSafeInteger(requestTimeoutMs) ||
    requestTimeoutMs < 1 ||
    requestTimeoutMs > 60_000
  ) {
    throw new Error(
      'TMDB_REQUEST_TIMEOUT_MS must be an integer from 1 to 60000',
    );
  }

  return {
    accessToken,
    requestTimeoutMs,
    apiBaseUrl: env.TMDB_API_BASE_URL ?? 'https://api.themoviedb.org/3',
    imageBaseUrl: env.TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p/w500',
    language: env.TMDB_LANGUAGE ?? 'en-US',
    region: env.TMDB_REGION || undefined,
  };
}
