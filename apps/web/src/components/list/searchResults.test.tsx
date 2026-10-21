import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import type {
  MovieListResponse,
  PersonListResponse,
} from '@movie-explorer/contracts';
import SearchResults from './searchResults';
import { ApiRequestError, getMovies, getPeople } from '../../util/apiUtils';
import SearchHistoryProvider from './searchHistory';

vi.mock('../../util/apiUtils', async () => ({
  ...(await vi.importActual<typeof import('../../util/apiUtils')>(
    '../../util/apiUtils'
  )),
  getMovies: vi.fn(),
  getPeople: vi.fn(),
}));
const peoplePage = (page = 1, count = 20): PersonListResponse => ({
  people: Array.from({ length: count }, (_, index) => ({
    id: (page - 1) * 20 + index + 1,
    name: `Person ${(page - 1) * 20 + index + 1}`,
    knownForDepartment: 'Acting',
  })),
  page,
  totalPages: 2,
  totalResults: 40,
});
function setup(
  path = '/search/Actor?filter=drama&year=2000&rating=8&sorting=title&order=asc'
) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <SearchHistoryProvider>
            <Outlet />
          </SearchHistoryProvider>
        ),
        children: [
          { path: '/search/:searchQuery?', element: <SearchResults /> },
          { path: '/person/:id', element: <h1>Person details</h1> },
          { path: '/movie/:id', element: <h1>Movie details</h1> },
        ],
      },
    ],
    { initialEntries: [path] }
  );
  render(<RouterProvider router={router} />);
  return router;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.mocked(getMovies).mockResolvedValue({
    movies: [{ id: 1, title: 'Movie result', posterUrl: '', genres: [] }],
    page: 1,
    totalPages: 1,
    totalResults: 1,
  });
  vi.mocked(getPeople).mockResolvedValue(peoplePage());
});
afterEach(() => vi.restoreAllMocks());

test('defaults to Movies, scopes filters, lazily loads People and retains independent results across URL history', async () => {
  const router = setup();
  await screen.findByRole('link', { name: 'Movie result' });
  expect(getPeople).not.toHaveBeenCalled();
  expect(getMovies).toHaveBeenCalledWith(
    expect.objectContaining({
      search: 'Actor',
      genres: 'drama',
      releaseYear: '2000',
      minimumRating: '8',
      sort: null,
    }),
    expect.any(AbortSignal)
  );
  fireEvent.click(screen.getByRole('link', { name: 'Persons' }));
  await screen.findByRole('link', { name: 'Person 1' });
  expect(router.state.location.pathname).toBe('/search/Actor');
  expect(new URLSearchParams(router.state.location.search).get('view')).toBe(
    'people'
  );
  expect(getPeople).toHaveBeenCalledWith('Actor', 1, expect.any(AbortSignal));
  expect(screen.queryByRole('link', { name: 'Movie result' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Filters & Sort/ })).toBeNull();
  expect(
    screen.getByRole('region', { name: 'People results' })
  ).toHaveTextContent('Acting');
  await act(async () => {
    await router.navigate(-1);
  });
  expect(screen.getByRole('link', { name: 'Movie result' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Movies' })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await act(async () => {
    await router.navigate(1);
  });
  expect(screen.getByRole('link', { name: 'Person 1' })).toBeVisible();
  expect(getMovies).toHaveBeenCalledTimes(1);
  expect(getPeople).toHaveBeenCalledTimes(1);
});

test('direct People links do not fetch movies, reveal ten at a time, paginate, deduplicate and retry failed pages', async () => {
  vi.mocked(getPeople)
    .mockResolvedValueOnce(peoplePage())
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      ...peoplePage(2),
      people: [peoplePage().people[0], ...peoplePage(2).people],
    });
  setup('/search/Actor?view=people');
  const region = await screen.findByRole('region', { name: 'People results' });
  expect(within(region).getAllByRole('article')).toHaveLength(10);
  expect(getMovies).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(within(region).getAllByRole('article')).toHaveLength(20);
  expect(getPeople).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    "We couldn't load this information. Please try again."
  );
  expect(within(region).getAllByRole('article')).toHaveLength(20);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('link', { name: 'Person 30' });
  expect(within(region).getAllByRole('article')).toHaveLength(30);
  expect(getPeople).toHaveBeenLastCalledWith(
    'Actor',
    2,
    expect.any(AbortSignal)
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(within(region).getAllByRole('article')).toHaveLength(40);
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: 'Person 1' }));
  expect(
    await screen.findByRole('heading', { name: 'Person details' })
  ).toBeVisible();
});

