import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
  screen,
  within,
} from '@testing-library/react';
import type { MovieListResponse } from '@movie-explorer/contracts';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';

import List from './list';
import { getMovies as originalGetMovies } from '../../util/apiUtils';

const getMovies = vi.mocked(originalGetMovies);
vi.mock('../../util/apiUtils');

const renderList = (initialEntry = '/search', destinations: string[] = []) => {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      {destinations.map((destination) => (
        <Link key={destination} to={destination}>
          {destination}
        </Link>
      ))}
      <Routes>
        <Route path="/search/:searchQuery?" element={<List />} />
      </Routes>
    </MemoryRouter>
  );
};

const emptyResponse = (total: number) => ({
  movies: [],
  totalResults: total,
  page: 1,
  totalPages: 1,
});

const moviePage = (title: string, page = 1): MovieListResponse => ({
  movies: Array.from({ length: 10 }, (_, index) => ({
    id: (page - 1) * 10 + index + 1,
    title: `${title} ${index + 1}`,
    posterUrl: '',
    genres: [],
  })),
  totalResults: 30,
  page,
  totalPages: 3,
});

function deferredResponse() {
  let resolve!: (response: MovieListResponse) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<MovieListResponse>(
    (resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    }
  );

  return { promise, resolve, reject };
}

async function settleObsoleteRequest(
  request: ReturnType<typeof deferredResponse>,
  outcome: string
) {
  // Deliberately ignore cancellation to verify protection against late responses.
  await act(async () => {
    if (outcome === 'success') {
      request.resolve({
        ...moviePage('Obsolete', 2),
        totalResults: 999,
        totalPages: 2,
      });
    } else {
      request.reject(new Error('Obsolete request failed'));
    }
  });
}

