import * as fs from 'fs';
import * as path from 'path';

export interface TmdbConfig {
  accessToken: string;
  apiBaseUrl: string;
  imageBaseUrl: string;
  language: string;
  region?: string;
  requestTimeoutMs?: number;
}

function parseEnvFile(filePath: string): NodeJS.ProcessEnv {
  let contents: string;

  try {
    // Singleton provider startup only; preserve local .env loading before serving requests.
    // nestjs-doctor-ignore-next-line performance/no-sync-io
    contents = fs.readFileSync(filePath, 'utf8');
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }

  return contents.split(/\r?\n/).reduce<NodeJS.ProcessEnv>((env, line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return env;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      return env;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

    if (!key) {
      return env;
    }

    env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    return env;
  }, {});
}

function loadLocalEnv(): NodeJS.ProcessEnv {
  const cwd = process.cwd();
  const envFiles = [
    path.resolve(cwd, '.env'),
    path.resolve(cwd, 'apps/api/.env'),
  ];

  return envFiles.reduce<NodeJS.ProcessEnv>(
    (env, filePath) => ({
      ...env,
      ...parseEnvFile(filePath),
    }),
    {},
  );
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