test('shows initial loading, error, retry and empty states', async () => {
  let reject!: (reason: Error) => void;
  vi.mocked(getPeople)
    .mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail;
      })
    )
    .mockResolvedValueOnce({
      people: [],
      page: 1,
      totalPages: 0,
      totalResults: 0,
    });
  setup('/search/Absent?view=people');
  expect(screen.getByRole('status')).toBeInTheDocument();
  await act(async () => {
    reject(new Error('offline'));
  });
  expect(screen.getByText('Something went wrong')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByText('No people found for "Absent".')
  ).toBeVisible();
});

test('new committed terms cancel obsolete person results', async () => {
  let resolve!: (value: PersonListResponse) => void;
  vi.mocked(getPeople)
    .mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    )
    .mockResolvedValueOnce({
      people: [{ id: 88, name: 'New person' }],
      page: 1,
      totalPages: 1,
      totalResults: 1,
    });
  const router = setup('/search/Old?view=people');
  const signal = vi.mocked(getPeople).mock.calls[0][2];
  await act(async () => {
    await router.navigate('/search/New?view=people');
  });
  await screen.findByRole('link', { name: 'New person' });
  expect(signal?.aborted).toBe(true);
  await act(async () => {
    resolve(peoplePage());
  });
  expect(screen.queryByRole('link', { name: 'Person 1' })).toBeNull();
});

test('filter editing makes no requests, Apply refreshes once, and normalization never fetches invalid filters', async () => {
  const router = setup(
    '/search?filter=bad&filter=drama&year=bad&rating=3&extra=keep'
  );
  await screen.findByRole('link', { name: 'Movie result' });
  expect(router.state.location.search).toBe('?extra=keep');
  expect(getMovies).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /Filters & Sort/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Genre/ }));
  fireEvent.click(screen.getByRole('button', { name: 'drama' }));
  fireEvent.click(screen.getByRole('button', { name: /^Release Year/ }));
  fireEvent.change(screen.getByLabelText('Release year'), {
    target: { value: '2000' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^Minimum Rating/ }));
  fireEvent.change(screen.getByLabelText('Minimum TMDB rating'), {
    target: { value: '8' },
  });
  expect(
    screen.queryByRole('button', { name: 'Remove Drama genre filter' })
  ).toBeNull();
  expect(getMovies).toHaveBeenCalledTimes(1);
  expect(router.state.location.search).toBe('?extra=keep');
  const firstSignal = vi.mocked(getMovies).mock.calls[0][1];
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  await screen.findByRole('link', { name: 'Movie result' });
  expect(getMovies).toHaveBeenCalledTimes(2);
  expect(firstSignal?.aborted).toBe(true);
  expect(getMovies).toHaveBeenLastCalledWith(
    expect.objectContaining({
      genres: 'drama',
      releaseYear: '2000',
      minimumRating: '8',
    }),
    expect.any(AbortSignal)
  );
  expect(router.state.location.search).toBe(
    '?extra=keep&filter=drama&year=2000&rating=8'
  );
  expect(
    screen.getByRole('button', { name: 'Remove Drama genre filter' })
  ).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: 'Persons' }));
  await screen.findByRole('link', { name: 'Person 1' });
  expect(router.state.location.search).toContain('filter=drama');
  expect(getPeople).toHaveBeenCalledWith('', 1, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole('link', { name: 'Movies' }));
  expect(screen.getByRole('link', { name: 'Movie result' })).toBeVisible();
  expect(getMovies).toHaveBeenCalledTimes(2);
});

