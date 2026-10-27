import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type {
  CombinedFilmography,
  PersonSeriesCredit,
} from '@movie-explorer/contracts';

import App from '../../App';

const series: PersonSeriesCredit = {
  mediaType: 'tv',
  id: 7,
  title: 'A Series',
  originalTitle: null,
  firstAirDate: '2022-01-01',
  posterUrl: null,
  genres: [],
  actingCredits: ['Guide'],
  actingRoles: [{ creditId: 'a', character: 'Guide', episodeCount: 3 }],
  crewCredits: [{ job: 'Writer', department: 'Writing', episodeCount: 2 }],
};
const movie = {
  mediaType: 'movie' as const,
  id: 7,
  title: 'A Movie',
  releaseDate: '2020-01-01',
  posterUrl: '',
  genres: [],
  actingCredits: ['Actor'],
  crewCredits: [{ job: 'Director' }],
};
const envelope: CombinedFilmography = {
  entries: [movie, series],
  groups: { movie: { status: 'available' }, tv: { status: 'available' } },
};
const fetchMock = vi.fn<typeof fetch>();

function setup(combined: CombinedFilmography = envelope, query = '') {
  fetchMock.mockResolvedValue(
    Response.json({
      id: 42,
      name: 'Person',
      filmography: [],
      combinedFilmography: combined,
    })
  );
  const router = createMemoryRouter([{ path: '*', element: <App /> }], {
    initialEntries: [`/person/42${query}`],
  });
  render(<RouterProvider router={router} />);

  return router;
}
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

it('displays distinct Movie/Series identities, dates, role counts and correct links', async () => {
  setup();
  expect(await screen.findByRole('link', { name: 'A Movie' })).toHaveAttribute(
    'href',
    '/movie/7'
  );
  expect(screen.getByRole('link', { name: 'A Series' })).toHaveAttribute(
    'href',
    '/series/7'
  );
  expect(screen.getByText('Showing 2 of 2 titles')).toBeInTheDocument();
  expect(screen.getByText('Guide · 3 episodes')).toBeInTheDocument();
  expect(screen.queryByText('Series premiere')).not.toBeInTheDocument();
  [
    ['A Movie', 'Movie'],
    ['A Series', 'Series'],
  ].forEach(([title, label]) => {
    const row = screen.getByRole('link', { name: title });
    const mediaLabel = within(row).getByText(label);

    expect(mediaLabel.parentElement).toBe(
      within(row).getByText(title).parentElement
    );
    expect(row.querySelector('.filmography__poster')).not.toContainElement(
      mediaLabel
    );
    expect(row.querySelector('.filmography__metadata')).not.toContainElement(
      mediaLabel
    );
  });
  const movieMetadata = screen
    .getByRole('link', { name: 'A Movie' })
    .getAttribute('aria-describedby');
  const seriesMetadata = screen
    .getByRole('link', { name: 'A Series' })
    .getAttribute('aria-describedby');
  expect(movieMetadata).not.toBe(seriesMetadata);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toContain(
    '?include=combinedFilmography'
  );
});

it.each([
  [1, '1 episode'],
  [2, '2 episodes'],
  [null, ''],
  [0, ''],
] as const)(
  'shows only positive credit episode counts (%s) in Acting and Crew',
  async (episodeCount, suffix) => {
    const credit: PersonSeriesCredit = {
      ...series,
      actingRoles: [{ creditId: 'a', character: 'Guide', episodeCount }],
      crewCredits: [{ job: 'Writer', episodeCount }],
    };
    setup({ ...envelope, entries: [credit] });
    const row = await screen.findByRole('link', { name: 'A Series' });

    expect(
      within(row).getByText(suffix ? `Guide · ${suffix}` : 'Guide')
    ).toBeVisible();
    expect(row).toHaveAccessibleName('A Series');
    expect(screen.queryByText('Series premiere')).not.toBeInTheDocument();
    if (!episodeCount) {
      expect(within(row).queryByText(/episodes?/)).not.toBeInTheDocument();
    }

    await userEvent.click(screen.getByRole('button', { name: 'Crew' }));

    const crewRow = screen.getByRole('link', { name: 'A Series' });
    expect(
      within(crewRow).getByText(suffix ? `Writer — ${suffix}` : 'Writer')
    ).toBeVisible();
    if (!episodeCount) {
      expect(within(crewRow).queryByText(/episodes?/)).not.toBeInTheDocument();
    }
  }
);

