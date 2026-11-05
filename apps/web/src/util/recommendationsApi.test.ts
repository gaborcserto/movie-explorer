import type { RecommendationCategory } from '@movie-explorer/contracts';

import {
  getPersonalizedRecommendations,
  getRecommendations,
  getRelatedTitles,
  getMovieCollection,
  getMovie,
  API_REQUEST_TIMEOUT_MS,
  RECOMMENDATION_REQUEST_TIMEOUT_MS,
} from './apiUtils';

const fetchMock = vi.fn<typeof fetch>();
const title = {
  id: 2,
  mediaType: 'movie',
  title: 'Title',
  posterUrl: '/poster.jpg',
};
const body = {
  category: 'popular-movies',
  results: [title],
  availability: 'available',
  candidateCount: 100,
};

it('validates normalized movie collections without imposing the ten-recommendation limit', async () => {
  const result = {
    collection: { id: 10, name: 'Collection' },
    availability: 'partial',
    results: Array.from({ length: 15 }, (_, i) => ({
      ...title,
      id: i + 2,
      posterUrl: undefined,
    })),
  };
  fetchMock.mockResolvedValue(Response.json(result));

  await expect(getMovieCollection(1)).resolves.toEqual(
    JSON.parse(JSON.stringify(result))
  );
  expect(String(fetchMock.mock.calls[0][0])).toContain(
    '/api/v1/movies/1/collection'
  );
});

it.each([
  null,
  { collection: null, results: [title], availability: 'available' },
  { collection: { id: 0 }, results: [], availability: 'available' },
  { collection: { id: 10, name: 12 }, results: [], availability: 'available' },
  {
    collection: { id: 10 },
    results: [title, title],
    availability: 'available',
  },
  {
    collection: { id: 10 },
    results: [{ ...title, id: 1 }],
    availability: 'available',
  },
  {
    collection: { id: 10 },
    results: [{ ...title, mediaType: 'tv' }],
    availability: 'available',
  },
  { collection: { id: 10 }, results: [], availability: 'unavailable' },
])('rejects malformed collection contract %j', async (value) => {
  fetchMock.mockResolvedValue(Response.json(value));

  await expect(getMovieCollection(1)).rejects.toMatchObject({
    category: 'invalid-response',
  });
});

it('accepts absent movie membership as an empty collection', async () => {
  const result = { collection: null, results: [], availability: 'available' };
  fetchMock.mockResolvedValue(Response.json(result));

  await expect(getMovieCollection(1)).resolves.toEqual(result);
});

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it.each<RecommendationCategory>([
  'popular-movies',
  'top-rated-movies',
  'popular-series',
  'top-rated-series',
])('validates %s and preserves partial availability', async (category) => {
  const result = {
    ...body,
    category,
    availability: 'partial',
    results: [
      { ...title, mediaType: category.endsWith('series') ? 'tv' : 'movie' },
    ],
  };
  fetchMock.mockResolvedValue(Response.json(result));

  await expect(getRecommendations(category)).resolves.toEqual(result);
  expect(String(fetchMock.mock.calls[0][0])).toContain(
    `/api/v1/recommendations/${category}`
  );
});

it.each([
  null,
  { ...body, category: 'top-rated-movies' },
  { ...body, candidateCount: 101 },
  { ...body, candidateCount: 0 },
  { ...body, availability: 'unavailable' },
  { ...body, results: [{ ...title, mediaType: 'tv' }] },
  { ...body, results: [null] },
  { ...body, results: Array(11).fill(title) },
])('rejects malformed recommendation contract %j', async (value) => {
  fetchMock.mockResolvedValue(Response.json(value));

  await expect(getRecommendations('popular-movies')).rejects.toMatchObject({
    category: 'invalid-response',
  });
});

it.each(['movies', 'series'] as const)(
  'uses canonical %s related routes and matching summary validation',
  async (resource) => {
    const result = {
      results: [
        { ...title, mediaType: resource === 'movies' ? 'movie' : 'tv' },
      ],
      availability: 'partial',
    };
    fetchMock.mockResolvedValue(Response.json(result));

    await expect(getRelatedTitles(resource, 1, 'similar')).resolves.toEqual(
      result
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      `/api/v1/${resource}/1/similar`
    );

    fetchMock.mockResolvedValue(
      Response.json({
        ...result,
        results: [{ id: 2, mediaType: 'person', name: 'Person' }],
      })
    );

    await expect(
      getRelatedTitles(resource, 1, 'recommendations')
    ).rejects.toMatchObject({ category: 'invalid-response' });
  }
);

