import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import App from '../../App';
import {
  ApiRequestError,
  getMovie,
  getPerson,
  getMovies,
  getPeople,
} from '../../util/apiUtils';

vi.mock('../../util/apiUtils', async () => ({
  ...(await vi.importActual<typeof import('../../util/apiUtils')>(
    '../../util/apiUtils'
  )),
  getMovie: vi.fn(),
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