it('combines type, crew, job and sorting controls with history and repeated URL parameters', async () => {
  const router = setup(envelope, '?tag=a&tag=b');
  await screen.findByRole('link', { name: 'A Series' });
  await userEvent.click(screen.getByRole('button', { name: 'Series' }));
  expect(
    screen.queryByRole('link', { name: 'A Movie' })
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Crew' }));
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Job or department' }),
    'job:Writer'
  );
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Sort filmography' }),
    'oldest'
  );
  expect(
    new URLSearchParams(router.state.location.search).getAll('tag')
  ).toEqual(['a', 'b']);
  expect(router.state.location.search).toContain('personType=tv');
  expect(screen.getByText('Showing 1 of 1 title')).toBeInTheDocument();
  await act(async () => {
    await router.navigate(-1);
  });
  expect(
    screen.getByRole('combobox', { name: 'Sort filmography' })
  ).toHaveValue('newest');
  await act(async () => {
    await router.navigate(1);
  });
  expect(
    screen.getByRole('combobox', { name: 'Sort filmography' })
  ).toHaveValue('oldest');
  await userEvent.click(screen.getByRole('button', { name: 'Movies' }));
  expect(
    new URLSearchParams(router.state.location.search).has('personRole')
  ).toBe(false);
  expect(screen.getByRole('link', { name: 'A Movie' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'All' }));
  await userEvent.click(screen.getByRole('button', { name: 'Series' }));
  expect(screen.getByRole('button', { name: 'Series' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

it('defaults to All and exposes mutually exclusive pressed category filters', async () => {
  setup();
  const group = await screen.findByRole('group', {
    name: 'Filmography media type',
  });
  const filters = within(group);

  expect(
    filters.getByRole('button', { name: 'All', pressed: true })
  ).toHaveAttribute('type', 'button');
  expect(
    filters.getByRole('button', { name: 'Movies', pressed: false })
  ).toBeVisible();
  expect(
    filters.getByRole('button', { name: 'Series', pressed: false })
  ).toBeVisible();
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();

  await userEvent.click(filters.getByRole('button', { name: 'Movies' }));

  expect(
    filters.getByRole('button', { name: 'Movies', pressed: true })
  ).toBeVisible();
  expect(
    filters.getByRole('button', { name: 'All', pressed: false })
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'A Movie' })).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'A Series' })
  ).not.toBeInTheDocument();

  await userEvent.click(filters.getByRole('button', { name: 'Series' }));

  expect(
    filters.getByRole('button', { name: 'Series', pressed: true })
  ).toBeVisible();
  expect(
    filters.getByRole('button', { name: 'Movies', pressed: false })
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'A Series' })).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'A Movie' })
  ).not.toBeInTheDocument();

  await userEvent.click(filters.getByRole('button', { name: 'All' }));

  expect(
    filters.getByRole('button', { name: 'All', pressed: true })
  ).toBeVisible();
  expect(filters.getAllByRole('button', { pressed: false })).toHaveLength(2);
  expect(screen.getByText('Showing 2 of 2 titles')).toBeVisible();
});

