import { getTmdbConfig } from './tmdb.config';

describe('getTmdbConfig', () => {
  it('fails clearly when the TMDB access token is missing', () => {
    expect(() => getTmdbConfig({})).toThrow(
      'Missing required TMDB_ACCESS_TOKEN environment variable',
    );
  });

  it('uses safe defaults for optional TMDB configuration', () => {
    expect(getTmdbConfig({ TMDB_ACCESS_TOKEN: 'token' })).toEqual({
      accessToken: 'token',
      apiBaseUrl: 'https://api.themoviedb.org/3',
      imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
      language: 'en-US',
      region: undefined,
    });
  });
});
