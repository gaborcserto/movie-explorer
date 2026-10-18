import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import App from '../../App';
import {
  ApiRequestError,
  getMovie,
  getMovieSection,
  getFilmography,
  getPerson,
  getMovies,
  getPeople,
} from '../../util/apiUtils';

vi.mock('../../util/apiUtils', async () => ({
  ...(await vi.importActual<typeof import('../../util/apiUtils')>(
    '../../util/apiUtils'
  )),
  getMovie: vi.fn(),
  getMovieSection: vi.fn(),
  getFilmography: vi.fn(),
  getPerson: vi.fn(),
  getMovies: vi.fn(),
  getPeople: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

function setup(path: string, prior?: string) {
  const router = createMemoryRouter([{ path: '*', element: <App /> }], {
    initialEntries: prior ? [prior, path] : [path],
    initialIndex: prior ? 1 : 0,
  });
  render(<RouterProvider router={router} />);
  return router;
}

test.each(['movie', 'person'] as const)(
  '%s retries the same ID, guards duplicate clicks, keeps focus, and recovers after repeated failures',
  async (kind) => {
    const request =
      kind === 'movie' ? vi.mocked(getMovie) : vi.mocked(getPerson);
    let reject!: (error: unknown) => void;
    request.mockRejectedValueOnce(new ApiRequestError('network'));
    request.mockReturnValueOnce(
      new Promise<never>((_, fail) => {
        reject = fail;
      })
    );
    if (kind === 'movie')
      vi.mocked(getMovie).mockResolvedValueOnce({
        id: 42,
        title: 'Recovered movie',
        genres: [],
        cast: [],
        posterUrl: '',
      });
    else
      vi.mocked(getPerson).mockResolvedValueOnce({
        id: 42,
        name: 'Recovered person',
        filmography: [],
      });
    setup(`/${kind}/42`);
    await screen.findByRole('heading', { name: 'Connection problem' });
    const retry = screen.getByRole('button', { name: 'Try again' });
    retry.focus();
    fireEvent.click(retry);
    fireEvent.click(retry);
    expect(request).toHaveBeenCalledTimes(2);
    expect(retry).toHaveAttribute('aria-disabled', 'true');
    expect(retry).toHaveFocus();
    await act(async () => reject(new ApiRequestError('timeout')));
    expect(
      screen.getByRole('heading', { name: 'Request timed out' })
    ).toBeVisible();
    expect(retry).toHaveFocus();
    fireEvent.click(retry);
    await screen.findByRole('heading', { name: `Recovered ${kind}` });
    expect(request).toHaveBeenCalledTimes(3);
    request.mock.calls.forEach(([id]) => expect(id).toBe(42));
    expect(screen.getByRole('main')).toHaveFocus();
  }
);

test.each(['movie', 'person'] as const)(
  '%s rate limits show delay guidance and cancellation stays silent',
  async (kind) => {
    const request =
      kind === 'movie' ? vi.mocked(getMovie) : vi.mocked(getPerson);
    request.mockRejectedValueOnce(new ApiRequestError('rate-limited', 429, 90));
    request.mockRejectedValueOnce(new ApiRequestError('cancelled'));
    const router = setup(`/${kind}/42`);
    await screen.findByRole('heading', { name: 'Please try again shortly' });
    expect(screen.getByRole('alert')).toHaveTextContent('wait about 2 minutes');
    await act(async () => {
      await router.navigate(`/${kind}/43`);
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Something went wrong' })
    ).toBeNull();
  }
);

test.each(['movies', 'people'] as const)(
  '%s initial Retry restores focus to Search results after success',
  async (view) => {
    const request =
      view === 'movies' ? vi.mocked(getMovies) : vi.mocked(getPeople);
    request.mockRejectedValueOnce(new ApiRequestError('network'));
    let resolve!: () => void;
    const ready = new Promise<void>((done) => {
      resolve = done;
    });
    const page = { page: 1, totalPages: 0, totalResults: 0 };
    if (view === 'movies')
      vi.mocked(getMovies).mockImplementationOnce(async () => {
        await ready;
        return { ...page, movies: [] };
      });
    else
      vi.mocked(getPeople).mockImplementationOnce(async () => {
        await ready;
        return { ...page, people: [] };
      });
    setup(`/search/Example${view === 'people' ? '?view=people' : ''}`);
    await screen.findByRole('heading', { name: 'Connection problem' });
    const retry = screen.getByRole('button', { name: 'Try again' });
    retry.focus();
    fireEvent.click(retry);
    expect(retry).toHaveFocus();
    const status = screen.getByText('Loading...');
    expect(status).toHaveTextContent('Loading...');
    expect(status.closest('[role="alert"]')).toBeNull();
    await act(async () => resolve());
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(screen.getByRole('main')).toHaveFocus();
  }
);

test.each(['movie', 'person'] as const)(
  '%s direct entry uses Search instead of unknown previous history',
  async (kind) => {
    const request =
      kind === 'movie' ? vi.mocked(getMovie) : vi.mocked(getPerson);
    request.mockRejectedValueOnce(new ApiRequestError('not-found', 404));
    vi.mocked(getMovies).mockResolvedValue({
      movies: [],
      page: 1,
      totalPages: 0,
      totalResults: 0,
    });
    const router = setup(`/${kind}/42`, '/untrusted-previous-entry');
    await screen.findByRole('heading', {
      name: kind === 'movie' ? 'Movie not found' : 'Person not found',
    });
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Back to Search' }));
    expect(router.state.location.pathname).toBe('/search');
  }
);

test.each(['movie', 'person'] as const)(
  '%s return restores an unscrolled Search entry after scrolling details',
  async (kind) => {
    vi.mocked(getMovie).mockRejectedValue(new ApiRequestError('network'));
    vi.mocked(getPerson).mockRejectedValue(new ApiRequestError('network'));
    vi.mocked(getMovies).mockResolvedValue({
      movies: [{ id: 42, title: 'Example', genres: [], posterUrl: '' }],
      page: 1,
      totalPages: 1,
      totalResults: 1,
    });
    vi.mocked(getPeople).mockResolvedValue({
      people: [{ id: 42, name: 'Example' }],
      page: 1,
      totalPages: 1,
      totalResults: 1,
    });
    const scrollY = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
    setup(`/search/Example${kind === 'person' ? '?view=people' : ''}`);
    fireEvent.click(await screen.findByRole('link', { name: 'Example' }));
    await screen.findByRole('heading', { name: 'Connection problem' });
    scrollY.mockReturnValue(280);
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('link', { name: 'Back to Search' }));
    await screen.findByRole('link', { name: 'Example' });
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 0,
      behavior: 'instant',
    });
  }
);

test.each(['movie', 'person'] as const)(
  '%s error returns to the known Search entry with depth, filters and scroll; Forward remains usable',
  async (kind) => {
    vi.mocked(getMovie).mockRejectedValue(new ApiRequestError('network'));
    vi.mocked(getPerson).mockRejectedValue(new ApiRequestError('network'));
    vi.mocked(getMovies).mockResolvedValue({
      movies: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Movie ${i + 1}`,
        genres: [],
        posterUrl: '',
      })),
      page: 1,
      totalPages: 1,
      totalResults: 20,
    });
    vi.mocked(getPeople).mockResolvedValue({
      people: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Person ${i + 1}`,
      })),
      page: 1,
      totalPages: 1,
      totalResults: 20,
    });
    const path = `/search/Example?filter=drama&year=2000&rating=8&sorting=title&order=asc${kind === 'person' ? '&view=people' : ''}`;
    const router = setup(path);
    const name = kind === 'movie' ? 'Movie' : 'Person';
    await screen.findByRole('link', { name: `${name} 1` });
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(screen.getAllByRole('article')).toHaveLength(20);
    const origin = router.state.location;
    const scrollY = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(640);
    // Depart before a scroll event; the destination then clamps the old position.
    document.addEventListener('click', () => scrollY.mockReturnValue(280), {
      once: true,
    });
    fireEvent.click(screen.getByRole('link', { name: `${name} 1` }));
    await screen.findByRole('heading', { name: 'Connection problem' });
    fireEvent.click(screen.getByRole('link', { name: 'Back to Search' }));
    await screen.findByRole('link', { name: `${name} 1` });
    expect(router.state.location).toEqual(origin);
    expect(screen.getAllByRole('article')).toHaveLength(20);
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 640,
      behavior: 'instant',
    });
    const listRequest = kind === 'movie' ? getMovies : getPeople;
    expect(listRequest).toHaveBeenCalledTimes(1);
    await act(async () => {
      await router.navigate(1);
    });
    await screen.findByRole('heading', { name: 'Connection problem' });
    fireEvent.click(screen.getByRole('link', { name: 'Back to Search' }));
    await screen.findByRole('link', { name: `${name} 1` });
    expect(router.state.location.key).toBe(origin.key);
    expect(listRequest).toHaveBeenCalledTimes(1);
  }
);

