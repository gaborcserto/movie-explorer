import { loadLocalEnv } from './local-env';

const localOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function getServerConfig(
  env: NodeJS.ProcessEnv = { ...loadLocalEnv(), ...process.env },
) {
  const production = env.NODE_ENV === 'production';
  const rawPort = env.PORT ?? '4000';
  const port = Number(rawPort);

  if (
    !/^\d+$/.test(rawPort) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error('PORT must be an integer from 1 to 65535');
  }

  const origins =
    env.CORS_ORIGINS === undefined
      ? production
        ? []
        : localOrigins
      : env.CORS_ORIGINS.split(',')
          .map((value) => value.trim())
          .filter(Boolean);

  for (const origin of origins) {
    let url: URL;

    try {
      url = new URL(origin);
    } catch {
      throw new Error(
        'CORS_ORIGINS must contain comma-separated HTTP(S) origins',
      );
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error(
        'CORS_ORIGINS must contain HTTP(S) origins without paths or credentials',
      );
    }
  }

  if (
    env.SWAGGER_ENABLED !== undefined &&
    !['true', 'false'].includes(env.SWAGGER_ENABLED)
  ) {
    throw new Error('SWAGGER_ENABLED must be true or false');
  }

  return {
    port,
    host: env.HOST || undefined,
    origins,
    swaggerEnabled:
      env.SWAGGER_ENABLED === undefined
        ? !production
        : env.SWAGGER_ENABLED === 'true',
  };
}
