export interface TmdbConfig {
  accessToken: string;
  apiBaseUrl: string;
  imageBaseUrl: string;
  language: string;
  region?: string;
}

export function getTmdbConfig(
  env: NodeJS.ProcessEnv = process.env,
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