test('partial movie keeps primary and media, retries only credits, and preserves focus through repeated failure', async () => {
  vi.mocked(getMovie).mockResolvedValue({
    id: 42,
    title: 'Partial movie',
    posterUrl: '',
    genres: [],
    cast: [],
    photos: [{ thumbnailUrl: '/still.jpg', fullUrl: '/original.jpg' }],
    videos: [],
    sections: {
      credits: { status: 'unavailable' },
      photos: { status: 'available' },
      videos: { status: 'available' },
    },
  });
  let resolve!: (value: { cast: string[] }) => void;
  vi.mocked(getMovieSection)
    .mockRejectedValueOnce(new ApiRequestError('network'))
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
  setup('/movie/42');
  await screen.findByRole('heading', { name: 'Partial movie' });
  expect(
    screen.getByRole('button', { name: 'View Partial movie photo 1' })
  ).toBeVisible();
  expect(screen.getByText('No videos available.')).toBeVisible();
  expect(
    screen.queryByText('No cast or crew available.')
  ).not.toBeInTheDocument();
  const retry = screen.getByRole('button', { name: 'Retry credits' });
  retry.focus();
  fireEvent.click(retry);
  await screen.findByText('Credits unavailable. Please try again.');
  expect(retry).toHaveFocus();
  fireEvent.click(retry);
  fireEvent.click(retry);
  expect(getMovieSection).toHaveBeenCalledTimes(2);
  expect(retry).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByText('Loading credits...')).toBeVisible();
  await act(async () => resolve({ cast: ['Recovered actor'] }));
  expect(screen.getAllByText('Recovered actor').length).toBeGreaterThan(0);
  expect(screen.getByText('Credits loaded.').parentElement).toHaveFocus();
  expect(window.scrollTo).not.toHaveBeenCalled();
  expect(getMovie).toHaveBeenCalledTimes(1);
  expect(getMovieSection).toHaveBeenLastCalledWith(
    42,
    'credits',
    expect.any(AbortSignal)
  );
});

