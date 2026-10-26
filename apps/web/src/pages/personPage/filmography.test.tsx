import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type {
  PersonDetails,
  PersonFilmographyEntry,
} from '@movie-explorer/contracts';
import App from '../../App';

function movie(
  id: number,
  overrides: Partial<PersonFilmographyEntry> = {}
): PersonFilmographyEntry {
  return {
    id,
    title: `Movie ${String(id).padStart(2, '0')}`,
    posterUrl: `/poster-${id}.jpg`,
    posterSrcSet: '/small.jpg 1x, /large.jpg 2x',
    genres: ['Drama'],
    releaseDate: '2020-01-01',
    actingCredits: ['Hero'],
    crewCredits: [],
    ...overrides,
  };
}

const both = [
  movie(1, {
    actingCredits: ['Hero', 'Narrator', 'Hero'],
    crewCredits: [
      { department: 'Directing', job: 'Director' },
      { department: 'Writing', job: 'Screenplay' },
    ],
  }),
  movie(2, {
    actingCredits: undefined,
    crewCredits: [
      { department: 'Writing', job: 'Writer' },
      { department: 'Production', job: 'Producer' },
      { department: 'Production', job: 'Executive Producer' },
    ],
  }),
  movie(3, {
    actingCredits: [],
    crewCredits: [{ department: 'Writing', job: 'Screenplay' }],
  }),
  movie(4, {
    actingCredits: undefined,
    crewCredits: [{ department: 'Production' }],
  }),
];

const batch = Array.from({ length: 37 }, (_, index) =>
  movie(index + 1, {
    crewCredits: [{ job: 'Director' }, { job: 'Writer' }],
  })
);

