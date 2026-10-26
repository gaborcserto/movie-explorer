import { mapWatchProviders } from './tmdb-watch-providers.mapper';

describe('mapWatchProviders', () => {
  it('uses only HU, maps supported categories and removes same-category duplicates', () => {
    const result = mapWatchProviders(
      {
        results: {
          US: { flatrate: [{ provider_id: 9, provider_name: 'US' }] },
          HU: {
            link: 'https://www.themoviedb.org/movie/1/watch',
            flatrate: [
              {
                provider_id: 1,
                provider_name: 'Stream',
                logo_path: '/stream.png',
              },
              { provider_id: 1, provider_name: 'Stream duplicate' },
            ],
            rent: [{ provider_id: 1, provider_name: 'Stream' }],
            buy: [{ provider_id: 2, provider_name: 'Buy' }],
            free: [{ provider_id: 3, provider_name: 'Free' }],
            ads: [{ provider_id: 4, provider_name: 'Ads' }],
          },
        },
      },
      'https://image.tmdb.org/t/p/w500',
    );
    expect(result.providers).toEqual([
      {
        id: 1,
        name: 'Stream',
        logoUrl: 'https://image.tmdb.org/t/p/w92/stream.png',
        category: 'streaming',
        region: 'HU',
        watchUrl: 'https://www.themoviedb.org/movie/1/watch',
      },
      {
        id: 1,
        name: 'Stream',
        category: 'rent',
        region: 'HU',
        watchUrl: 'https://www.themoviedb.org/movie/1/watch',
      },
      {
        id: 2,
        name: 'Buy',
        category: 'buy',
        region: 'HU',
        watchUrl: 'https://www.themoviedb.org/movie/1/watch',
      },
    ]);
  });

  it('returns empty availability for missing HU data and safely omits invalid logos and links', () => {
    expect(
      mapWatchProviders({ results: {} }, 'https://image.tmdb.org/t/p/w500'),
    ).toEqual({ providers: [] });
    expect(
      mapWatchProviders(
        {
          results: {
            HU: {
              buy: [
                { provider_id: 7, provider_name: 'Store', logo_path: null },
              ],
              link: 'javascript:bad',
            },
          },
        },
        'https://image.tmdb.org/t/p/w500',
      ).providers,
    ).toEqual([{ id: 7, name: 'Store', category: 'buy', region: 'HU' }]);
  });
});
