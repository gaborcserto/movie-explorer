import { ok } from 'node:assert/strict';
import { Logger } from '@nestjs/common';
import { TmdbMovieProvider } from './tmdb-movie.provider';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://example.com',
  imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
  language: 'hu-HU',
};
const backdrop = {
  file_path: '/backdrop.jpg',
  width: 1920,
  height: 1080,
  aspect_ratio: 1.778,
  iso_639_1: null,
};
const poster = {
  file_path: '/poster.jpg',
  width: 1000,
  height: 1500,
  aspect_ratio: 0.667,
  iso_639_1: 'hu',
};
const trailer = {
  id: 'trailer-id',
  key: 'dQw4w9WgXcQ',
  site: 'YouTube',
  name: 'Official trailer',
  type: 'Trailer',
  iso_639_1: 'hu',
};
const movie = {
  id: 969681,
  title: 'Spider-Man: Brand New Day',
  overview: 'Primary overview',
  genres: [],
  poster_path: null,
  runtime: null,
  vote_average: 0,
  credits: { cast: [], crew: [] },
  images: { backdrops: [backdrop], posters: [poster], logos: [] },
  videos: { results: [trailer] },
};

describe('movie media coverage', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('maps full categorized collections without caps, deduplicating by path and site/key in upstream order', async () => {
    const backdrops = Array.from({ length: 14 }, (_, i) => ({
      ...backdrop,
      file_path: `/backdrop-${i}.jpg`,
    }));
    const posters = Array.from({ length: 9 }, (_, i) => ({
      ...poster,
      file_path: `/poster-${i}.jpg`,
    }));
    const results = [
      'Trailer',
      'Teaser',
      'Clip',
      'Featurette',
      'Behind the Scenes',
      'Interview',
      'Bloopers',
      'Other',
    ].map((type, i) => ({
      ...trailer,
      id: `video-${i}`,
      key: `dQw4w9WgXc${i}`,
      type,
      iso_639_1: i ? 'en' : 'hu',
    }));
    fetchMock.mockResolvedValue(
      Response.json({
        ...movie,
        images: {
          backdrops: [...backdrops, backdrops[0]],
          posters: [...posters, posters[0]],
        },
        videos: {
          results: [
            ...results,
            results[0],
            { ...trailer, site: 'Vimeo', key: '12345' },
            { ...trailer, site: 'Unknown' },
          ],
        },
      }),
    );
    const result = await new TmdbMovieProvider(config).findOne(movie.id);
    ok(result);
    expect(result.backdrops).toHaveLength(14);
    expect(result.posters).toHaveLength(9);
    ok(result.backdrops);
    expect(result.backdrops[0]).toEqual({
      filePath: '/backdrop-0.jpg',
      width: 1920,
      height: 1080,
      aspectRatio: 1.778,
      language: null,
      thumbnailUrl: 'https://image.tmdb.org/t/p/w500/backdrop-0.jpg',
      fullUrl: 'https://image.tmdb.org/t/p/original/backdrop-0.jpg',
    });

    ok(result.posters);
    expect(result.posters[0]).toMatchObject({
      filePath: '/poster-0.jpg',
      language: 'hu',
      width: 1000,
      height: 1500,
    });

    expect(result.videos).toHaveLength(10);
    ok(result.videos);
    expect(result.videos.slice(0, 8).map((v) => v.type)).toEqual(
      results.map((v) => v.type),
    );

    expect(result.videos[0]).toMatchObject({
      id: 'video-0',
      key: 'dQw4w9WgXc0',
      site: 'YouTube',
      type: 'Trailer',
      language: 'hu',
      name: 'Official trailer',
    });

    expect(result.videos[8].url).toBe('https://vimeo.com/12345');
    expect(result.videos[9]).toMatchObject({ site: 'Unknown', url: '' });
    expect(result.photos).toBeUndefined();
    expect(result).not.toHaveProperty('logos');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['en-US', 'hu-HU'])(
    'uses the same explicit language union in append and retries for %s',
    async (language) => {
      const provider = new TmdbMovieProvider({ ...config, language });
      fetchMock
        .mockResolvedValueOnce(Response.json(movie))
        .mockResolvedValueOnce(Response.json(movie.images))
        .mockResolvedValueOnce(Response.json(movie.images))
        .mockResolvedValueOnce(Response.json(movie.videos));
      await provider.findOne(movie.id);
      await provider.findMovieSection(movie.id, 'photos');
      await provider.findMovieSection(movie.id, 'posters');
      await provider.findMovieSection(movie.id, 'videos');
      for (const [url] of fetchMock.mock.calls) {
        const union = language === 'hu-HU' ? 'hu,en,null' : 'en,null';
        expect(url.searchParams.get('language')).toBe(language);
        expect(url.searchParams.get('include_image_language')).toBe(union);
        expect(url.searchParams.get('include_video_language')).toBe(union);
      }
      expect(fetchMock.mock.calls.map(([url]) => url.pathname)).toEqual([
        '/movie/969681',
        '/movie/969681/images',
        '/movie/969681/images',
        '/movie/969681/videos',
      ]);
    },
  );

  it.each(['backdrops', 'posters'] as const)(
    'isolates malformed %s, preserving the other image category and primary data',
    async (category) => {
      fetchMock.mockResolvedValue(
        Response.json({
          ...movie,
          images: {
            ...movie.images,
            [category]: [{ ...poster, width: 'invalid' }],
          },
        }),
      );
      const result = await new TmdbMovieProvider(config).findOne(movie.id);
      ok(result);
      expect(result.title).toBe(movie.title);
      ok(result.sections);
      expect(
        result.sections[category === 'backdrops' ? 'photos' : 'posters'],
      ).toEqual({ status: 'unavailable' });

      expect(
        result[category === 'backdrops' ? 'posters' : 'backdrops'],
      ).toHaveLength(1);

      expect(result.videos).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('distinguishes missing categories from successful empty collections with a different distribution', async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          ...movie,
          id: 550,
          images: { backdrops: [], posters: [poster] },
          videos: { results: [] },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ ...movie, images: { backdrops: [backdrop] } }),
      );
    const provider = new TmdbMovieProvider(config);
    const empty = await provider.findOne(550);
    expect(empty).toMatchObject({
      backdrops: [],
      posters: [expect.objectContaining({ language: 'hu' })],
      videos: [],
      sections: {
        photos: { status: 'available' },
        posters: { status: 'available' },
        videos: { status: 'available' },
      },
    });
    const missing = await provider.findOne(movie.id);
    ok(missing);
    ok(missing.sections);
    expect(missing.sections.posters).toEqual({ status: 'unavailable' });
    expect(missing.backdrops).toHaveLength(1);
    expect(missing.posters).toBeUndefined();
  });

  it.each([
    null,
    { results: [null] },
    { results: [{ ...trailer, iso_639_1: 12 }] },
  ])('isolates unexpected video responses: %j', async (videos) => {
    fetchMock.mockResolvedValue(Response.json({ ...movie, videos }));
    const result = await new TmdbMovieProvider(config).findOne(movie.id);
    ok(result);
    ok(result.sections);
    expect(result.sections.videos).toEqual({ status: 'unavailable' });
    expect(result.backdrops).toHaveLength(1);
    expect(result.posters).toHaveLength(1);
  });
});
