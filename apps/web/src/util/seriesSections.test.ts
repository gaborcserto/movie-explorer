import {
  getSeriesCredits,
  getSeriesImages,
  getSeriesVideos,
  getCombinedFilmography,
} from './apiUtils';
import combinedFilmography from './filmographyValidation';

const fetchMock = vi.fn<typeof fetch>();
const available = { status: 'available' };
const credits = {
  cast: [],
  crew: [],
  sections: { cast: available, crew: available },
};
const images = {
  posters: [],
  backdrops: [],
  sections: { posters: available, backdrops: available },
};
const videos = { videos: [], availability: available };

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

it('uses canonical independent recovery URLs and preserves successful empty collections', async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json(credits))
    .mockResolvedValueOnce(Response.json(images))
    .mockResolvedValueOnce(Response.json(videos));
  await expect(getSeriesCredits(1)).resolves.toEqual(credits);
  await expect(getSeriesImages(1)).resolves.toEqual(images);
  await expect(getSeriesVideos(1)).resolves.toEqual(videos);

  expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
    'http://localhost:4000/api/v1/series/1/credits',
    'http://localhost:4000/api/v1/series/1/images',
    'http://localhost:4000/api/v1/series/1/videos',
  ]);
});

it.each([
  { ...credits, cast: [null] },
  {
    ...credits,
    cast: [{ id: 1, name: 'Actor', totalEpisodeCount: -1, characters: [] }],
  },
  {
    ...credits,
    cast: [
      {
        id: 1,
        name: 'Actor',
        totalEpisodeCount: null,
        characters: [{ creditId: null, character: null, episodeCount: -1 }],
      },
    ],
  },
  {
    ...credits,
    crew: [
      {
        id: 1,
        name: 'Writer',
        jobs: [],
        departments: [{ department: 'Writing', totalEpisodeCount: -1 }],
      },
    ],
  },
  { ...credits, sections: { cast: { status: 'unknown' }, crew: available } },
])('rejects malformed credits at the client boundary %#', async (body) => {
  fetchMock.mockResolvedValueOnce(Response.json(body));
  await expect(getSeriesCredits(1)).rejects.toMatchObject({
    category: 'invalid-response',
  });
});

it.each([
  { ...images, posters: [{ thumbnailUrl: 'a', fullUrl: 'b', width: -1 }] },
  { ...images, backdrops: [null] },
  { ...images, sections: {} },
])('rejects malformed galleries at the client boundary %#', async (body) => {
  fetchMock.mockResolvedValueOnce(Response.json(body));
  await expect(getSeriesImages(1)).rejects.toMatchObject({
    category: 'invalid-response',
  });
});

it('rejects malformed videos without attempting a player or secondary request', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ ...videos, videos: [null] }));
  await expect(getSeriesVideos(1)).rejects.toMatchObject({
    category: 'invalid-response',
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

const seriesCredit = {
  mediaType: 'tv',
  id: 1,
  title: 'Series',
  originalTitle: null,
  firstAirDate: null,
  posterUrl: null,
  genres: [],
  actingCredits: [],
  actingRoles: [{ creditId: null, character: null, episodeCount: null }],
  crewCredits: [],
};

it('validates scoped filmography groups and accepts unknown role metadata without fabrication', async () => {
  const body = { entries: [seriesCredit], groups: { tv: available } };
  fetchMock.mockResolvedValueOnce(Response.json(body));
  await expect(
    getCombinedFilmography(42, 'tv', new AbortController().signal)
  ).resolves.toEqual(body);
  expect(String(fetchMock.mock.calls[0][0])).toBe(
    'http://localhost:4000/api/v1/persons/42/combined-filmography?mediaType=tv'
  );
  expect(combinedFilmography(body, 'all')).toBe(false);
  expect(
    combinedFilmography(
      { ...body, groups: { tv: available, movie: available } },
      'tv'
    )
  ).toBe(false);
});

it.each([
  { ...seriesCredit, mediaType: 'series' },
  { ...seriesCredit, id: -1 },
  { ...seriesCredit, firstAirDate: '2026-02-30' },
  {
    ...seriesCredit,
    actingRoles: [{ creditId: null, character: null, episodeCount: -1 }],
  },
  { ...seriesCredit, crewCredits: [{ job: 'Writer', episodeCount: -1 }] },
])('rejects malformed Series filmography rows %#', (entry) => {
  expect(
    combinedFilmography({ entries: [entry], groups: { tv: available } }, 'tv')
  ).toBe(false);
});

it('rejects duplicate composite identities', () => {
  expect(
    combinedFilmography(
      { entries: [seriesCredit, seriesCredit], groups: { tv: available } },
      'tv'
    )
  ).toBe(false);
});
