import {
  getMovie,
  getPerson,
  getMovieSection,
  getFilmography,
  getSearchSuggestions,
} from './apiUtils';

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
const available = { status: 'available' };
const movie = {
  id: 1,
  title: 'Movie',
  posterUrl: '',
  genres: [],
  cast: [],
  photos: [],
  videos: [],
  sections: { credits: available, photos: available, videos: available },
};
function reply(body: unknown) {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

test('accepts available empty sections and discards unusable values of explicitly unavailable sections', async () => {
  reply(movie);
  await expect(getMovie(1)).resolves.toEqual(movie);
  reply({
    ...movie,
    cast: null,
    sections: { ...movie.sections, credits: { status: 'unavailable' } },
  });
  await expect(getMovie(1)).resolves.toMatchObject({
    cast: [],
    sections: { credits: { status: 'unavailable' } },
  });
});

test.each([
  { ...movie, sections: { credits: available } },
  { ...movie, sections: { ...movie.sections, photos: { status: 'empty' } } },
  {
    ...movie,
    sections: {
      ...movie.sections,
      videos: { status: 'unavailable', retryAfterSeconds: -1 },
    },
  },
  { ...movie, videos: [{ name: {}, url: '/video' }] },
  { ...movie, castMembers: [{ name: null }] },
])('rejects malformed movie partial structure safely', async (body) => {
  reply(body);
  await expect(getMovie(1)).rejects.toMatchObject({
    category: 'invalid-response',
  });
});

test('rejects malformed filmography availability and recovered entries', async () => {
  reply({
    id: 1,
    name: 'Person',
    filmography: [],
    filmographyAvailability: { status: null },
  });
  await expect(getPerson(1)).rejects.toMatchObject({
    category: 'invalid-response',
  });
  reply({ filmography: [{ id: 2, title: 'Bad', crewCredits: null }] });
  await expect(
    getFilmography(1, new AbortController().signal)
  ).rejects.toMatchObject({ category: 'invalid-response' });
});

test('validates section recovery responses before rendering', async () => {
  reply({ photos: [{ thumbnailUrl: '/small', fullUrl: null }] });
  await expect(
    getMovieSection(1, 'photos', new AbortController().signal)
  ).rejects.toMatchObject({ category: 'invalid-response' });
  reply({ backdrops: [] });
  await expect(
    getMovieSection(1, 'photos', new AbortController().signal)
  ).resolves.toEqual({ backdrops: [] });
});

test('validates autocomplete availability and suggestion discriminants', async () => {
  reply({
    groups: { movie: available, person: { status: 'unknown' } },
    suggestions: [],
  });
  await expect(getSearchSuggestions('movie')).rejects.toMatchObject({
    category: 'invalid-response',
  });
  reply({
    groups: { movie: available, person: available },
    suggestions: [{ id: 1, mediaType: 'tv' }],
  });
  await expect(getSearchSuggestions('movie')).rejects.toMatchObject({
    category: 'invalid-response',
  });
});
