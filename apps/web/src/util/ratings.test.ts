import { getRatings } from './apiUtils';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const body = {
  tmdb: { status: 'available', score: 7.8, voteCount: 120 },
  imdb: { status: 'missing' },
};

test.each(['movie', 'series'] as const)(
  'requests unified %s ratings',
  async (kind) => {
    fetchMock.mockResolvedValue(Response.json(body));
    const controller = new AbortController();
    await expect(getRatings(kind, 603, controller.signal)).resolves.toEqual(
      body
    );
    expect(fetchMock.mock.calls[0][0]).toContain(
      `/api/v1/${kind === 'movie' ? 'movies' : 'series'}/603/ratings`
    );
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  }
);

test.each([
  {},
  {
    tmdb: { status: 'available', score: 11, voteCount: 0 },
    imdb: { status: 'missing' },
  },
  {
    tmdb: { status: 'available', score: 8, voteCount: 1.5 },
    imdb: { status: 'missing' },
  },
  {
    tmdb: { status: 'unavailable', reason: 'unknown' },
    imdb: { status: 'missing' },
  },
])('rejects malformed unified ratings %p', async (value) => {
  fetchMock.mockResolvedValue(Response.json(value));
  await expect(
    getRatings('movie', 603, new AbortController().signal)
  ).rejects.toMatchObject({ category: 'invalid-response' });
});