test('committed filter badges remove one filter or clear all while preserving query and view', async () => {
  const router = setup('/search/Alien?filter=action&year=2026&rating=7');
  await screen.findByRole('link', { name: 'Movie result' });
  expect(
    screen.getByRole('button', { name: 'Remove Action genre filter' })
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Remove 2026 filter' })
  ).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Remove Rating 7+ filter' })
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Clear all' })).toBeVisible();
  const firstSignal = vi.mocked(getMovies).mock.calls[0][1];
  fireEvent.click(
    screen.getByRole('button', { name: 'Remove Action genre filter' })
  );
  await screen.findByRole('link', { name: 'Movie result' });
  expect(router.state.location.pathname).toBe('/search/Alien');
  expect(router.state.location.search).toBe('?year=2026&rating=7');
  expect(firstSignal?.aborted).toBe(true);
  expect(getMovies).toHaveBeenCalledTimes(2);

  const peopleRouter = setup(
    '/search/Alien?view=people&filter=action&year=2026'
  );
  await screen.findByRole('link', { name: 'Person 1' });
  expect(
    screen.queryByRole('button', { name: 'Remove Action genre filter' })
  ).toBeNull();
  expect(
    new URLSearchParams(peopleRouter.state.location.search).get('filter')
  ).toBe('action');
});

test('Clear all preserves the query and clears supported movie filters in one request', async () => {
  const router = setup(
    '/search/Alien?filter=action&year=2026&rating=7&sorting=title&order=asc'
  );
  await screen.findByRole('link', { name: 'Movie result' });
  const before = vi.mocked(getMovies).mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
  await screen.findByRole('link', { name: 'Movie result' });
  expect(router.state.location.pathname).toBe('/search/Alien');
  expect(router.state.location.search).toBe('');
  expect(vi.mocked(getMovies)).toHaveBeenCalledTimes(before + 1);
});

test.each(['movies', 'people'])(
  'restores loaded %s and scroll after detail navigation and Back/Forward without refetching',
  async (view) => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(735);
    vi.mocked(getMovies).mockResolvedValue({
      movies: peoplePage().people.map((person) => ({
        id: person.id,
        title: person.name,
        posterUrl: '',
        genres: [],
      })),
      page: 1,
      totalPages: 1,
      totalResults: 20,
    });
    const router = setup(
      `/search/Actor${view === 'people' ? '?view=people' : ''}`
    );
    await screen.findByRole('link', { name: 'Person 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(screen.getByRole('link', { name: 'Person 20' })).toBeVisible();
    fireEvent(window, new Event('scroll'));
    fireEvent.click(screen.getByRole('link', { name: 'Person 20' }));
    await screen.findByRole('heading', {
      name: view === 'people' ? 'Person details' : 'Movie details',
    });
    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByRole('link', { name: 'Person 20' })).toBeVisible();
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: 735,
      behavior: 'instant',
    });
    await act(async () => {
      await router.navigate(1);
    });
    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByRole('link', { name: 'Person 20' })).toBeVisible();
    expect(view === 'people' ? getPeople : getMovies).toHaveBeenCalledTimes(1);
  }
);

