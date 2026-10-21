import { BadGatewayException } from '@nestjs/common';
import type { SearchSuggestionsResponse } from '@movie-explorer/contracts';
import { TmdbMovieProvider } from './tmdb-movie.provider';
import { mapPeople, searchPage } from './tmdb-search.mapper';
import { SearchService } from '../../search/search.service';
import { TmdbSearchProvider } from './tmdb-search.provider';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
  language: 'en-US',
};
const page = (results: unknown[], current = 1) => ({
  results,
  page: current,
  total_pages: 3,
  total_results: 42,
});

describe('search provider and public contracts', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  const provider = new TmdbMovieProvider(config);
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('browses popular persons with pagination, deduplication and missing-image fallback', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        page(
          [
            { id: 1, name: 'Popular' },
            { id: 1, name: 'Duplicate' },
            { id: 2, name: 'Adult', adult: true },
          ],
          2,
        ),
      ),
    );
    await expect(provider.findPeople('', 2)).resolves.toMatchObject({
      people: [{ id: 1, name: 'Duplicate' }],
      page: 2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url: URL = fetchMock.mock.calls[0][0];
    expect(url.pathname).toBe('/3/person/popular');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.has('query')).toBe(false);
  });

  it('uses separate movie/person searches, retains movie ranking and stable IDs, and returns a discriminated public union', async () => {
    fetchMock.mockImplementation(async (url: URL) =>
      Response.json(
        page(
          url.pathname.endsWith('/person')
            ? [
                {
                  id: 5,
                  name: 'Person',
                  profile_path: '/portrait.jpg',
                  known_for_department: 'Acting',
                  known_for: [{ media_type: 'tv' }],
                },
                { id: 8, name: 'No portrait', profile_path: null },
              ]
            : [
                {
                  id: 5,
                  title: 'Movie',
                  release_date: '1979-05-25',
                  poster_path: '/poster.jpg',
                },
                { id: 6, title: 'No poster' },
              ],
        ),
      ),
    );

    const result: SearchSuggestionsResponse = await new SearchService(
      provider,
      new TmdbSearchProvider(config),
    ).suggestions(' Query ', 1);
    expect(result).toEqual({
      groups: {
        movie: { status: 'available' },
        person: { status: 'available' },
      },
      suggestions: [
        {
          mediaType: 'movie',
          id: 5,
          title: 'Movie',
          releaseYear: 1979,
          posterUrl: 'https://image.tmdb.org/t/p/w92/poster.jpg',
        },
        {
          mediaType: 'person',
          id: 5,
          name: 'Person',
          profileUrl: 'https://image.tmdb.org/t/p/w500/portrait.jpg',
          knownForDepartment: 'Acting',
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url] of fetchMock.mock.calls) {
      expect(url.searchParams.get('query')).toBe('Query');
      expect(url.searchParams.get('include_adult')).toBe('false');
      expect(url.searchParams.get('language')).toBe('en-US');
      expect(url.searchParams.get('page')).toBe('1');
    }

    expect(result.suggestions[0]).not.toHaveProperty('poster_path');
    expect(result.suggestions[1]).not.toHaveProperty('known_for');
  });

  it('maps person pages without detail lookups, handles missing metadata, excludes unsupported and invalid records, and deduplicates IDs', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        page(
          [
            {
              id: 1,
              name: ' One ',
              profile_path: null,
              known_for_department: 42,
            },
            {
              id: 2,
              name: 'Two',
              profile_path: '/two.jpg',
              known_for_department: 'Directing',
            },
            {
              id: 2,
              name: 'Two',
              profile_path: '/two.jpg',
              known_for_department: 'Directing',
            },
            { id: 3, name: 'TV', media_type: 'tv' },
            { id: 4, name: 'Adult', adult: true },
            { id: -1, name: 'Invalid' },
            { id: 5, name: ' ' },
            null,
            'invalid',
          ],
          2,
        ),
      ),
    );
    await expect(provider.findPeople(' Two ', 2)).resolves.toEqual({
      people: [
        { id: 1, name: 'One' },
        {
          id: 2,
          name: 'Two',
          profileUrl: 'https://image.tmdb.org/t/p/w500/two.jpg',
          knownForDepartment: 'Directing',
        },
      ],
      page: 2,
      totalPages: 3,
      totalResults: 42,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0].searchParams.get('page')).toBe('2');
  });

  it('keeps the movie-only response compatible and skips malformed/adult/TV results', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        page([
          { id: 1, title: 'First', poster_path: null },
          { id: 2, title: 'Second', release_date: 123 },
          { id: 3, title: 'TV', media_type: 'tv' },
          { id: 4, title: 'Adult', adult: true },
          { id: 0, title: 'Invalid' },
          { id: 5, title: ' ' },
          null,
        ]),
      ),
    );
    await expect(provider.findSuggestions('Query', 6)).resolves.toEqual({
      suggestions: [
        { id: 1, title: 'First' },
        { id: 2, title: 'Second' },
      ],
    });
  });

  it.each([
    null,
    {},
    { results: [] },
    { ...page([]), results: {} },
    { ...page([]), page: '1' },
    { ...page([]), total_pages: -1 },
    { ...page([]), total_results: 1.5 },
  ])('rejects malformed external pagination: %j', (value) => {
    expect(() => searchPage(value)).toThrow(BadGatewayException);
  });

  it('maps empty results and caps upstream page counts to the supported boundary', () => {
    expect(
      mapPeople({ ...page([]), total_pages: 900 }, config.imageBaseUrl),
    ).toEqual({ people: [], page: 1, totalPages: 500, totalResults: 42 });
  });

  it.each(['network', 'http', 'json', 'shape'])(
    'sanitizes %s failures',
    async (kind) => {
      if (kind === 'network')
        fetchMock.mockRejectedValue(new Error('Bearer secret upstream'));
      else if (kind === 'http')
        fetchMock.mockResolvedValue(
          new Response('secret upstream', { status: 401 }),
        );
      else if (kind === 'json')
        fetchMock.mockResolvedValue(new Response('secret upstream'));
      else fetchMock.mockResolvedValue(Response.json({ secret: 'upstream' }));
      await expect(provider.findPeople('Query', 1)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      await expect(provider.findPeople('Query', 1)).rejects.not.toThrow(
        /secret|Bearer/,
      );
    },
  );
});
