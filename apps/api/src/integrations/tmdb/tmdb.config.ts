import * as fs from 'fs';
import * as path from 'path';

export interface TmdbConfig {
  accessToken: string;
  apiBaseUrl: string;
  imageBaseUrl: string;
  language: string;
  region?: string;
}

function parseEnvFile(filePath: string): NodeJS.ProcessEnv {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce<NodeJS.ProcessEnv>((env, line) => {
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

  return {
    accessToken,
    apiBaseUrl: env.TMDB_API_BASE_URL ?? 'https://api.themoviedb.org/3',
    imageBaseUrl: env.TMDB_IMAGE_BASE_URL ?? 'https://image.tmdb.org/t/p/w500',
    language: env.TMDB_LANGUAGE ?? 'en-US',
    region: env.TMDB_REGION || undefined,
  };
}
