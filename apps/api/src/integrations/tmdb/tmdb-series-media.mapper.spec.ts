import { TmdbSeriesMediaMapper } from './tmdb-series-media.mapper';

describe('Series media', () => {
  const mapper = new TmdbSeriesMediaMapper('https://images.example/w500');

  it('deduplicates paths and preserves neutral images, dimensions and full URLs', () => {
    const image = {
      file_path: '/poster.jpg',
      width: 1000,
      height: 1500,
      aspect_ratio: 2 / 3,
      iso_639_1: null,
    };
    const result = mapper.images({
      posters: [image, image, { file_path: '/hu.jpg', iso_639_1: 'hu' }],
      backdrops: [],
    });
    expect(result.posters).toHaveLength(2);
    expect(result.posters[0]).toEqual({
      filePath: '/poster.jpg',
      width: 1000,
      height: 1500,
      aspectRatio: 2 / 3,
      language: null,
      thumbnailUrl: 'https://images.example/w500/poster.jpg',
      fullUrl: 'https://images.example/original/poster.jpg',
    });
    expect(result.sections.posters.status).toBe('available');
    expect(result.sections.backdrops.status).toBe('available');
  });

  it('keeps usable media in partial galleries and distinguishes missing from empty', () => {
    const result = mapper.images({
      posters: [null, { file_path: '/valid.jpg', width: -1 }],
    });
    expect(result.posters).toHaveLength(1);
    expect(result.posters[0].width).toBeUndefined();
    expect(result.sections.posters.status).toBe('unavailable');
    expect(result.sections.backdrops.status).toBe('unavailable');
    expect(mapper.images(undefined).posters).toEqual([]);
  });

  it('uses shared supported-host rules, keeps types/languages/date and stable identities', () => {
    const clip = {
      id: 'v1',
      key: 'abcdefghijk',
      name: 'Clip',
      type: 'Clip',
      site: 'YouTube',
      iso_639_1: 'hu',
      published_at: '2025-01-01T00:00:00Z',
    };
    const result = mapper.videos({
      results: [
        clip,
        clip,
        { key: '12', name: 'Teaser', type: 'Teaser', site: 'Vimeo' },
        { key: 'x', name: 'Other', site: 'Unknown' },
      ],
    });
    expect(result.videos).toHaveLength(3);
    expect(result.videos[0]).toMatchObject({
      id: 'v1',
      type: 'Clip',
      language: 'hu',
      publishedAt: clip.published_at,
      url: 'https://www.youtube.com/watch?v=abcdefghijk',
    });
    expect(result.videos[1].url).toBe('https://vimeo.com/12');
    expect(result.videos[2].url).toBe('');
    expect(result.availability.status).toBe('available');
  });

  it('marks malformed video records unavailable without inventing fields', () => {
    expect(mapper.videos({ results: [] }).availability.status).toBe(
      'available',
    );
    expect(
      mapper.videos({ results: [null, { key: 'x' }] }).availability.status,
    ).toBe('unavailable');
    expect(mapper.videos(undefined).availability.status).toBe('unavailable');
  });
});
