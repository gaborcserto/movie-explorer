import { getImdbRating } from './apiUtils';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

test.each(['movie', 'series'] as const)(
  'requests %s ratings through the application API with cancellation',
  async (kind) => {
    fetchMock.mockResolvedValue(
      Response.json({ imdb: { score: 8.7, voteCount: 100 } })
    );
    const controller = new AbortController();
    await expect(getImdbRating(kind, 603, controller.signal)).resolves.toEqual({
      imdb: { score: 8.7, voteCount: 100 },
    });
    expect(fetchMock.mock.calls[0][0]).toMatch(
      `/api/v1/ratings/${kind}/603/imdb`
    );
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  }
);

test('accepts explicitly unavailable IMDb data', async () => {
  fetchMock.mockResolvedValue(Response.json({ imdb: null }));
  await expect(
    getImdbRating('movie', 603, new AbortController().signal)
  ).resolves.toEqual({ imdb: null });
});

test.each([
  {},
  { imdb: 0 },
  { imdb: { score: '8', voteCount: 10 } },
  { imdb: { score: -1, voteCount: 10 } },
  { imdb: { score: 11, voteCount: 10 } },
  { imdb: { score: 8, voteCount: -1 } },
  { imdb: { score: 8, voteCount: 1.5 } },
  { imdb: { score: 8, voteCount: '100' } },
])('rejects malformed API rating data %p', async (body) => {
  fetchMock.mockResolvedValue(Response.json(body));
  await expect(
    getImdbRating('movie', 603, new AbortController().signal)
  ).rejects.toMatchObject({ category: 'invalid-response' });
});