it('limits pool concurrency, releases slots and cancels queued work without a fetch', async () => {
  const resolvers: Array<(value: Response) => void> = [];
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolvers.push(resolve);
      })
  );
  const first = getRecommendations('popular-movies');
  const second = getRecommendations('top-rated-movies');
  const controller = new AbortController();
  const third = getRecommendations('popular-series', controller.signal);
  const assertion = expect(third).rejects.toMatchObject({
    category: 'cancelled',
  });
  const fourth = getRecommendations('top-rated-series');

  expect(fetchMock).toHaveBeenCalledTimes(2);

  controller.abort();
  await assertion;
  resolvers[0](Response.json(body));
  await first;
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  resolvers[1](Response.json({ ...body, category: 'top-rated-movies' }));
  resolvers[2](
    Response.json({ ...body, category: 'top-rated-series', results: [] })
  );
  await Promise.all([second, fourth]);
});

it('gives only homepage pools the cold-cache deadline and preserves active cancellation', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new Error('aborted')),
          { once: true }
        );
      })
  );
  const recommendation = getRecommendations('popular-movies');
  const recommendationAssertion = expect(recommendation).rejects.toMatchObject({
    category: 'timeout',
  });
  const movie = getMovie(1);
  const movieAssertion = expect(movie).rejects.toMatchObject({
    category: 'timeout',
  });

  await vi.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);
  await movieAssertion;

  expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);

  await vi.advanceTimersByTimeAsync(
    RECOMMENDATION_REQUEST_TIMEOUT_MS - API_REQUEST_TIMEOUT_MS
  );
  await recommendationAssertion;

  const controller = new AbortController();
  const active = getRecommendations('popular-movies', controller.signal);
  const assertion = expect(active).rejects.toMatchObject({
    category: 'cancelled',
  });

  controller.abort();
  await assertion;

  expect(fetchMock.mock.calls[2][1]?.signal?.aborted).toBe(true);
});

it('preserves safe rate-limit retry guidance', async () => {
  fetchMock.mockResolvedValue(
    new Response('{}', { status: 429, headers: { 'Retry-After': '3' } })
  );

  await expect(getRecommendations('popular-movies')).rejects.toMatchObject({
    category: 'rate-limited',
    retryAfterSeconds: 3,
  });
});

const preferences = {
  mediaType: 'movie' as const,
  favoriteIds: [1, 2, 3],
  excludedIds: [1, 2, 3],
};
const personalized = {
  mediaType: 'movie',
  source: 'mixed',
  results: [title],
  availability: 'partial',
};

it('posts only bounded typed IDs privately with the existing recommendation deadline', async () => {
  fetchMock.mockResolvedValue(Response.json(personalized));
  const input = {
    ...preferences,
    excludedIds: Array.from({ length: 1100 }, (_, i) => i + 1),
  };

  await expect(getPersonalizedRecommendations(input)).resolves.toEqual(
    personalized
  );

  const [url, init] = fetchMock.mock.calls[0];

  expect(String(url)).toMatch(/\/api\/v1\/recommendations\/personalized$/);
  expect(init).toMatchObject({
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  });
  expect(JSON.parse(String(init?.body))).toEqual({
    ...preferences,
    excludedIds: input.excludedIds.slice(0, 1000),
  });
});

it.each([
  null,
  { ...personalized, mediaType: 'tv' },
  { ...personalized, source: 'unknown' },
  { ...personalized, results: [title, title] },
  { ...personalized, results: [{ ...title, posterUrl: '' }] },
  { ...personalized, results: [{ ...title, mediaType: 'tv' }] },
  { ...personalized, results: Array(11).fill(title) },
])('rejects malformed personalized responses: %j', async (value) => {
  fetchMock.mockResolvedValue(Response.json(value));

  await expect(
    getPersonalizedRecommendations(preferences)
  ).rejects.toMatchObject({ category: 'invalid-response' });
});

it('forwards active personalized cancellation without changing the global timeout', async () => {
  const controller = new AbortController();
  fetchMock.mockImplementation(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Abort', 'AbortError'))
        );
      })
  );
  const pending = getPersonalizedRecommendations(
    preferences,
    controller.signal
  );
  controller.abort();

  await expect(pending).rejects.toMatchObject({ category: 'cancelled' });
  expect(API_REQUEST_TIMEOUT_MS).toBe(12_000);
  expect(RECOMMENDATION_REQUEST_TIMEOUT_MS).toBe(25_000);
});
