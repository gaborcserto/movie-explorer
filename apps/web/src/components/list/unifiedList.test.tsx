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
  getPopularSeries,
} from '../../util/apiUtils';

vi.mock('../../util/apiUtils', async () => ({
  ...(await vi.importActual<typeof import('../../util/apiUtils')>(
    '../../util/apiUtils'
  )),
  getMovies: vi.fn(),
  getPeople: vi.fn(),
  getSearchResults: vi.fn(),
  getPopularSeries: vi.fn(),
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

function setup(path = '/search/Story?view=tv') {
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
  vi.mocked(getPopularSeries).mockResolvedValue(page());
  vi.mocked(getMovies).mockResolvedValue({
    movies: [{ id: 1, title: 'Default Movie', posterUrl: '', genres: [] }],
    page: 1,
    totalPages: 1,
    totalResults: 1,
  });
  vi.mocked(getPeople).mockResolvedValue({
    people: [{ id: 1, name: 'Default Person' }],
    page: 1,
    totalPages: 1,
    totalResults: 1,
  });
});
afterEach(() => vi.restoreAllMocks());

test('groups category previews with independent available counts, stable identities and no global pagination', async () => {
  api.mockImplementation(async (_query, type) => ({
    ...page(),
    totalResults: type === 'movie' ? 700 : 900,
    results: Array.from(
      { length: type === 'person' ? 2 : 8 },
      (_, i): SearchResult =>
        type === 'person'
          ? {
              id: i + 1,
              mediaType: type,
              name: `Person ${i + 1}`,
              knownForDepartment: 'Acting',
            }
          : {
              id: i + 1,
              mediaType: type === 'movie' ? 'movie' : 'tv',
              title: `${type} ${i + 1}`,
            }
    ),
  }));
  setup('/search/Story?view=all');
  const region = await screen.findByRole('region', { name: 'All results' });
  await screen.findByRole('heading', { name: 'Persons', level: 2 });
  (
    [
      ['Movies', 'movie', 5, 8],
      ['Series', 'tv', 5, 8],
      ['Persons', 'person', 2, 2],
    ] as const
  ).forEach(([label, type, count, available]) => {
    const section = within(region).getByRole('region', { name: label });
    expect(within(section).getAllByRole('article')).toHaveLength(count);
    expect(section).toHaveTextContent(`${available} available results`);
    expect(
      within(section).getByRole('link', {
        name: `${type} 1`.replace('person', 'Person'),
      })
    ).toHaveAttribute('href', `/${type}/1`);
    expect(api).toHaveBeenCalledWith('Story', type, 1, expect.any(AbortSignal));
  });
  expect(api).toHaveBeenCalledTimes(3);
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  expect(getMovies).not.toHaveBeenCalled();
  expect(getPeople).not.toHaveBeenCalled();
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
        { mediaType: 'tv', id: 99, title: 'New series' },
      ],
    });
  setup();
  const region = await screen.findByRole('region', { name: 'Series results' });
  expect(within(region).getAllByRole('article')).toHaveLength(10);
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  expect(within(region).getAllByRole('article')).toHaveLength(20);
  expect(api).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('link', { name: 'New series' });
  expect(within(region).getAllByRole('article')).toHaveLength(21);
  expect(api.mock.calls.slice(1).map((call) => call[2])).toEqual([2, 2]);
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
});

