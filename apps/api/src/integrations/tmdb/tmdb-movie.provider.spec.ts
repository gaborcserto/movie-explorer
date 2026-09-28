import { BadGatewayException } from '@nestjs/common';
import { TmdbMovieProvider } from './tmdb-movie.provider';

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
          genres: ['Drama', 'Comedy'],
        },
      ],
      total: 1,
      offset: 0,
      limit: 10,
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
      }),
    );

    const provider = new TmdbMovieProvider(config);

    await expect(provider.findOne(1)).resolves.toEqual({
      id: 1,
      title: 'Alpha',
      releaseDate: '2020-01-01',
      posterUrl: 'https://image.tmdb.org/t/p/w500/alpha.jpg',
      genres: ['Drama'],
      rating: 8,
      runtimeMinutes: 100,
      description: 'Alpha overview',
    });
  });

  it('bounds TMDB requests for combined search and genre filters', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(genreResponse))
      .mockResolvedValueOnce(moviePage(1, 500, [movieListItem(1, [18])]))
      .mockResolvedValueOnce(moviePage(2, 500, [movieListItem(2, [35])]))
      .mockResolvedValueOnce(moviePage(3, 500, [movieListItem(3, [18])]))
      .mockResolvedValueOnce(moviePage(4, 500, [movieListItem(4, [35])]))
      .mockResolvedValueOnce(moviePage(5, 500, [movieListItem(5, [18])]));

    const provider = new TmdbMovieProvider(config);

    await expect(
      provider.findAll({
        search: 'Alpha',
        genre: 'Drama',
        limit: 10,
      }),
    ).resolves.toMatchObject({
      movies: [
        { id: 1, genres: ['Drama'] },
        { id: 3, genres: ['Drama'] },
        { id: 5, genres: ['Drama'] },
      ],
      total: 3,
      offset: 0,
      limit: 10,
    });

    expect(fetchMock).toHaveBeenCalledTimes(6);
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
): Response {
  return jsonResponse({
    page,
    results,
    total_pages: totalPages,
    total_results: totalPages,
  });
}

function movieListItem(id: number, genreIds: number[]) {
  return {
    id,
    title: `Alpha ${id}`,
    release_date: '2020-01-01',
    poster_path: `/alpha-${id}.jpg`,
    genre_ids: genreIds,
    vote_average: 8,
    overview: `Alpha ${id} overview`,
  };
}