test('filter history restores the compatible batch while a new filter loads fresh results', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.mocked(getMovies).mockResolvedValue({
    movies: peoplePage().people.map((person) => ({
      id: person.id,
      title: person.name,
      posterUrl: '',
      genres: [],
    })),
    page: 1,
    totalPages: 1,
    totalResults: 20,
  });
  const router = setup('/search/Actor?filter=drama');
  await screen.findByRole('link', { name: 'Person 1' });
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  fireEvent.click(
    screen.getByRole('button', { name: 'Remove Drama genre filter' })
  );
  await screen.findByRole('link', { name: 'Person 1' });
  expect(screen.queryByRole('link', { name: 'Person 20' })).toBeNull();
  expect(getMovies).toHaveBeenCalledTimes(2);
  await act(async () => {
    await router.navigate(-1);
  });
  expect(screen.getByRole('link', { name: 'Person 20' })).toBeVisible();
  expect(getMovies).toHaveBeenCalledTimes(2);
});

test('sparse People pages reveal at most ten additional cards per interaction', async () => {
  vi.mocked(getPeople)
    .mockResolvedValueOnce(peoplePage(1, 3))
    .mockResolvedValueOnce(peoplePage(2));
  setup('/search/Actor?view=people');
  await screen.findByRole('link', { name: 'Person 1' });
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  await screen.findByRole('link', { name: 'Person 30' });
  expect(screen.getAllByRole('article')).toHaveLength(13);
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(screen.getAllByRole('article')).toHaveLength(23);
  expect(getPeople).toHaveBeenCalledTimes(2);
});

test('returning from Details resumes the next provider page and changing filters resets to page one', async () => {
  const moviePage = (page: number): MovieListResponse => ({
    movies: [
      { id: page, title: `Page ${page} movie`, posterUrl: '', genres: [] },
    ],
    page,
    totalPages: 3,
    totalResults: 3,
  });
  vi.mocked(getMovies).mockImplementation(async ({ page = 1 }) =>
    moviePage(page)
  );
  const router = setup('/search/Actor?filter=drama');
  await screen.findByRole('link', { name: 'Page 1 movie' });
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  fireEvent.click(await screen.findByRole('link', { name: 'Page 2 movie' }));
  await screen.findByRole('heading', { name: 'Movie details' });

  await act(async () => router.navigate(-1));
  expect(screen.getByRole('link', { name: 'Page 2 movie' })).toBeVisible();
  expect(getMovies).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  await screen.findByRole('link', { name: 'Page 3 movie' });
  expect(getMovies).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 3, genres: 'drama' }),
    expect.any(AbortSignal)
  );
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();

  fireEvent.click(
    screen.getByRole('button', { name: 'Remove Drama genre filter' })
  );
  await screen.findByRole('link', { name: 'Page 1 movie' });
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(getMovies).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 1, genres: null }),
    expect.any(AbortSignal)
  );
});

test('history evicts the oldest movie snapshot after thirty entries while retaining newer entries', async () => {
  const router = setup('/search/Actor?year=1900');
  await screen.findByRole('link', { name: 'Movie result' });

  await Array.from({ length: 30 }, (_, index) => 1901 + index).reduce(
    async (previousVisit, year) => {
      await previousVisit;
      await act(async () => router.navigate(`/search/Actor?year=${year}`));
      await screen.findByRole('link', { name: 'Movie result' });
    },
    Promise.resolve()
  );
  expect(getMovies).toHaveBeenCalledTimes(31);
  vi.mocked(getMovies).mockResolvedValueOnce({
    movies: [
      { id: 2, title: 'Fresh oldest result', posterUrl: '', genres: [] },
    ],
    page: 1,
    totalPages: 1,
    totalResults: 1,
  });

  await act(async () => router.navigate(-30));
  expect(
    await screen.findByRole('link', { name: 'Fresh oldest result' })
  ).toBeVisible();
  expect(router.state.location.search).toBe('?year=1900');
  expect(getMovies).toHaveBeenCalledTimes(32);

  await act(async () => router.navigate(2));
  expect(screen.getByRole('link', { name: 'Movie result' })).toBeVisible();
  expect(router.state.location.search).toBe('?year=1902');
  expect(getMovies).toHaveBeenCalledTimes(32);
});