describe('<List />', () => {
  test('sparse pages reveal at most ten new movies per Load more interaction', async () => {
    getMovies
      .mockResolvedValueOnce({
        ...moviePage('First'),
        movies: moviePage('First').movies.slice(0, 3),
      })
      .mockResolvedValueOnce({
        ...moviePage('Next', 2),
        movies: [
          ...moviePage('Next', 2).movies,
          ...moviePage('Last', 3).movies,
        ],
      });
    renderList('/search/Alien?filter=drama');

    await screen.findByText('First 1');
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));

    await screen.findByText('Next 10');
    expect(screen.getAllByRole('article')).toHaveLength(13);
    expect(screen.queryByText('Last 1')).toBeNull();
  });

  test.each([2, 500])(
    'explains empty filtered pages at page %s and respects the provider limit',
    async (page) => {
      getMovies.mockResolvedValue({
        movies: [],
        page,
        totalPages: 900,
        totalResults: 18000,
      });
      renderList('/search/Alien?filter=drama');
      await screen.findByText(
        page === 500
          ? 'No matching movies found.'
          : 'No matching movies yet. Load more to continue.'
      );
      expect(
        Boolean(screen.queryByRole('button', { name: /load more/i }))
      ).toBe(page < 500);
      expect(getMovies).toHaveBeenCalledTimes(1);
    }
  );
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('it displays a loading indicator while fetching data', () => {
    getMovies.mockReturnValue(new Promise(() => {}));

    renderList();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('it displays movies when the fetch is successful', async () => {
    const mockMovies = {
      movies: [
        {
          id: 1,
          title: 'Movie 1',
          releaseDate: '2022-01-01',
          posterUrl: '/movie-1.jpg',
          genres: ['test'],
        },
        {
          id: 2,
          title: 'Movie 2',
          releaseDate: '2023-01-01',
          posterUrl: '/movie-2.jpg',
          genres: ['test', 'crime'],
        },
      ],
      totalResults: 2,
      page: 1,
      totalPages: 1,
    };

    getMovies.mockResolvedValue(mockMovies);

    renderList('/search/Movie?filter=crime&sorting=releaseDate&order=desc');

    expect(
      await screen.findByText('2 matching movies loaded')
    ).toBeInTheDocument();

    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Movie 2')).toBeInTheDocument();
    expect(screen.getByAltText('Movie 1')).toHaveAttribute('loading', 'eager');
    expect(screen.getByAltText('Movie 2')).toHaveAttribute('loading', 'lazy');
    expect(screen.getByText('2 matching movies loaded')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove Crime genre filter' })
    ).toBeVisible();
    expect(screen.queryByText(/genre:/i)).toBeNull();
    expect(screen.getByText(/search:/i)).toHaveTextContent('"Movie"');
    expect(getMovies).toHaveBeenCalledWith(
      {
        sort: null,
        sortOrder: null,
        search: 'Movie',
        genres: 'crime',
        releaseYear: null,
        minimumRating: null,
        page: 1,
      },
      expect.any(AbortSignal)
    );
  });

  test('uses the same coral outline style for default and query Movies listings', async () => {
    const response = {
      movies: Array.from({ length: 11 }, (_, index) => ({
        id: index + 1,
        title: `Movie ${index + 1}`,
        releaseDate: '2022-01-01',
        posterUrl: `/movie-${index + 1}.jpg`,
        genres: ['test'],
      })),
      totalResults: 11,
      page: 1,
      totalPages: 2,
    };
    getMovies.mockResolvedValue(response);

    renderList('/search');
    const homeLoadMore = await screen.findByRole('button', {
      name: 'Load more',
    });
    expect(homeLoadMore).toHaveClass('btn--outline', 'btn--action');

    cleanup();
    getMovies.mockResolvedValue(response);
    renderList('/search/Alien');
    const resultsLoadMore = await screen.findByRole('button', {
      name: 'Load more',
    });
    expect(resultsLoadMore).toHaveClass('btn--outline', 'btn--action');
    expect(resultsLoadMore).not.toHaveClass('btn--primary');
  });

  test('it keeps the results page rendered when a movie has no release date', async () => {
    getMovies.mockResolvedValue({
      movies: [
        {
          id: 1,
          title: 'Undated Movie',
          posterUrl: '',
          genres: [],
        },
      ],
      totalResults: 1,
      page: 1,
      totalPages: 1,
    });

    renderList();

    expect(await screen.findByText('Undated Movie')).toBeInTheDocument();
    expect(screen.getByText('1 movie loaded')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('shows results in batches of 10 and keeps the final partial batch', async () => {
    const user = userEvent.setup();
    const movieBatch = (start: number, count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: start + index,
        title: `Movie ${start + index}`,
        posterUrl: '',
        genres: [],
      }));
    getMovies
      .mockResolvedValueOnce({
        movies: movieBatch(1, 20),
        page: 1,
        totalPages: 2,
        totalResults: 25,
      })
      .mockResolvedValueOnce({
        movies: movieBatch(21, 5),
        page: 2,
        totalPages: 2,
        totalResults: 25,
      });

    renderList();

    expect(await screen.findByText('Movie 10')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /movies found/ })).toBeNull();
    expect(screen.queryByText('Movie 11')).not.toBeInTheDocument();
    expect(screen.getByText('10 movies loaded')).toBeInTheDocument();
    expect(getMovies).toHaveBeenCalledTimes(1);

    const loadMore = screen.getByRole('button', { name: 'Load more' });
    expect(loadMore).toHaveClass('btn--outline', 'btn--action');
    await user.click(loadMore);
    expect(screen.getByText('Movie 20')).toBeInTheDocument();
    expect(screen.queryByText('Movie 21')).not.toBeInTheDocument();
    expect(screen.getByText('20 movies loaded')).toBeInTheDocument();
    expect(getMovies).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Movie 25')).toBeInTheDocument();
    expect(screen.getByText('25 movies loaded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(getMovies).toHaveBeenCalledTimes(2);
    expect(getMovies).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.any(AbortSignal)
    );
  });

  describe.each([
    ['query', '/search/B', { search: 'B', genres: null }],
    ['filter', '/search/A?filter=crime', { search: 'A', genres: 'crime' }],
  ])('changing the %s during Load More', (_, destination, expectedParams) => {
    test.each(['success', 'failure'])(
      'resets loading and ignores obsolete %s after new results arrive',
      async (outcome) => {
        const user = userEvent.setup();
        const obsoletePage = deferredResponse();
        getMovies
          .mockResolvedValueOnce(moviePage('Original'))
          .mockReturnValueOnce(obsoletePage.promise)
          .mockResolvedValueOnce(moviePage('Current'))
          .mockResolvedValueOnce(moviePage('Current page two', 2));

        renderList('/search/A', [destination]);
        await user.click(
          await screen.findByRole('button', { name: 'Load more' })
        );
        expect(
          screen.getByRole('button', { name: /loading more/i })
        ).toBeDisabled();
        const obsoleteSignal = getMovies.mock.calls[1][1];
        expect(obsoleteSignal).toBeInstanceOf(AbortSignal);

        await user.click(screen.getByRole('link', { name: destination }));
        expect(await screen.findByText('Current 1')).toBeInTheDocument();
        expect(obsoleteSignal?.aborted).toBe(true);
        expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled();
        expect(getMovies).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({ ...expectedParams, page: 1 }),
          expect.any(AbortSignal)
        );

        await settleObsoleteRequest(obsoletePage, outcome);

        expect(screen.getByText('Current 1')).toBeInTheDocument();
        expect(screen.queryByText('Original 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Obsolete 1')).not.toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(
          screen.queryByRole('heading', {
            name: /30 .*results|30 movies found/,
          })
        ).toBeNull();
        expect(
          screen.getByText(/10 (matching )?movies loaded/)
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Load more' }));
        expect(
          await screen.findByText('Current page two 1')
        ).toBeInTheDocument();
        expect(getMovies).toHaveBeenLastCalledWith(
          expect.objectContaining({ ...expectedParams, page: 2 }),
          expect.any(AbortSignal)
        );
      }
    );
  });

  test.each(['success', 'failure'])(
    'obsolete page %s cannot clear a newer page request loading state',
    async (outcome) => {
      const user = userEvent.setup();
      const obsoletePage = deferredResponse();
      const currentPage = deferredResponse();
      getMovies
        .mockResolvedValueOnce(moviePage('Original'))
        .mockReturnValueOnce(obsoletePage.promise)
        .mockResolvedValueOnce(moviePage('Current'))
        .mockReturnValueOnce(currentPage.promise);
      renderList('/search/A', ['/search/B']);
      await user.click(
        await screen.findByRole('button', { name: 'Load more' })
      );
      await user.click(screen.getByRole('link', { name: '/search/B' }));
      await user.click(
        await screen.findByRole('button', { name: 'Load more' })
      );

      await settleObsoleteRequest(obsoletePage, outcome);

      const loadingButton = screen.getByRole('button', {
        name: /loading more/i,
      });
      expect(loadingButton).toBeDisabled();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      await user.click(loadingButton);
      expect(getMovies).toHaveBeenCalledTimes(4);
      await act(async () =>
        currentPage.resolve(moviePage('Current page two', 2))
      );
      expect(screen.getByText('Current page two 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled();
    }
  );

  test('repeated Load More activation requests each provider page only once', async () => {
    const user = userEvent.setup();
    const nextPage = deferredResponse();
    getMovies
      .mockResolvedValueOnce(moviePage('First page'))
      .mockReturnValueOnce(nextPage.promise)
      .mockResolvedValueOnce(moviePage('Third page', 3));
    renderList();
    const button = await screen.findByRole('button', { name: 'Load more' });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(getMovies).toHaveBeenCalledTimes(2);
    expect(button).toBeDisabled();
    await act(async () => nextPage.resolve(moviePage('Second page', 2)));
    expect(screen.getByText('20 movies loaded')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Third page 1')).toBeInTheDocument();
    expect(getMovies.mock.calls.map(([params]) => params.page)).toEqual([
      1, 2, 3,
    ]);
  });

  describe.each(['initial load', 'initial retry'])(
    '%s lifecycle',
    (requestPath) => {
      describe.each(['success', 'failure'])('obsolete %s', (outcome) => {
        test.each([true, false])(
          'ignores obsolete responses with new results completed: %s',
          async (newResultsCompleted) => {
            const user = userEvent.setup();
            const obsoleteRequest = deferredResponse();
            const currentRequest = deferredResponse();

            if (requestPath === 'initial retry') {
              getMovies.mockRejectedValueOnce(new Error('Initial load failed'));
            }
            getMovies
              .mockReturnValueOnce(obsoleteRequest.promise)
              .mockReturnValueOnce(currentRequest.promise)
              .mockResolvedValueOnce(moviePage('Current page two', 2));
            renderList('/search/A', ['/search/B']);
            if (requestPath === 'initial retry') {
              await user.click(
                await screen.findByRole('button', { name: 'Try again' })
              );
            }
            const obsoleteSignal = getMovies.mock.lastCall?.[1];
            expect(obsoleteSignal).toBeInstanceOf(AbortSignal);
            expect(screen.getByText(/loading/i)).toBeInTheDocument();

            await user.click(screen.getByRole('link', { name: '/search/B' }));
            expect(obsoleteSignal?.aborted).toBe(true);
            if (newResultsCompleted) {
              await act(async () =>
                currentRequest.resolve(moviePage('Current'))
              );
            }
            await settleObsoleteRequest(obsoleteRequest, outcome);

            if (!newResultsCompleted) {
              expect(screen.getByText(/loading/i)).toBeInTheDocument();
              expect(screen.queryByText('Obsolete 1')).not.toBeInTheDocument();
              expect(screen.queryByRole('alert')).not.toBeInTheDocument();
              await act(async () =>
                currentRequest.resolve(moviePage('Current'))
              );
            }
            expect(screen.getByText('Current 1')).toBeInTheDocument();
            expect(screen.queryByText('Obsolete 1')).not.toBeInTheDocument();
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
            expect(
              screen.queryByRole('heading', { name: /movies found/ })
            ).toBeNull();
            expect(screen.getByText('10 movies loaded')).toBeInTheDocument();
            await user.click(screen.getByRole('button', { name: 'Load more' }));
            expect(
              await screen.findByText('Current page two 1')
            ).toBeInTheDocument();
            expect(getMovies).toHaveBeenLastCalledWith(
              expect.objectContaining({ search: 'B', page: 2 }),
              expect.any(AbortSignal)
            );
          }
        );
      });
    }
  );

  test('rapid query and filter changes cancel every obsolete request', async () => {
    const user = userEvent.setup();
    const obsoletePage = deferredResponse();
    const middleQuery = deferredResponse();
    const middleFilter = deferredResponse();
    const destinations = [
      '/search/B',
      '/search/B?filter=crime',
      '/search/C?year=2020&rating=7',
    ];
    getMovies
      .mockResolvedValueOnce(moviePage('Original'))
      .mockReturnValueOnce(obsoletePage.promise)
      .mockReturnValueOnce(middleQuery.promise)
      .mockReturnValueOnce(middleFilter.promise)
      .mockResolvedValueOnce(moviePage('Latest'));
    renderList('/search/A', destinations);
    await user.click(await screen.findByRole('button', { name: 'Load more' }));
    await user.click(screen.getByRole('link', { name: destinations[0] }));
    await user.click(screen.getByRole('link', { name: destinations[1] }));
    await user.click(screen.getByRole('link', { name: destinations[2] }));
    expect(await screen.findByText('Latest 1')).toBeInTheDocument();
    expect(
      getMovies.mock.calls.slice(0, -1).every(([, signal]) => signal?.aborted)
    ).toBe(true);
    expect(getMovies.mock.lastCall?.[1]?.aborted).toBe(false);
    await settleObsoleteRequest(middleFilter, 'failure');
    await settleObsoleteRequest(obsoletePage, 'success');
    await settleObsoleteRequest(middleQuery, 'success');
    expect(screen.getByText('Latest 1')).toBeInTheDocument();
    expect(screen.queryByText('Obsolete 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled();
    expect(getMovies).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'C',
        genres: null,
        releaseYear: '2020',
        minimumRating: '7',
        page: 1,
      }),
      expect.any(AbortSignal)
    );
  });

  describe.each(['initial', 'additional page'])(
    '%s request unmount',
    (phase) => {
      test.each(['success', 'failure'])(
        'aborts and ignores late %s without disturbing a newly mounted list',
        async (outcome) => {
          const obsolete = deferredResponse();
          const current = deferredResponse();

          if (phase === 'additional page') {
            getMovies.mockResolvedValueOnce(moviePage('Original'));
          }
          getMovies
            .mockReturnValueOnce(obsolete.promise)
            .mockReturnValueOnce(current.promise);
          renderList('/search/Old');
          if (phase === 'additional page') {
            fireEvent.click(
              await screen.findByRole('button', { name: 'Load more' })
            );
          }
          const signal = getMovies.mock.lastCall?.[1];

          cleanup();
          expect(signal?.aborted).toBe(true);
          renderList('/search/Current');
          await settleObsoleteRequest(obsolete, outcome);

          expect(screen.getByText(/loading/i)).toBeInTheDocument();
          expect(screen.queryByText('Obsolete 1')).not.toBeInTheDocument();
          expect(screen.queryByRole('alert')).not.toBeInTheDocument();
          await act(async () => current.resolve(moviePage('Current')));
          expect(screen.getByText('Current 1')).toBeInTheDocument();
          expect(screen.getByText('10 movies loaded')).toBeInTheDocument();
        }
      );
    }
  );

  test('overlapping pages replace movie metadata in first-seen order, including duplicates within a page', async () => {
    const [first, second, third] = moviePage('Original').movies;
    getMovies
      .mockResolvedValueOnce({
        ...moviePage('Original'),
        movies: [first, second, { ...first, title: 'First revised' }],
      })
      .mockResolvedValueOnce({
        ...moviePage('Next', 2),
        movies: [{ ...second, title: 'Second revised' }, third],
      })
      .mockResolvedValueOnce({
        ...moviePage('Last', 3),
        movies: [{ ...first, title: 'First final' }],
      });
    renderList();
    await screen.findByRole('link', { name: 'First revised' });
    expect(screen.getAllByRole('article')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByRole('link', { name: 'Second revised' });
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByRole('link', { name: 'First final' });

    expect(
      screen
        .getAllByRole('article')
        .map((article) =>
          within(article).getByRole('link').getAttribute('aria-label')
        )
    ).toEqual(['First final', 'Second revised', third.title]);
    expect(screen.getByText('3 movies loaded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(getMovies.mock.calls.map(([params]) => params.page)).toEqual([
      1, 2, 3,
    ]);
  });

  test('it omits capped default totals and keeps loaded item counts', async () => {
    getMovies.mockResolvedValue(emptyResponse(20_001));

    renderList();

    expect(await screen.findByText('0 movies loaded')).toBeInTheDocument();
    expect(screen.queryByText(/20001 movies found/)).toBeNull();
  });

  test('it omits query and filter totals when their exactness is unknown', async () => {
    getMovies.mockResolvedValue(emptyResponse(837));

    renderList('/search?filter=documentary');

    expect(await screen.findByText('0 movies loaded')).toBeInTheDocument();
    expect(screen.queryByText(/837 movies found/)).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Remove Documentary genre filter' })
    ).toBeVisible();
    expect(screen.queryByText(/genre:/i)).toBeNull();
  });

  test('it omits query-based totals when their exactness is unknown', async () => {
    getMovies.mockResolvedValue(emptyResponse(126));

    renderList('/search/Alpha');

    expect(await screen.findByText('0 movies loaded')).toBeInTheDocument();
    expect(screen.queryByText(/126 movies found/)).toBeNull();
    expect(screen.getByText(/search:/i)).toHaveTextContent('Search: "Alpha"');
  });

  test('it updates the total when a genre filter changes and is cleared', async () => {
    const user = userEvent.setup();
    getMovies
      .mockResolvedValueOnce(emptyResponse(20_001))
      .mockResolvedValueOnce(emptyResponse(837))
      .mockResolvedValueOnce(emptyResponse(20_001));

    render(
      <MemoryRouter initialEntries={['/search']}>
        <Link to="?filter=documentary">Documentary</Link>
        <Link to="/search">All</Link>
        <Routes>
          <Route path="/search/:searchQuery?" element={<List />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('0 movies loaded')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Documentary' }));
    expect(await screen.findByText('0 movies loaded')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove Documentary genre filter' })
    ).toBeVisible();
    expect(screen.queryByText(/genre:/i)).toBeNull();

    await user.click(screen.getByRole('link', { name: 'All' }));
    expect(await screen.findByText('0 movies loaded')).toBeInTheDocument();
    expect(screen.queryByText(/genre:/i)).toBeNull();
  });

  test('it updates and clears the active search context', async () => {
    const user = userEvent.setup();
    getMovies
      .mockResolvedValueOnce(emptyResponse(126))
      .mockResolvedValueOnce(emptyResponse(20_001));

    render(
      <MemoryRouter initialEntries={['/search/Alien']}>
        <Link to="/search">Clear search</Link>
        <Routes>
          <Route path="/search/:searchQuery?" element={<List />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/search:/i)).toHaveTextContent(
      'Search: "Alien"'
    );

    await user.click(screen.getByRole('link', { name: 'Clear search' }));
    expect(await screen.findByText('0 movies loaded')).toBeInTheDocument();
    expect(screen.queryByText(/search:/i)).toBeNull();
  });

  test('it displays an error message when the fetch fails', async () => {
    getMovies.mockRejectedValue(new Error('Failed to fetch movies'));

    renderList();

    await waitFor(() =>
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    );
    expect(
      screen.getByText("We couldn't load this information. Please try again.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Failed to fetch movies/)
    ).not.toBeInTheDocument();
  });

  test('it retries loading movies from the error state', async () => {
    const user = userEvent.setup();

    getMovies
      .mockRejectedValueOnce(new Error('Failed to fetch movies'))
      .mockResolvedValueOnce({
        movies: [],
        totalResults: 0,
        page: 1,
        totalPages: 0,
      });

    renderList();

    await screen.findByText('Something went wrong');
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('No movies available.')).toBeInTheDocument();
    expect(getMovies).toHaveBeenCalledTimes(2);
  });

  test('it displays an empty state for searches with no results', async () => {
    getMovies.mockResolvedValue({
      movies: [],
      totalResults: 0,
      page: 1,
      totalPages: 0,
    });

    renderList('/search/Nope');

    expect(
      await screen.findByText('No movies found for "Nope".')
    ).toBeInTheDocument();
    expect(screen.getByText('0 movies loaded')).toBeInTheDocument();
  });

  test('loads the next page, appends movies, and removes overlapping ids', async () => {
    const user = userEvent.setup();
    const firstMovie = {
      id: 1,
      title: 'First movie',
      releaseDate: '2020-01-01',
      posterUrl: '',
      genres: ['Drama'],
    };
    const secondMovie = { ...firstMovie, id: 2, title: 'Second movie' };
    getMovies
      .mockResolvedValueOnce({
        movies: [firstMovie],
        page: 1,
        totalPages: 2,
        totalResults: 2,
      })
      .mockResolvedValueOnce({
        movies: [firstMovie, secondMovie],
        page: 2,
        totalPages: 2,
        totalResults: 2,
      });

    renderList();
    await screen.findByText('First movie');
    await user.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByText('Second movie')).toBeInTheDocument();
    expect(screen.getAllByText('First movie')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    expect(screen.getByText('2 movies loaded')).toBeInTheDocument();
  });

  test('keeps loaded movies and offers retry when a later page fails', async () => {
    const user = userEvent.setup();
    getMovies
      .mockResolvedValueOnce({
        movies: [
          {
            id: 1,
            title: 'First movie',
            releaseDate: '2020-01-01',
            posterUrl: '',
            genres: [],
          },
        ],
        page: 1,
        totalPages: 2,
        totalResults: 2,
      })
      .mockRejectedValueOnce(new Error('page failed'))
      .mockResolvedValueOnce({
        movies: [],
        page: 2,
        totalPages: 2,
        totalResults: 2,
      });

    renderList();
    await user.click(await screen.findByRole('button', { name: 'Load more' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't load this information. Please try again."
    );
    expect(screen.getByText('First movie')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(getMovies).toHaveBeenCalledTimes(3));
    expect(screen.getByText('First movie')).toBeInTheDocument();
  });
});
