import { BadGatewayException } from '@nestjs/common';
import { TmdbMovieProvider } from './tmdb-movie.provider';
import type { TmdbMovieDetails, TmdbMovieListItem } from './tmdb.types';

const config = {
  accessToken: 'test-token',
  apiBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/w500',
  language: 'en-US',
};

const genreResponse = {
  genres: [
    { id: 18, name: 'Drama' },
    { id: 35, name: 'Comedy' },
  ],
};

const detailsResponse: TmdbMovieDetails = {
  id: 969681,
  title: 'Sample movie',
  release_date: '2024-01-01',
  poster_path: null,
  genres: [],
  vote_average: 0,
  runtime: null,
  overview: '',
  credits: { cast: [], crew: [] },
  images: { backdrops: [] },
  videos: { results: [] },
};

describe('TmdbMovieProvider', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('maps TMDB popular results to the public movie list contract', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          page: 1,
          results: [
            {
              id: 1,
              title: 'Alpha',
              release_date: '2020-01-01',
              poster_path: '/alpha.jpg',
              popularity: 100,
              genre_ids: [18, 35],
              vote_average: 8,
              overview: 'Alpha overview',
            },
          ],
          total_pages: 1,
          total_results: 1,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);

    await expect(provider.findAll({})).resolves.toEqual({
      movies: [
        {
          id: 1,
          title: 'Alpha',
          releaseDate: '2020-01-01',
          posterUrl: 'https://image.tmdb.org/t/p/w500/alpha.jpg',
          posterSrcSet:
            'https://image.tmdb.org/t/p/w342/alpha.jpg 1x, https://image.tmdb.org/t/p/w780/alpha.jpg 2x, https://image.tmdb.org/t/p/original/alpha.jpg 3x',
          genres: ['Drama', 'Comedy'],
        },
      ],
      page: 1,
      totalPages: 1,
      totalResults: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/3/movie/popular',
        search: '?language=en-US&page=1',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('uses the total from the active unfiltered discovery request', async () => {
    fetchMock
      .mockResolvedValueOnce(
        moviePage(1, 500, [movieListItem(1, [18])], 20_001),
      )
      .mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);

    await expect(
      provider.findAll({ sort: 'popularity', sortOrder: 'desc' }),
    ).resolves.toMatchObject({ totalResults: 20_001, totalPages: 500 });
  });

  it('uses the total from the active genre-filtered discovery request', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(genreResponse))
      .mockResolvedValueOnce(moviePage(1, 42, [movieListItem(1, [18])], 837));

    const provider = new TmdbMovieProvider(config);

    await expect(
      provider.findAll({
        genre: 'Drama',
        sort: 'popularity',
        sortOrder: 'desc',
      }),
    ).resolves.toMatchObject({ totalResults: 837, totalPages: 42 });

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pathname: '/3/discover/movie',
        search: expect.stringContaining('with_genres=18'),
      }),
      expect.any(Object),
    );
  });

  it('uses the total from the active search request', async () => {
    fetchMock
      .mockResolvedValueOnce(moviePage(1, 7, [movieListItem(1, [18])], 126))
      .mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);

    await expect(provider.findAll({ search: 'Alpha' })).resolves.toMatchObject({
      totalResults: 126,
    });
  });

  it('keeps the matching total when sorting discovery results by rating', async () => {
    fetchMock
      .mockResolvedValueOnce(moviePage(1, 42, [movieListItem(1, [18])], 837))
      .mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);

    await expect(
      provider.findAll({ sort: 'rating', sortOrder: 'desc' }),
    ).resolves.toMatchObject({ totalResults: 837 });
  });

  it('passes release year, minimum rating, and page to TMDB discovery', async () => {
    fetchMock
      .mockResolvedValueOnce(moviePage(3, 8, [movieListItem(1, [18])], 150))
      .mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);
    await provider.findAll({ releaseYear: 2024, minimumRating: 7, page: 3 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/3/discover/movie',
        search: expect.stringMatching(
          /page=3.*primary_release_year=2024.*vote_average.gte=7/,
        ),
      }),
      expect.any(Object),
    );
  });

  it('returns compact suggestions with small poster images', async () => {
    fetchMock.mockResolvedValueOnce(moviePage(1, 1, [movieListItem(1, [18])]));

    const provider = new TmdbMovieProvider(config);

    await expect(provider.findSuggestions('Alpha', 6)).resolves.toEqual({
      suggestions: [
        {
          id: 1,
          title: 'Alpha 1',
          releaseYear: 2020,
          posterUrl: 'https://image.tmdb.org/t/p/w92/alpha-1.jpg',
        },
      ],
    });
  });

  it('maps TMDB details to the public movie details contract', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 1,
        title: 'Alpha',
        release_date: '2020-01-01',
        poster_path: '/alpha.jpg',
        genres: [{ id: 18, name: 'Drama' }],
        vote_average: 8,
        runtime: 100,
        overview: 'Alpha overview',
        images: { backdrops: [] },
        videos: { results: [] },
        credits: {
          cast: [{ name: 'Actor One', order: 0 }],
          crew: [{ name: 'Director One', job: 'Director' }],
        },
      }),
    );

    const provider = new TmdbMovieProvider(config);

    await expect(provider.findOne(1)).resolves.toEqual({
      id: 1,
      title: 'Alpha',
      releaseDate: '2020-01-01',
      posterUrl: 'https://image.tmdb.org/t/p/w500/alpha.jpg',
      posterPreviewUrl: 'https://image.tmdb.org/t/p/w92/alpha.jpg',
      posterSrcSet:
        'https://image.tmdb.org/t/p/w342/alpha.jpg 1x, https://image.tmdb.org/t/p/w780/alpha.jpg 2x, https://image.tmdb.org/t/p/original/alpha.jpg 3x',
      genres: ['Drama'],
      rating: 8,
      runtimeMinutes: 100,
      description: 'Alpha overview',
      cast: ['Actor One'],
      director: 'Director One',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/3/movie/1',
        search:
          '?language=en-US&append_to_response=credits%2Cimages%2Cvideos&include_image_language=en%2Cnull',
      }),
      expect.any(Object),
    );
  });

  it.each([
    ['popularity', 'asc', 'popularity.asc'],
    ['popularity', 'desc', 'popularity.desc'],
    ['title', 'asc', 'title.asc'],
    ['title', 'desc', 'title.desc'],
    ['releaseDate', 'asc', 'primary_release_date.asc'],
    ['releaseDate', 'desc', 'primary_release_date.desc'],
    ['rating', 'asc', 'vote_average.asc'],
    ['rating', 'desc', 'vote_average.desc'],
  ] as const)(
    'maps %s %s sorting to TMDB discovery',
    async (sort, sortOrder, tmdbSort) => {
      fetchMock
        .mockResolvedValueOnce(moviePage(1, 1, [movieListItem(1, [18])]))
        .mockResolvedValueOnce(jsonResponse(genreResponse));

      const provider = new TmdbMovieProvider(config);
      await provider.findAll({ sort, sortOrder });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/3/discover/movie',
          search: expect.stringContaining(`sort_by=${tmdbSort}`),
        }),
        expect.any(Object),
      );
    },
  );

  it('maps ascending popularity results when TMDB omits genre ids', async () => {
    fetchMock
      .mockResolvedValueOnce(
        moviePage(
          1,
          1001,
          [
            movieListItem(1798695, [], {
              title: 'Kaalidas Collection',
              genre_ids: undefined,
            }),
          ],
          20_001,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);

    await expect(
      provider.findAll({ sort: 'popularity', sortOrder: 'asc' }),
    ).resolves.toEqual({
      movies: [
        {
          id: 1798695,
          title: 'Kaalidas Collection',
          releaseDate: '2020-01-01',
          posterUrl: 'https://image.tmdb.org/t/p/w500/alpha-1798695.jpg',
          posterSrcSet:
            'https://image.tmdb.org/t/p/w342/alpha-1798695.jpg 1x, https://image.tmdb.org/t/p/w780/alpha-1798695.jpg 2x, https://image.tmdb.org/t/p/original/alpha-1798695.jpg 3x',
          genres: [],
        },
      ],
      page: 1,
      totalPages: 1001,
      totalResults: 20_001,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/3/discover/movie',
        search: expect.stringContaining('sort_by=popularity.asc'),
      }),
      expect.any(Object),
    );
  });

  it('does not match genre filters when a TMDB result omits genre ids', async () => {
    fetchMock
      .mockResolvedValueOnce(
        moviePage(
          1,
          1001,
          [movieListItem(1798695, [], { genre_ids: undefined })],
          20_001,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);

    await expect(
      provider.findAll({
        search: 'Alpha',
        genre: 'Drama',
      }),
    ).resolves.toEqual({
      movies: [],
      page: 1,
      totalPages: 1001,
      totalResults: 20_001,
    });
  });

  it('keeps genre discovery popularity-first when no explicit sort is set', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(genreResponse))
      .mockResolvedValueOnce(moviePage(1, 1, [movieListItem(1, [18])]));

    const provider = new TmdbMovieProvider(config);
    await provider.findAll({ genre: 'Drama' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/3/discover/movie',
        search: expect.stringContaining('sort_by=popularity.desc'),
      }),
      expect.any(Object),
    );
  });

  it('defaults an explicit release-date sort to newest first', async () => {
    fetchMock
      .mockResolvedValueOnce(moviePage(1, 1, [movieListItem(1, [18])]))
      .mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);
    await provider.findAll({ sort: 'releaseDate' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/3/discover/movie',
        search: expect.stringMatching(
          /sort_by=primary_release_date.desc.*primary_release_date.lte=\d{4}-\d{2}-\d{2}|primary_release_date.lte=\d{4}-\d{2}-\d{2}.*sort_by=primary_release_date.desc/,
        ),
      }),
      expect.any(Object),
    );
  });

  it('preserves TMDB relevance ordering for text search', async () => {
    fetchMock
      .mockResolvedValueOnce(moviePage(1, 1, [movieListItem(1, [18])]))
      .mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);
    await provider.findAll({ search: 'Alpha' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/3/search/movie',
        search: expect.not.stringContaining('sort_by'),
      }),
      expect.any(Object),
    );
  });

  it('filters the current text-search page by genre and rating', async () => {
    fetchMock
      .mockResolvedValueOnce(
        moviePage(
          2,
          3,
          [
            movieListItem(1, [18], { vote_average: 8 }),
            movieListItem(2, [35], { vote_average: 9 }),
            movieListItem(3, [18], { vote_average: 6 }),
          ],
          45,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);

    await expect(
      provider.findAll({
        search: 'Alpha',
        genre: 'Drama',
        minimumRating: 7,
        page: 2,
      }),
    ).resolves.toMatchObject({
      movies: [{ id: 1, genres: ['Drama'] }],
      page: 2,
      totalPages: 3,
      totalResults: 45,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns an empty list without a discover request when the requested genre is unknown', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(genreResponse));

    const provider = new TmdbMovieProvider(config);

    await expect(provider.findAll({ genre: 'Noir' })).resolves.toEqual({
      movies: [],
      page: 1,
      totalPages: 0,
      totalResults: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['en-US', 'pt-BR', 'fr'])(
    'includes localized and neutral images for %s in one request',
    async (language) => {
      fetchMock.mockResolvedValueOnce(jsonResponse(detailsResponse));
      const provider = new TmdbMovieProvider({ ...config, language });

      const movie = await provider.findOne(969681);

      expect(movie?.photos).toBeUndefined();
      expect(movie?.videos).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = fetchMock.mock.calls[0][0] as URL;
      expect(url.searchParams.get('language')).toBe(language);
      expect(url.searchParams.get('include_image_language')).toBe(
        `${language.split('-')[0]},null`,
      );
    },
  );

  it('keeps available photos and videos consistent across repeated loads', async () => {
    fetchMock.mockImplementation(() =>
      jsonResponse({
        ...detailsResponse,
        images: {
          backdrops: [{ file_path: '/still.jpg', width: 1920, height: 1080 }],
        },
        videos: {
          results: [{ site: 'YouTube', key: 'trailer', name: 'Trailer' }],
        },
      }),
    );
    const provider = new TmdbMovieProvider(config);
    const first = await provider.findOne(969681);
    const second = await provider.findOne(969681);

    expect(first?.photos).toEqual([
      {
        thumbnailUrl: 'https://image.tmdb.org/t/p/w500/still.jpg',
        fullUrl: 'https://image.tmdb.org/t/p/original/still.jpg',
      },
    ]);
    expect(first?.videos).toEqual([
      {
        name: 'Trailer',
        url: 'https://www.youtube.com/watch?v=trailer',
        thumbnailUrl: 'https://img.youtube.com/vi/trailer/hqdefault.jpg',
      },
    ]);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { images: undefined },
    { images: null },
    { images: { success: false, status_code: 11 } },
    { images: { backdrops: null } },
    { videos: undefined },
    { videos: { success: false, status_code: 11 } },
    { videos: { results: {} } },
    { credits: undefined },
    { credits: { cast: [] } },
  ])('rejects partial appended resources: %j', async (partial) => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...detailsResponse, ...partial }),
    );
    const provider = new TmdbMovieProvider(config);

    await expect(provider.findOne(969681)).rejects.toMatchObject({
      message: 'Movie provider response was incomplete',
      name: BadGatewayException.name,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('recovers after a partial response without caching or automatic retries', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ...detailsResponse, images: {} }))
      .mockResolvedValueOnce(jsonResponse(detailsResponse));
    const provider = new TmdbMovieProvider(config);

    await expect(provider.findOne(969681)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    await expect(provider.findOne(969681)).resolves.toMatchObject({
      id: 969681,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when TMDB returns 404 for details', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const provider = new TmdbMovieProvider(config);

    await expect(provider.findOne(999)).resolves.toBeUndefined();
  });

  it('throws a generic gateway error when TMDB returns an unexpected failure', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const provider = new TmdbMovieProvider(config);

    await expect(provider.findOne(1)).rejects.toMatchObject({
      message: 'Movie provider request failed',
      name: BadGatewayException.name,
    });
  });

  it('throws a generic gateway error when the network request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('socket hang up'));

    const provider = new TmdbMovieProvider(config);

    await expect(provider.findOne(1)).rejects.toMatchObject({
      message: 'Movie provider request failed',
      name: BadGatewayException.name,
    });
  });

  it('throws a generic gateway error when TMDB returns invalid JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new Error('invalid json')),
    });

    const provider = new TmdbMovieProvider(config);

    await expect(provider.findOne(1)).rejects.toMatchObject({
      message: 'Movie provider response was invalid',
      name: BadGatewayException.name,
    });
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function moviePage(
  page: number,
  totalPages: number,
  results: ReturnType<typeof movieListItem>[],
  totalResults = totalPages,
): Response {
  return jsonResponse({
    page,
    results,
    total_pages: totalPages,
    total_results: totalResults,
  });
}

function movieListItem(
  id: number,
  genreIds: number[],
  overrides: Partial<TmdbMovieListItem> = {},
): TmdbMovieListItem {
  return {
    id,
    title: `Alpha ${id}`,
    release_date: '2020-01-01',
    poster_path: `/alpha-${id}.jpg`,
    popularity: 100 - id,
    genre_ids: genreIds,
    vote_average: 8,
    overview: `Alpha ${id} overview`,
    ...overrides,
  };
}