test('unavailable filmography retains biography and URL controls until local recovery', async () => {
  vi.mocked(getPerson).mockResolvedValue({
    id: 42,
    name: 'Partial person',
    biography: 'A surviving biography.',
    filmography: [],
    filmographyAvailability: { status: 'unavailable' },
  });
  vi.mocked(getFilmography).mockResolvedValue({
    filmography: [
      {
        id: 9,
        title: 'Recovered film',
        genres: [],
        posterUrl: '',
        actingCredits: ['Hero'],
        crewCredits: [{ job: 'Director' }],
      },
    ],
  });
  const router = setup('/person/42?personView=crew&personSort=title');
  await screen.findByRole('heading', { name: 'Partial person' });
  expect(screen.getByText('A surviving biography.')).toBeVisible();
  expect(screen.getByText('Filmography unavailable.')).toBeVisible();
  expect(
    screen.queryByText('No movie credits available.')
  ).not.toBeInTheDocument();
  expect(router.state.location.search).toContain('personView=crew');
  fireEvent.click(screen.getByRole('button', { name: 'Retry filmography' }));
  await screen.findByText('Recovered film');
  expect(screen.getByRole('button', { name: 'Crew' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(
    screen.getByRole('combobox', { name: 'Sort filmography' })
  ).toHaveValue('title');
  expect(getPerson).toHaveBeenCalledTimes(1);
  expect(getFilmography).toHaveBeenCalledWith(42, expect.any(AbortSignal));
});

test('route changes cancel a section retry and ignore a late successful response', async () => {
  vi.mocked(getMovie)
    .mockResolvedValueOnce({
      id: 42,
      title: 'Old movie',
      posterUrl: '',
      genres: [],
      cast: [],
      sections: {
        credits: { status: 'unavailable' },
        photos: { status: 'available' },
        videos: { status: 'available' },
      },
    })
    .mockResolvedValueOnce({
      id: 43,
      title: 'New movie',
      posterUrl: '',
      genres: [],
      cast: [],
    });
  let resolve!: (value: { cast: string[] }) => void;
  vi.mocked(getMovieSection).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      })
  );
  const router = setup('/movie/42');
  await screen.findByRole('button', { name: 'Retry credits' });
  fireEvent.click(screen.getByRole('button', { name: 'Retry credits' }));
  const signal = vi.mocked(getMovieSection).mock.calls[0][2];
  await act(async () => {
    await router.navigate('/movie/43');
  });
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ cast: ['Stale actor'] }));
  expect(screen.getByRole('heading', { name: 'New movie' })).toBeVisible();
  expect(screen.queryByText('Stale actor')).not.toBeInTheDocument();
});