function response(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

const fetchMock = vi.fn<typeof fetch>();

async function renderFilmography(
  entries: PersonFilmographyEntry[],
  query = '',
  biography?: string
) {
  fetchMock.mockResolvedValue(
    response({
      id: 42,
      name: 'Test Person',
      biography,
      filmography: entries,
    } satisfies PersonDetails)
  );
  const router = createMemoryRouter([{ path: '*', element: <App /> }], {
    initialEntries: [`/person/42${query}`],
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { name: 'Filmography' });
  return router;
}

function section() {
  return within(screen.getByRole('region', { name: 'Filmography' }));
}

function titles() {
  return section()
    .queryAllByRole('link')
    .map((link) => link.getAttribute('aria-label'));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

test('acting-only defaults to Acting and preserves empty character lists and upcoming movies', async () => {
  await renderFilmography([
    movie(1, { actingCredits: [], releaseDate: '2099-03-04' }),
  ]);
  expect(section().getByRole('button', { name: 'Acting' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(section().queryByRole('button', { name: 'Crew' })).toBeNull();
  expect(section().getByText('2099')).toBeVisible();
  expect(section().getByRole('status')).toHaveTextContent(
    'Showing 1 of 1 movie'
  );
  expect(
    section().queryByRole('combobox', { name: 'Job or department' })
  ).toBeNull();
});

test('crew-only defaults to Crew using credits rather than known-for metadata', async () => {
  await renderFilmography([
    movie(1, { actingCredits: undefined, crewCredits: [{ job: 'Producer' }] }),
  ]);
  expect(section().getByRole('button', { name: 'Crew' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(section().queryByRole('button', { name: 'Acting' })).toBeNull();
  expect(section().getByText('Producer', { selector: 'p' })).toBeVisible();
});

test('has a semantic empty state without irrelevant controls', async () => {
  await renderFilmography([]);
  expect(section().getByRole('status')).toHaveTextContent(
    'No movie credits available.'
  );
  expect(section().queryByRole('button')).toBeNull();
  expect(section().queryByRole('combobox')).toBeNull();
});

test('merges duplicate movies and deduplicates character and crew role text', async () => {
  const user = userEvent.setup();
  await renderFilmography([
    ...both,
    movie(1, {
      actingCredits: ['Narrator', 'Villain'],
      crewCredits: [{ job: 'Director', department: 'Directing' }],
    }),
  ]);
  expect(titles()).toEqual(['Movie 01', 'Movie 03']);
  expect(section().getByText('Hero · Narrator · Villain')).toBeVisible();
  await user.click(section().getByRole('button', { name: 'Crew' }));
  expect(titles()).toEqual(['Movie 01', 'Movie 02', 'Movie 03', 'Movie 04']);
  expect(
    section().getByText('Director — Directing · Screenplay — Writing')
  ).toBeVisible();
});

test('renders missing posters, dates, characters and job information without fabricated values', async () => {
  const user = userEvent.setup();
  await renderFilmography([
    movie(1, {
      posterUrl: '',
      posterSrcSet: undefined,
      releaseDate: undefined,
      actingCredits: [],
      crewCredits: [{}],
    }),
  ]);
  expect(section().queryByRole('img')).toBeNull();
  expect(
    section().getByRole('link').querySelector('.image-placeholder')
  ).toHaveAttribute('aria-hidden', 'true');
  expect(titles()).toEqual(['Movie 01']);
  expect(section().queryByText('2020')).toBeNull();
  await user.click(section().getByRole('button', { name: 'Crew' }));
  expect(titles()).toEqual(['Movie 01']);
  expect(
    section()
      .getAllByRole('option')
      .map((option) => option.textContent)
  ).toEqual(['All jobs', 'Newest first', 'Oldest first', 'Title A–Z']);
});

test('duplicate movies use later metadata while retaining trimmed roles from earlier credits', async () => {
  await renderFilmography([
    movie(1, { title: 'Earlier title', actingCredits: [' Hero ', '', 'Hero'] }),
    movie(1, {
      title: 'Later title',
      posterUrl: '/later.jpg',
      releaseDate: undefined,
      actingCredits: undefined,
    }),
  ]);

  expect(titles()).toEqual(['Later title']);
  const link = section().getByRole('link', { name: 'Later title' });
  expect(link).toHaveAccessibleDescription('Hero');
  expect(link.querySelector('time')).toBeNull();
  expect(link.querySelector('img')).toHaveAttribute('src', '/later.jpg');
  expect(section().getByRole('status')).toHaveTextContent(
    'Showing 1 of 1 movie'
  );
});

test('canonical selection replaces history and preserves repeated unrelated parameters', async () => {
  const router = await renderFilmography(
    both,
    '?keep=one&personView=invalid&keep=two&personRole=job%3ADirector&personSort=newest'
  );

  await waitFor(() =>
    expect(router.state.location.search).toBe('?keep=one&keep=two')
  );
  expect(router.state.historyAction).toBe('REPLACE');
  expect(titles()).toEqual(['Movie 01', 'Movie 03']);
});

test('switches views, offers distinct real jobs, and displays only matching roles', async () => {
  const user = userEvent.setup();
  const router = await renderFilmography(both, '?keep=value');
  expect(titles()).toEqual(['Movie 01', 'Movie 03']);
  const crew = section().getByRole('button', { name: 'Crew' });
  await user.click(crew);
  expect(crew).toHaveFocus();
  expect(crew).toHaveAttribute('aria-pressed', 'true');
  const jobs = section().getByRole('combobox', { name: 'Job or department' });
  expect(
    within(jobs)
      .getAllByRole('option')
      .map((option) => option.textContent)
  ).toEqual([
    'All jobs',
    'Production (department)',
    'Director',
    'Executive Producer',
    'Producer',
    'Screenplay',
    'Writer',
  ]);
  await user.selectOptions(jobs, 'job:Screenplay');
  expect(titles()).toEqual(['Movie 01', 'Movie 03']);
  expect(section().getAllByText('Screenplay — Writing')).toHaveLength(2);
  expect(section().queryByText(/Director —/)).toBeNull();
  expect(router.state.location.search).toContain('keep=value');
  expect(router.state.location.search).toContain('personRole=job%3AScreenplay');
  expect(jobs).toHaveFocus();
  await user.selectOptions(jobs, 'job:Producer');
  expect(titles()).toEqual(['Movie 02']);
  expect(section().getByText('Producer — Production')).toBeVisible();
  expect(section().queryByText('Executive Producer — Production')).toBeNull();
  await user.selectOptions(jobs, '');
  expect(titles()).toHaveLength(4);
  expect(
    section().getByText(
      'Writer — Writing · Producer — Production · Executive Producer — Production'
    )
  ).toBeVisible();
  await user.click(section().getByRole('button', { name: 'Acting' }));
  expect(router.state.location.search).toBe('?keep=value');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('department fallback matches all corresponding roles, including named jobs', async () => {
  const user = userEvent.setup();
  await renderFilmography(both, '?personView=crew');
  await user.selectOptions(
    section().getByRole('combobox', { name: 'Job or department' }),
    'department:Production'
  );
  expect(titles()).toEqual(['Movie 02', 'Movie 04']);
  expect(
    section().getByText(
      'Producer — Production · Executive Producer — Production'
    )
  ).toBeVisible();
  expect(section().getByText('Production', { selector: 'p' })).toBeVisible();
});

test.each([
  [
    '?personView=unknown&personRole=job%3AFake&personSort=nope&keep=1',
    'acting',
  ],
  [
    '?personView=acting&personRole=job%3ADirector&personSort=newest&keep=1',
    'acting',
  ],
  ['?personView=crew&personRole=job%3AFake&keep=1', 'crew'],
])(
  'normalizes invalid or inapplicable URL selections: %s',
  async (query, view) => {
    const router = await renderFilmography(both, query);
    await waitFor(() =>
      expect(router.state.location.search).toBe(
        view === 'crew' ? '?keep=1&personView=crew' : '?keep=1'
      )
    );
    expect(
      section().getByRole('button', {
        name: view === 'crew' ? 'Crew' : 'Acting',
      })
    ).toHaveAttribute('aria-pressed', 'true');
  }
);

test('falls back from an unavailable view in a direct URL', async () => {
  const router = await renderFilmography(
    [movie(1)],
    '?personView=crew&personRole=job%3ADirector'
  );
  await waitFor(() => expect(router.state.location.search).toBe(''));
  expect(section().getByRole('button', { name: 'Acting' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

const unsorted = [
  movie(6, { title: 'Undated Z', releaseDate: undefined }),
  movie(4, { title: 'Bravo', releaseDate: '2020-01-01' }),
  movie(3, { title: 'Alpha', releaseDate: '2020-01-01' }),
  movie(2, { title: 'Alpha', releaseDate: '2020-01-01' }),
  movie(5, { title: 'Undated A', releaseDate: '' }),
  movie(1, { title: 'Future', releaseDate: '2099-01-01' }),
  movie(7, { title: 'Old', releaseDate: '1990-12-31' }),
];

test.each([
  ['newest', [1, 2, 3, 4, 7, 5, 6]],
  ['oldest', [7, 2, 3, 4, 1, 5, 6]],
  ['title', [2, 3, 4, 1, 7, 5, 6]],
])(
  'sorts %s deterministically with upcoming movies and date-sort undated movies last',
  async (sort, ids) => {
    const original = JSON.stringify(unsorted);
    await renderFilmography(unsorted, `?personSort=${sort}`);
    expect(
      section()
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
    ).toEqual(ids.map((id) => `/movie/${id}`));
    expect(JSON.stringify(unsorted)).toBe(original);
  }
);

test('filters before sorting and supports direct URL selections', async () => {
  const entries = both.map((entry, index) => ({
    ...entry,
    releaseDate: `${2000 + index}-01-01`,
  }));
  await renderFilmography(
    entries,
    '?personView=crew&personRole=job%3AScreenplay&personSort=oldest'
  );
  expect(titles()).toEqual(['Movie 01', 'Movie 03']);
  expect(
    section().getByRole('combobox', { name: 'Job or department' })
  ).toHaveValue('job:Screenplay');
  expect(
    section().getByRole('combobox', { name: 'Sort filmography' })
  ).toHaveValue('oldest');
});

test('reveals 10, 20, 30, then the final partial batch without extra requests and retains useful focus', async () => {
  const user = userEvent.setup();
  await renderFilmography(batch);
  expect(titles()).toHaveLength(10);
  expect(section().getByRole('status')).toHaveTextContent(
    'Showing 10 of 37 movies'
  );
  const more = section().getByRole('button', { name: 'Load more' });
  expect(more).toHaveClass('btn--outline', 'btn--action');
  await user.click(more);
  expect(titles()).toHaveLength(20);
  expect(section().getByRole('status')).toHaveTextContent(
    'Showing 20 of 37 movies'
  );
  expect(more).toHaveFocus();
  await user.click(more);
  expect(titles()).toHaveLength(30);
  expect(section().getByRole('status')).toHaveTextContent(
    'Showing 30 of 37 movies'
  );
  expect(more).toHaveFocus();
  await user.click(more);
  expect(titles()).toHaveLength(37);
  expect(section().queryByRole('button', { name: 'Load more' })).toBeNull();
  expect(section().getByRole('status')).toHaveTextContent(
    'Showing 37 of 37 movies'
  );
  expect(section().getByRole('status')).toHaveFocus();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test.each([
  [0, 0],
  [10, 0],
  [20, 1],
  [30, 2],
])('hides Load More when all %s movies are visible', async (total, clicks) => {
  const user = userEvent.setup();
  await renderFilmography(batch.slice(0, total));
  if (clicks > 0) {
    await user.click(section().getByRole('button', { name: 'Load more' }));
  }
  if (clicks > 1) {
    await user.click(section().getByRole('button', { name: 'Load more' }));
  }

  expect(section().queryByRole('button', { name: 'Load more' })).toBeNull();
});

test('resets batches on sorting, view, and role changes while preserving biography state', async () => {
  const user = userEvent.setup();
  await renderFilmography(batch, '', 'A long biography. '.repeat(100));
  await user.click(screen.getByRole('button', { name: 'Show More' }));
  await user.click(section().getByRole('button', { name: 'Load more' }));
  await user.selectOptions(
    section().getByRole('combobox', { name: 'Sort filmography' }),
    'oldest'
  );
  expect(titles()).toHaveLength(10);
  await user.click(section().getByRole('button', { name: 'Load more' }));
  await user.click(section().getByRole('button', { name: 'Crew' }));
  expect(titles()).toHaveLength(10);
  await user.click(section().getByRole('button', { name: 'Load more' }));
  await user.selectOptions(
    section().getByRole('combobox', { name: 'Job or department' }),
    'job:Director'
  );
  expect(titles()).toHaveLength(10);
  await user.click(section().getByRole('button', { name: 'Load more' }));
  await user.selectOptions(
    section().getByRole('combobox', { name: 'Job or department' }),
    ''
  );
  expect(titles()).toHaveLength(10);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Show Less' })).toHaveAttribute(
    'aria-expanded',
    'true'
  );
});

test('Back/Forward restores selections and resets the local visible count', async () => {
  const user = userEvent.setup();
  const router = await renderFilmography(batch);
  await user.click(section().getByRole('button', { name: 'Crew' }));
  await user.selectOptions(
    section().getByRole('combobox', { name: 'Job or department' }),
    'job:Writer'
  );
  await user.selectOptions(
    section().getByRole('combobox', { name: 'Sort filmography' }),
    'title'
  );
  await user.click(section().getByRole('button', { name: 'Load more' }));
  await act(async () => {
    await router.navigate(-1);
  });
  expect(
    section().getByRole('combobox', { name: 'Sort filmography' })
  ).toHaveValue('newest');
  expect(titles()).toHaveLength(10);
  await act(async () => {
    await router.navigate(-1);
  });
  expect(
    section().getByRole('combobox', { name: 'Job or department' })
  ).toHaveValue('');
  await act(async () => {
    await router.navigate(1);
  });
  expect(
    section().getByRole('combobox', { name: 'Job or department' })
  ).toHaveValue('job:Writer');
  await act(async () => {
    await router.navigate(1);
  });
  expect(
    section().getByRole('combobox', { name: 'Sort filmography' })
  ).toHaveValue('title');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('person navigation resets local batches and stale roles using the new credits', async () => {
  const user = userEvent.setup();
  const router = await renderFilmography(
    batch,
    '?personView=crew&personRole=job%3AWriter'
  );
  await user.click(section().getByRole('button', { name: 'Load more' }));
  fetchMock.mockResolvedValue(
    response({
      id: 43,
      name: 'Next person',
      filmography: batch.map((entry) => ({
        ...entry,
        crewCredits: [{ job: 'Producer' }],
      })),
    } satisfies PersonDetails)
  );
  await act(async () => {
    await router.navigate('/person/43?personView=crew&personRole=job%3AWriter');
  });
  await screen.findByRole('heading', { name: 'Next person' });
  expect(titles()).toHaveLength(10);
  expect(
    section().getByRole('combobox', { name: 'Job or department' })
  ).toHaveValue('');
  await waitFor(() =>
    expect(router.state.location.search).toBe('?personView=crew')
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('movie navigation uses the existing route without person parameter leakage or genre links', async () => {
  const user = userEvent.setup();
  const router = await renderFilmography(
    both,
    '?personView=crew&personRole=job%3ADirector&personSort=oldest&keep=1'
  );
  const link = section().getByRole('link', { name: 'Movie 01' });
  expect(link).toHaveAttribute('href', '/movie/1');
  expect(section().queryByRole('link', { name: 'Drama' })).toBeNull();
  expect(link.querySelector('img')).toHaveAttribute(
    'srcset',
    '/small.jpg 1x, /large.jpg 2x'
  );
  fetchMock.mockResolvedValue(response({ ...movie(1), cast: [] }));
  await user.click(link);
  await screen.findByRole('heading', { level: 1, name: 'Movie 01' });
  expect(router.state.location.pathname).toBe('/movie/1');
  expect(router.state.location.search).toBe('');
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/movies/1',
    {
      signal: expect.any(AbortSignal),
    }
  );
});

test('renders semantic compact rows with described year and role and lazy decorative posters', async () => {
  await renderFilmography([movie(1)]);
  expect(section().getAllByRole('listitem')).toHaveLength(1);
  const link = section().getByRole('link', { name: 'Movie 01' });
  expect(link).toHaveAccessibleDescription('2020 Hero');
  expect(link.querySelector('time')).toHaveAttribute('datetime', '2020-01-01');
  expect(link.querySelector('img')).toHaveAttribute('alt', '');
  expect(link.querySelector('img')).toHaveAttribute('loading', 'lazy');
  expect(link.querySelector('img')).toHaveAttribute('sizes', '48px');
  expect(link.querySelector('a, button')).toBeNull();
  fireEvent.error(link.querySelector('img')!);
  expect(link.querySelector('.image-placeholder')).toHaveAttribute(
    'aria-hidden',
    'true'
  );
  expect(link).toHaveAccessibleName('Movie 01');
});

test('keyboard users can focus and activate a row through the existing movie route', async () => {
  const user = userEvent.setup();
  const router = await renderFilmography([movie(1)]);
  section().getByRole('combobox', { name: 'Sort filmography' }).focus();
  await user.tab();
  expect(section().getByRole('link', { name: 'Movie 01' })).toHaveFocus();
  fetchMock.mockResolvedValue(response({ ...movie(1), cast: [] }));
  await user.keyboard('{Enter}');
  await screen.findByRole('heading', { level: 1, name: 'Movie 01' });
  expect(router.state.location.pathname).toBe('/movie/1');
});

test('retains a credit without linking to an unsupported destination', async () => {
  await renderFilmography([movie(0)]);
  expect(section().getByText('Movie 00')).toBeVisible();
  expect(section().getAllByRole('listitem')).toHaveLength(1);
  expect(section().queryByRole('link')).toBeNull();
});