it('activates category filters with Tab, Enter and Space while keeping Acting and Crew independent', async () => {
  const user = userEvent.setup();
  const router = setup();
  const all = await screen.findByRole('button', { name: 'All' });
  all.focus();
  await user.tab();
  const movies = screen.getByRole('button', { name: 'Movies' });
  expect(movies).toHaveFocus();
  expect(all).toHaveAttribute('aria-pressed', 'true');

  await user.keyboard('{Enter}');

  expect(movies).toHaveAttribute('aria-pressed', 'true');
  expect(router.state.location.search).toContain('personType=movie');
  expect(screen.getByRole('button', { name: 'Acting' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await user.click(screen.getByRole('button', { name: 'Crew' }));
  expect(router.state.location.search).toContain('personView=crew');
  expect(screen.getByRole('button', { name: 'Movies' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  movies.focus();
  await user.tab();
  const seriesFilter = screen.getByRole('button', { name: 'Series' });
  expect(seriesFilter).toHaveFocus();
  await user.keyboard(' ');

  expect(seriesFilter).toHaveFocus();
  expect(seriesFilter).toHaveAttribute('aria-pressed', 'true');
  expect(movies).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'Crew' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.getByRole('link', { name: 'A Series' })).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'A Movie' })
  ).not.toBeInTheDocument();
});

it('keeps category filters available when the selected category has no credits', async () => {
  setup({ ...envelope, entries: [movie] });
  await userEvent.click(await screen.findByRole('button', { name: 'Series' }));

  expect(
    screen.getByRole('button', { name: 'Series', pressed: true })
  ).toBeVisible();
  expect(
    screen.getByText('No credits available for this selection.')
  ).toBeVisible();
  expect(
    screen.queryByRole('link', { name: 'A Movie' })
  ).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'All' }));

  expect(
    screen.getByRole('button', { name: 'All', pressed: true })
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'A Movie' })).toBeVisible();
});

it('retains unavailable-group URL selections, recovers only that group and preserves other credits', async () => {
  const router = setup(
    {
      entries: [movie],
      groups: { movie: { status: 'available' }, tv: { status: 'unavailable' } },
    },
    '?personType=tv&personView=crew&personRole=job:Writer'
  );
  await screen.findByRole('heading', { name: 'Person' });
  expect(router.state.location.search).toContain('personRole=job:Writer');
  expect(
    screen.getByText('Credits for this selection are unavailable.')
  ).toBeInTheDocument();
  fetchMock.mockResolvedValueOnce(Response.json({}, { status: 503 }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Retry series credits' })
  );
  expect(
    await screen.findByText('Series credits unavailable. Please try again.')
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Movies' }));
  expect(screen.getByRole('link', { name: 'A Movie' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Series' }));

  fetchMock.mockResolvedValueOnce(
    Response.json({
      entries: [series],
      groups: { tv: { status: 'available' } },
    })
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Retry series credits' })
  );
  expect(
    await screen.findByRole('link', { name: 'A Series' })
  ).toBeInTheDocument();
  expect(String(fetchMock.mock.calls[1][0])).toContain(
    '/combined-filmography?mediaType=tv'
  );
  await userEvent.click(screen.getByRole('button', { name: 'Movies' }));
  expect(screen.getByRole('link', { name: 'A Movie' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('restores Series selection after navigating to Series Details and Back', async () => {
  const router = setup(envelope, '?personType=tv&personSort=title');
  await userEvent.click(await screen.findByRole('link', { name: 'A Series' }));
  expect(router.state.location.pathname).toBe('/series/7');
  await act(async () => {
    await router.navigate(-1);
  });
  await screen.findByRole('heading', { name: 'Filmography' });
  expect(screen.getByRole('button', { name: 'Series' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(
    screen.getByRole('combobox', { name: 'Sort filmography' })
  ).toHaveValue('title');
  expect(
    screen.queryByRole('link', { name: 'A Movie' })
  ).not.toBeInTheDocument();
});

it('aborts a pending group recovery on navigation', async () => {
  const router = setup({
    entries: [movie],
    groups: { movie: { status: 'available' }, tv: { status: 'unavailable' } },
  });
  await screen.findByRole('heading', { name: 'Filmography' });
  let resolve: ((response: Response) => void) | undefined;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      })
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Retry series credits' })
  );
  const signal = fetchMock.mock.calls[1][1]?.signal;
  await act(async () => {
    await router.navigate('/search');
  });
  expect(signal?.aborted).toBe(true);
  await act(async () =>
    resolve?.(
      Response.json({
        entries: [series],
        groups: { tv: { status: 'available' } },
      })
    )
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'Filmography' })
    ).not.toBeInTheDocument()
  );
});
