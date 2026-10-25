import { act, render, screen, waitFor } from '@testing-library/react';
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
    '/tv/7'
  );
  expect(screen.getByText('Showing 2 of 2 titles')).toBeInTheDocument();
  expect(screen.getByText('Guide - 3 episodes')).toBeInTheDocument();
  expect(screen.getByText('Series premiere')).toBeInTheDocument();
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

it('combines type, crew, job and sorting controls with history and repeated URL parameters', async () => {
  const router = setup(envelope, '?tag=a&tag=b');
  await screen.findByRole('link', { name: 'A Series' });
  await userEvent.click(screen.getByRole('tab', { name: 'Series' }));
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
  await userEvent.click(screen.getByRole('tab', { name: 'Movies' }));
  expect(
    new URLSearchParams(router.state.location.search).has('personRole')
  ).toBe(false);
  expect(screen.getByRole('link', { name: 'A Movie' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('tab', { name: 'All' }));
  await userEvent.click(screen.getByRole('tab', { name: 'Series' }));
  expect(screen.getByRole('tab', { name: 'Series' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
});

it('switches media tabs with keyboard controls while keeping Acting and Crew independent', async () => {
  const user = userEvent.setup();
  const router = setup();
  const all = await screen.findByRole('tab', { name: 'All' });
  all.focus();
  await user.keyboard('{ArrowRight}');
  const movies = screen.getByRole('tab', { name: 'Movies' });
  expect(movies).toHaveFocus();
  expect(movies).toHaveAttribute('aria-selected', 'true');
  expect(router.state.location.search).toContain('personType=movie');
  expect(screen.getByRole('button', { name: 'Acting' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await user.click(screen.getByRole('button', { name: 'Crew' }));
  expect(router.state.location.search).toContain('personView=crew');
  expect(screen.getByRole('tab', { name: 'Movies' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
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
  await userEvent.click(screen.getByRole('tab', { name: 'Movies' }));
  expect(screen.getByRole('link', { name: 'A Movie' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('restores Series selection after navigating to Series Details and Back', async () => {
  const router = setup(envelope, '?personType=tv&personSort=title');
  await userEvent.click(await screen.findByRole('link', { name: 'A Series' }));
  expect(router.state.location.pathname).toBe('/tv/7');
  await act(async () => {
    await router.navigate(-1);
  });
  await screen.findByRole('heading', { name: 'Filmography' });
  expect(screen.getByRole('tab', { name: 'Series' })).toHaveAttribute(
    'aria-selected',
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