test.each(['query', 'type', 'year'] as const)(
  'cancels stale results after a rapid %s change',
  async (change) => {
    const stale = deferred();
    api
      .mockReturnValueOnce(stale.promise)
      .mockImplementation(async (_query, type) => ({
        ...page(1, 1),
        results:
          type === 'tv' ? [{ id: 99, mediaType: 'tv', title: 'Current' }] : [],
      }));
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
  'restores grouped results and scroll after %s detail and Back without refetching',
  async (type) => {
    api.mockImplementation(async (_query, requested) => ({
      ...page(1, 1),
      results:
        requested === type
          ? [
              type === 'person'
                ? { id: 99, mediaType: type, name: 'Target' }
                : { id: 99, mediaType: type, title: 'Target' },
            ]
          : [],
    }));
    const router = setup('/search/Story?view=all');
    await screen.findByRole('link', { name: 'Target' });
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
    expect(api).toHaveBeenCalledTimes(3);
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
  await screen.findByText('No matching series found.');
  expect(router.state.location.search).toBe('?view=tv');
  expect(api).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole('region', { name: 'Series results' })
  ).toHaveTextContent('5 series found');
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

test.each(['all', 'tv', 'people'] as const)(
  'loads the default listing and hides All without a query (%s)',
  async (type) => {
    const router = setup(`/search?view=${type}`);
    await screen.findByRole('link', {
      name: { all: 'Default Movie', tv: 'Series 1', people: 'Default Person' }[
        type
      ],
    });
    expect(screen.queryByRole('link', { name: 'All' })).toBeNull();
    expect(api).not.toHaveBeenCalled();
    if (type === 'all') {
      expect(router.state.location.search).toBe('');
      expect(screen.getByRole('link', { name: 'Movies' })).toHaveAttribute(
        'aria-current',
        'page'
      );
      expect(getMovies).toHaveBeenCalledTimes(1);
    } else if (type === 'tv') {
      expect(getPopularSeries).toHaveBeenCalledWith(
        1,
        {},
        expect.any(AbortSignal)
      );
      expect(getMovies).not.toHaveBeenCalled();
    } else
      expect(getPeople).toHaveBeenCalledWith('', 1, expect.any(AbortSignal));
  }
);

test.each(['movie', 'tv', 'person'] as const)(
  'View all preserves query and filters for %s with Back/Forward',
  async (type) => {
    api.mockImplementation(async (_query, requested) => ({
      ...page(),
      results:
        requested === 'person'
          ? [{ id: 1, mediaType: 'person', name: 'Person' }]
          : [
              {
                id: 1,
                mediaType: requested === 'movie' ? 'movie' : 'tv',
                title: requested,
              },
            ],
    }));
    const router = setup('/search/Story?view=all&year=2005&filter=drama');
    const label = { movie: 'movies', tv: 'series', person: 'persons' }[type];
    fireEvent.click(
      await screen.findByRole('link', { name: `View all ${label}` })
    );
    await screen.findByRole('link', {
      name: { movie: 'Default Movie', tv: 'tv', person: 'Default Person' }[
        type
      ],
    });
    expect(router.state.location.pathname).toBe('/search/Story');
    expect(new URLSearchParams(router.state.location.search).get('view')).toBe(
      { movie: null, tv: 'tv', person: 'people' }[type]
    );
    expect(router.state.location.search).toContain('year=2005&filter=drama');
    await act(async () => {
      await router.navigate(-1);
    });
    expect(screen.getByRole('region', { name: 'All results' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
    await act(async () => {
      await router.navigate(1);
    });
    expect(screen.queryByRole('region', { name: 'All results' })).toBeNull();
  }
);

test('omits empty groups, reports one empty state, and retries only a failed category', async () => {
  api.mockImplementation(async (_query, type) => {
    if (type === 'person') throw new ApiRequestError('network');
    return { ...page(1, 0, 0), totalResults: 0 };
  });
  setup('/search/None?view=all');
  await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'Movies' })).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Series' })).toBeNull();
  api.mockResolvedValue({ ...page(1, 0, 0), totalResults: 0 });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByText('No results found for "None".')
  ).toHaveAttribute('role', 'status');
  expect(api).toHaveBeenCalledTimes(4);
  expect(api).toHaveBeenLastCalledWith(
    'None',
    'person',
    1,
    expect.any(AbortSignal)
  );
  expect(screen.queryAllByRole('heading')).toHaveLength(0);
});

test('clearing All normalizes to default Movies with replace and restores All on Back', async () => {
  api.mockImplementation(async (_query, type) => ({
    ...page(),
    results: type === 'tv' ? page().results : [],
  }));
  const router = setup('/search/Story?view=all');
  await screen.findByRole('link', { name: 'Series 1' });
  expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await act(async () => {
    await router.navigate('/search?view=all');
  });
  await screen.findByRole('link', { name: 'Default Movie' });
  expect(router.state.location.search).toBe('');
  expect(router.state.historyAction).toBe('REPLACE');
  expect(screen.queryByRole('link', { name: 'All' })).toBeNull();
  await act(async () => {
    await router.navigate(-1);
  });
  expect(router.state.location.pathname).toBe('/search/Story');
  expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute(
    'aria-current',
    'page'
  );
  expect(api).toHaveBeenCalledTimes(3);
});

test('Series default filters use discover, preserve movie genre and restore on Back', async () => {
  const router = setup(
    '/search?view=tv&filter=drama&year=2005&rating=8&sorting=title&order=asc'
  );
  await screen.findByRole('link', { name: 'Series 1' });
  expect(getPopularSeries).toHaveBeenCalledWith(
    1,
    { year: '2005', rating: '8', sorting: 'title', order: 'asc' },
    expect.any(AbortSignal)
  );
  fireEvent.click(screen.getByRole('button', { name: /Filters & Sort/ }));
  expect(screen.queryByRole('button', { name: /^Genre/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^Minimum Rating/ }));
  fireEvent.change(screen.getByLabelText('Minimum TMDB rating'), {
    target: { value: '7' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  await screen.findByRole('link', { name: 'Series 1' });
  expect(router.state.location.search).toContain('filter=drama');
  expect(getPopularSeries).toHaveBeenLastCalledWith(
    1,
    expect.objectContaining({ rating: '7' }),
    expect.any(AbortSignal)
  );
  await act(async () => {
    await router.navigate(-1);
  });
  expect(router.state.location.search).toContain('rating=8');
  expect(getPopularSeries).toHaveBeenCalledTimes(2);
});

test('query Series Load more shares outline, loading and disabled states and keeps pagination focus', async () => {
  const next = deferred();
  api.mockResolvedValueOnce(page(1, 2, 10)).mockReturnValueOnce(next.promise);
  setup();
  const button = await screen.findByRole('button', { name: 'Load more' });
  expect(button).toHaveClass('btn--outline', 'btn--action');
  button.focus();
  fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(button).toHaveTextContent('Loading more...');
  expect(button).not.toHaveClass('btn--primary');
  await act(async () => {
    next.resolve(page(2, 2, 1));
  });
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  expect(screen.getByText('11 results loaded')).toHaveFocus();
});