test.each(['success', 'failure'])(
  'leaving during pagination preserves the snapshot and ignores late %s after Back',
  async (outcome) => {
    let resolve!: (response: MovieListResponse) => void;
    let reject!: (error: Error) => void;
    const obsolete = new Promise<MovieListResponse>((done, fail) => {
      resolve = done;
      reject = fail;
    });
    vi.mocked(getMovies)
      .mockResolvedValueOnce({
        movies: [{ id: 1, title: 'Saved movie', posterUrl: '', genres: [] }],
        page: 1,
        totalPages: 2,
        totalResults: 2,
      })
      .mockReturnValueOnce(obsolete)
      .mockResolvedValueOnce({
        movies: [{ id: 2, title: 'Movie result', posterUrl: '', genres: [] }],
        page: 2,
        totalPages: 2,
        totalResults: 2,
      });
    const router = setup('/search/Actor');
    await screen.findByRole('link', { name: 'Saved movie' });
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    const signal = vi.mocked(getMovies).mock.calls[1][1];
    fireEvent.click(screen.getByRole('link', { name: 'Saved movie' }));
    await screen.findByRole('heading', { name: 'Movie details' });
    expect(signal?.aborted).toBe(true);

    await act(async () => router.navigate(-1));
    expect(screen.getByRole('link', { name: 'Saved movie' })).toBeVisible();
    expect(getMovies).toHaveBeenCalledTimes(2);
    await act(async () => {
      if (outcome === 'success') {
        resolve({
          movies: [
            { id: 2, title: 'Obsolete movie', posterUrl: '', genres: [] },
          ],
          page: 2,
          totalPages: 2,
          totalResults: 2,
        });
      } else {
        reject(new Error('Obsolete page failed'));
      }
    });
    expect(screen.queryByRole('link', { name: 'Obsolete movie' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByRole('link', { name: 'Movie result' });
    expect(getMovies).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.any(AbortSignal)
    );
    expect(screen.getByRole('link', { name: 'Saved movie' })).toBeVisible();
  }
);

test.each(['movies', 'people'] as const)(
  '%s inline classified failures retain Retry focus and guard pending requests',
  async (view) => {
    const request =
      view === 'movies' ? vi.mocked(getMovies) : vi.mocked(getPeople);
    let reject!: (error: unknown) => void;
    request.mockRejectedValueOnce(new ApiRequestError('timeout'));
    request.mockReturnValueOnce(
      new Promise<never>((_, fail) => {
        reject = fail;
      })
    );
    setup(`/search/Actor${view === 'people' ? '?view=people' : ''}`);
    await screen.findByRole('heading', { name: 'Request timed out' });
    const retry = screen.getByRole('button', { name: 'Try again' });
    retry.focus();
    fireEvent.click(retry);
    fireEvent.click(retry);
    expect(request).toHaveBeenCalledTimes(2);
    expect(retry).toHaveAttribute('aria-disabled', 'true');
    expect(retry).toHaveFocus();
    await act(async () => reject(new ApiRequestError('network')));
    expect(
      screen.getByRole('heading', { name: 'Connection problem' })
    ).toBeVisible();
    expect(retry).toHaveFocus();
  }
);

test('query Persons Load more uses the default outline variant during loading and disables repeated requests', async () => {
  let resolve!: (value: PersonListResponse) => void;
  vi.mocked(getPeople)
    .mockResolvedValueOnce(peoplePage(1, 10))
    .mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
  setup('/search/Actor?view=people');
  const button = await screen.findByRole('button', { name: 'Load more' });
  expect(button).toHaveClass('btn--outline', 'btn--action');
  expect(button).not.toHaveClass('btn--primary');
  fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(button).toHaveTextContent('Loading more...');
  fireEvent.click(button);
  expect(getPeople).toHaveBeenCalledTimes(2);
  await act(async () => {
    resolve(peoplePage(2, 1));
  });
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Person 21' })).toBeVisible();
});
