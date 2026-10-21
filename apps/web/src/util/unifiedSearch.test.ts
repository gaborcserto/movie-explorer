import {
  ApiRequestError,
  getSearchResults,
  getSearchSuggestions,
} from './apiUtils';

const fetchMock = vi.fn();
const envelope = {
  results: [
    { id: 1, mediaType: 'tv', title: 'Series', firstAirDate: '2005-02-21' },
  ],
  page: 1,
  totalPages: 1,
  totalResults: 1,
};
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

test('requests canonical unified search with exact Series year and caller cancellation', async () => {
  fetchMock.mockResolvedValue(Response.json(envelope));
  const controller = new AbortController();
  await expect(
    getSearchResults('Story & title', 'tv', 1, controller.signal, '2005')
  ).resolves.toEqual(envelope);
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/search?query=Story+%26+title&type=tv&page=1&year=2005',
    expect.objectContaining({ signal: expect.any(AbortSignal) })
  );
});
test.each([
  null,
  {},
  { ...envelope, page: 2 },
  { ...envelope, totalPages: 501 },
  { ...envelope, totalResults: -1 },
  { ...envelope, results: [{ id: 0, mediaType: 'tv', title: 'Series' }] },
  { ...envelope, results: [{ id: 1, mediaType: 'tv', title: ' ' }] },
  {
    ...envelope,
    results: [{ id: 1, mediaType: 'movie', title: 'Wrong type' }],
  },
  {
    ...envelope,
    results: [{ id: 1, mediaType: 'tv', title: 'Series', rating: 11 }],
  },
  {
    ...envelope,
    results: [{ id: 1, mediaType: 'tv', title: 'Series', firstAirDate: 2005 }],
  },
])('rejects malformed, mismatched or unsupported response %j', async (body) => {
  fetchMock.mockResolvedValue(Response.json(body));
  await expect(getSearchResults('Story', 'tv', 1)).rejects.toMatchObject({
    category: 'invalid-response',
  });
});
test('All accepts different media types with the same numeric ID and missing metadata', async () => {
  const body = {
    ...envelope,
    results: [
      { id: 1, mediaType: 'tv', title: 'Series' },
      { id: 1, mediaType: 'movie', title: 'Movie' },
      { id: 1, mediaType: 'person', name: 'Person' },
    ],
  };
  fetchMock.mockResolvedValue(Response.json(body));
  await expect(getSearchResults('Story', 'all', 1)).resolves.toEqual(body);
});
test('opts into Series suggestions with optional metadata and validates the group availability', async () => {
  const body = {
    suggestions: envelope.results,
    groups: {
      movie: { status: 'available' },
      tv: { status: 'available' },
      person: { status: 'available' },
    },
  };
  fetchMock.mockResolvedValueOnce(Response.json(body)).mockResolvedValueOnce(
    Response.json({
      ...body,
      groups: { ...body.groups, tv: { status: 'wrong' } },
    })
  );
  await expect(getSearchSuggestions('Story')).resolves.toEqual(body);
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/search/suggestions?query=Story&limit=6&includeSeries=true',
    expect.any(Object)
  );
  await expect(getSearchSuggestions('Story')).rejects.toBeInstanceOf(
    ApiRequestError
  );
});
test('aborts an obsolete search without turning it into a network error', async () => {
  fetchMock.mockImplementation(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError'))
        );
      })
  );
  const controller = new AbortController();
  const pending = getSearchResults('Story', 'all', 1, controller.signal);
  controller.abort();
  await expect(pending).rejects.toMatchObject({ category: 'cancelled' });
});
