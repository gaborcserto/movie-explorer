import { TmdbSeriesMapper } from './tmdb-series.mapper';
import { validateTmdbSeriesDetails } from './tmdb-series.validation';
import {
  minimalSeriesDetails,
  seriesResponse,
} from '../../../test/fixtures/series';

const mapper = new TmdbSeriesMapper('https://images.example/w500');

describe('TMDB series mapping and validation', () => {
  it('maps complete localized series metadata without provider fields', () => {
    const result = mapper.toSeriesDetails(seriesResponse);
    expect(result).toEqual({
      ...minimalSeriesDetails,
      title: 'Localized series',
      originalTitle: 'Original series',
      description: 'A series overview.',
      firstAirDate: '2011-04-17',
      lastAirDate: '2019-05-19',
      posterUrl: 'https://images.example/w500/poster.jpg',
      posterSrcSet:
        'https://images.example/w342/poster.jpg 1x, https://images.example/w780/poster.jpg 2x, https://images.example/original/poster.jpg 3x',
      backdropUrl: 'https://images.example/w500/backdrop.jpg',
      originalLanguage: 'en',
      status: 'Ended',
      inProduction: false,
      seasonCount: 8,
      episodeCount: 73,
      episodeRuntimeMinutes: [50, 60],
      rating: 8.4,
      voteCount: 200,
      genres: ['Drama'],
      creators: [
        {
          id: 1,
          name: 'Creator',
          profileUrl: 'https://images.example/w500/creator.jpg',
          profileSrcSet:
            'https://images.example/w185/creator.jpg 1x, https://images.example/h632/creator.jpg 2x, https://images.example/original/creator.jpg 3x',
        },
      ],
      networks: [
        {
          id: 49,
          name: 'Network',
          logoUrl: 'https://images.example/w500/logo.png',
          originCountry: 'US',
        },
      ],
      productionCompanies: [
        { id: 2, name: 'Company', logoUrl: null, originCountry: null },
      ],
      seasons: [
        {
          id: 10,
          seasonNumber: 0,
          title: 'Specials',
          description: null,
          airDate: null,
          episodeCount: 4,
          posterUrl: null,
        },
        {
          id: 11,
          seasonNumber: 1,
          title: 'Season One',
          description: 'First season',
          airDate: '2011-04-17',
          episodeCount: 10,
          posterUrl: 'https://images.example/w500/season.jpg',
          posterSrcSet:
            'https://images.example/w342/season.jpg 1x, https://images.example/w780/season.jpg 2x, https://images.example/original/season.jpg 3x',
        },
      ],
    });
  });

  it('accepts minimal identity and represents missing metadata as unknown', () => {
    const body = { id: 1399, name: 'Series' };
    expect(() => validateTmdbSeriesDetails(body, 1399)).not.toThrow();
    expect(mapper.toSeriesDetails(body)).toEqual(minimalSeriesDetails);
  });

  it('normalizes null, empty and malformed optional fields without inventing values', () => {
    expect(
      mapper.toSeriesDetails({
        id: 1399,
        name: 'Series',
        original_name: '',
        overview: null,
        poster_path: null,
        backdrop_path: '',
        first_air_date: null,
        last_air_date: '',
        networks: null,
        created_by: {},
        production_companies: 'bad',
        seasons: null,
        episode_run_time: [0, -2, null, '30', 1.5],
        vote_average: '8',
        number_of_seasons: -1,
        number_of_episodes: 1.5,
        in_production: 'true',
      }),
    ).toEqual(minimalSeriesDetails);
  });

  it('retains incomplete creators as unlinked names and skips nameless records', () => {
    expect(
      mapper.toSeriesDetails({
        id: 1,
        name: 'Series',
        created_by: [
          null,
          {},
          { id: -1, name: 'Writer' },
          { id: 2, name: ' ' },
        ],
        networks: [{ id: 3, name: 'Network' }, { name: 'No identity' }, null],
      }),
    ).toMatchObject({
      creators: [{ name: 'Writer' }],
      networks: [
        { id: 3, name: 'Network', logoUrl: null, originCountry: null },
      ],
    });
  });

  it('orders seasons by number including specials and omits entries lacking required identity', () => {
    expect(
      mapper.toSeriesDetails({
        id: 1,
        name: 'Series',
        seasons: [
          { id: 4, season_number: 2, name: 'Second' },
          { id: 3, season_number: 0, name: 'Specials', episode_count: 0 },
          { season_number: 1, name: 'No ID' },
          { id: 6, name: 'No number' },
          { id: 7, season_number: -1, name: 'Invalid' },
          { id: 8, season_number: 3 },
          null,
        ],
      }).seasons,
    ).toEqual([
      {
        id: 3,
        seasonNumber: 0,
        title: 'Specials',
        description: null,
        airDate: null,
        episodeCount: 0,
        posterUrl: null,
      },
      {
        id: 4,
        seasonNumber: 2,
        title: 'Second',
        description: null,
        airDate: null,
        episodeCount: null,
        posterUrl: null,
      },
    ]);
  });

  it.each(['2024-02-30', '2023-02-29', '2024-2-01', 'unknown', 123])(
    'normalizes invalid calendar date %j',
    (date) => {
      expect(
        mapper.toSeriesDetails({ id: 1, name: 'Series', first_air_date: date })
          .firstAirDate,
      ).toBeNull();
    },
  );

  it('retains future/leap dates, ongoing status, zero rating and supplied runtime order', () => {
    expect(
      mapper.toSeriesDetails({
        id: 1,
        name: 'Series',
        first_air_date: '2032-02-29',
        last_air_date: null,
        status: 'Returning Series',
        in_production: true,
        vote_average: 0,
        episode_run_time: [60, 0, 45, 60],
      }),
    ).toMatchObject({
      firstAirDate: '2032-02-29',
      lastAirDate: null,
      status: 'Returning Series',
      inProduction: true,
      rating: 0,
      episodeRuntimeMinutes: [60, 45, 60],
    });
  });

  it('does not infer status from production or dates and retains future status values', () => {
    expect(
      mapper.toSeriesDetails({
        id: 1,
        name: 'Series',
        in_production: false,
        last_air_date: '2020-01-01',
      }).status,
    ).toBeNull();
    expect(
      mapper.toSeriesDetails({
        id: 1,
        name: 'Series',
        status: 'Future provider status',
      }).status,
    ).toBe('Future provider status');
  });

  it('rejects contradictory season coordinates and deduplicates repeated IDs', () => {
    expect(() =>
      validateTmdbSeriesDetails(
        {
          id: 1,
          name: 'Series',
          seasons: [
            { id: 10, season_number: 1 },
            { id: 11, season_number: 1 },
          ],
        },
        1,
      ),
    ).toThrow('Conflicting series season identities');
    const season = { id: 10, season_number: 1, name: 'First' };
    expect(
      mapper.toSeriesDetails({
        id: 1,
        name: 'Series',
        seasons: [season, season],
      }).seasons,
    ).toHaveLength(1);
  });

  it('does not mutate nested input', () => {
    const input = structuredClone(seriesResponse);
    const before = structuredClone(input);
    const result = mapper.toSeriesDetails(input);
    result.seasons.reverse();
    result.episodeRuntimeMinutes.push(1);
    result.creators[0].name = 'Changed';
    expect(input).toEqual(before);
  });

  it.each([
    null,
    [],
    {},
    { id: 0, name: 'Series' },
    { id: 1.5, name: 'Series' },
    { id: 2, name: 'Series' },
    { id: 1, name: ' ' },
    { id: 1, name: 'Series', success: false },
  ])('rejects invalid primary payload %j', (body) => {
    expect(() => validateTmdbSeriesDetails(body, 1)).toThrow(
      'Invalid series identity',
    );
  });
});
