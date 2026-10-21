import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import type { SearchResponse, SearchResult } from '@movie-explorer/contracts';

import SearchResults from './searchResults';
import SearchHistoryProvider from './searchHistory';
import {
  ApiRequestError,
  getMovies,
  getPeople,
  getSearchResults,
} from '../../util/apiUtils';

vi.mock('../../util/apiUtils', async () => ({
  ...(await vi.importActual<typeof import('../../util/apiUtils')>(
    '../../util/apiUtils'
  )),
  getMovies: vi.fn(),
  getPeople: vi.fn(),
  getSearchResults: vi.fn(),
}));
const api = vi.mocked(getSearchResults);
const page = (current = 1, totalPages = 2, count = 20): SearchResponse => ({
  results: Array.from({ length: count }, (_, index) => ({
    id: (current - 1) * 20 + index + 1,
    mediaType: 'tv',
    title: `Series ${(current - 1) * 20 + index + 1}`,
    firstAirDate: '2005-02-21',
    rating: 8,
  })),
  page: current,
  totalPages,
  totalResults: totalPages * 20,
});
const deferred = () => {
  let resolve!: (value: SearchResponse) => void;
  const promise = new Promise<SearchResponse>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

function setup(path = '/search/Story?view=all') {
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
          ...['movie', 'tv', 'person'].map((type) => ({
            path: `/${type}/:id`,
            element: <h1>{type} details</h1>,
          })),
        ],
      },
    ],
    { initialEntries: [path] }
  );
  render(<RouterProvider router={router} />);
  return router;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  api.mockResolvedValue(page());
});
afterEach(() => vi.restoreAllMocks());

test('renders mixed identities with existing cards, correct destinations, type labels and dates', async () => {
  api.mockResolvedValue({
    ...page(1, 1),
    results: [
      { id: 1, mediaType: 'movie', title: 'Movie', releaseDate: '1979-05-25' },
      {
        id: 1,
        mediaType: 'tv',
        title: 'Series',
        firstAirDate: '2005-02-21',
        rating: 8,
      },
      {
        id: 1,
        mediaType: 'person',
        name: 'Person',
        knownForDepartment: 'Acting',
      },
    ],
  });
  setup('/search/Story?view=all&filter=drama&year=2005&rating=8');
  const region = await screen.findByRole('region', { name: 'All results' });
  expect(within(region).getAllByRole('article')).toHaveLength(3);
  expect(screen.getByRole('link', { name: 'Movie' })).toHaveAttribute(
    'href',
    '/movie/1'
  );
  expect(within(region).getByRole('link', { name: 'Series' })).toHaveAttribute(
    'href',
    '/tv/1'
  );
  expect(screen.getByRole('link', { name: 'Person' })).toHaveAttribute(
    'href',
    '/person/1'
  );
  expect(region).toHaveTextContent('1979');
  expect(region).toHaveTextContent('2005');
  expect(region).toHaveTextContent('Person / Acting');
  expect(api).toHaveBeenCalledWith(
    'Story',
    'all',
    1,
    expect.any(AbortSignal),
    undefined
  );
  expect(getMovies).not.toHaveBeenCalled();
  expect(getPeople).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /Filters & Sort/ })).toBeNull();
});

test('Series reuses the filter panel and applies only first-air year, retaining Movie selections', async () => {
  const router = setup(
    '/search/Story?view=tv&year=2005&filter=drama&rating=8&extra=a&extra=b'
  );
  await screen.findByRole('link', { name: 'Series 1' });
  expect(api).toHaveBeenCalledWith(
    'Story',
    'tv',
    1,
    expect.any(AbortSignal),
    '2005'
  );
  fireEvent.click(screen.getByRole('button', { name: /Filters & Sort/ }));
  expect(screen.queryByRole('button', { name: /^Genre/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Minimum Rating/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^First-air Year/ }));
  fireEvent.change(screen.getByLabelText('First-air year'), {
    target: { value: '2010' },
  });
  expect(api).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  await screen.findByRole('link', { name: 'Series 1' });
  expect(api).toHaveBeenCalledTimes(2);
  expect(api).toHaveBeenLastCalledWith(
    'Story',
    'tv',
    1,
    expect.any(AbortSignal),
    '2010'
  );
  expect(router.state.location.search).toContain('filter=drama&rating=8');
  expect(
    new URLSearchParams(router.state.location.search).getAll('extra')
  ).toEqual(['a', 'b']);
  await act(async () => {
    await router.navigate(-1);
  });
  expect(api).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/First-air year: 2005/)).toBeVisible();
});

test('reveals ten at a time, retries the same next page, deduplicates composite IDs and stops at the last page', async () => {
  api
    .mockResolvedValueOnce(page())
    .mockRejectedValueOnce(new ApiRequestError('network'))
    .mockResolvedValueOnce({
      ...page(2, 2, 2),
      results: [
        page().results[0],
        { mediaType: 'movie', id: 1, title: 'Same numeric ID' },
      ],
    });
  setup();
  const region = await screen.findByRole('region', { name: 'All results' });
  expect(within(region).getAllByRole('article')).toHaveLength(10);
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(within(region).getAllByRole('article')).toHaveLength(20);
  expect(api).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('link', { name: 'Same numeric ID' });
  expect(within(region).getAllByRole('article')).toHaveLength(21);
  expect(api.mock.calls.slice(1).map((call) => call[2])).toEqual([2, 2]);
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
});

test.each(['query', 'type', 'year'] as const)(
  'cancels stale results after a rapid %s change',
  async (change) => {
    const stale = deferred();
    api.mockReturnValueOnce(stale.promise).mockResolvedValueOnce({
      ...page(1, 1),
      results: [{ id: 99, mediaType: 'tv', title: 'Current' }],
    });
    const router = setup('/search/Old?view=tv&year=2005');
    const signal = api.mock.calls[0][3];
    await act(async () => {
      await router.navigate(
        {
          query: '/search/New?view=tv',
          type: '/search/Old?view=all',
          year: '/search/Old?view=tv&year=2010',
        }[change]
      );
    });
    await screen.findByRole('link', { name: 'Current' });
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      stale.resolve(page());
    });
    expect(screen.queryByRole('link', { name: 'Series 1' })).toBeNull();
  }
);

test.each(['movie', 'tv', 'person'] as const)(
  'restores reveal count and scroll after %s detail and Back without refetching',
  async (type) => {
    const target: SearchResult =
      type === 'person'
        ? { id: 99, mediaType: type, name: 'Target' }
        : { id: 99, mediaType: type, title: 'Target' };
    api.mockResolvedValue({ ...page(), results: [...page().results, target] });
    const router = setup();
    await screen.findByRole('link', { name: 'Series 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 650,
    });
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('link', { name: 'Target' }));
    expect(router.state.location.pathname).toBe(`/${type}/99`);
    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByRole('link', { name: 'Target' })).toBeVisible();
    expect(api).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 650,
      behavior: 'instant',
    });
  }
);

test('normalizes invalid URLs before requesting and displays empty state with upstream totals honestly', async () => {
  api.mockResolvedValue({ ...page(1, 1, 0), totalResults: 5 });
  const router = setup(
    '/search/Story?view=tv&year=bad&filter=unknown&sorting=title&order=asc'
  );
  await screen.findByText('No results in the accessible result pages.');
  expect(router.state.location.search).toBe('?view=tv');
  expect(api).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole('region', { name: 'Series results' })
  ).toHaveTextContent('5 reported matches');
});

test('initial failure is recoverable and an empty successful retry is announced', async () => {
  api
    .mockRejectedValueOnce(new ApiRequestError('network'))
    .mockResolvedValueOnce({
      results: [],
      page: 1,
      totalPages: 0,
      totalResults: 0,
    });
  setup();
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByText('No results found for "Story".')
  ).toHaveAttribute('role', 'status');
});

test.each(['all', 'tv'])('does not fetch %s without a query', (type) => {
  setup(`/search?view=${type}`);
  expect(
    screen.getByText(
      'Enter a title or name to search Movies, Series and Persons.'
    )
  ).toBeVisible();
  expect(api).not.toHaveBeenCalled();
  expect(getMovies).not.toHaveBeenCalled();
});
